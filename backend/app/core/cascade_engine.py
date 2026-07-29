from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
import logging
from app.models.turno import AsignacionAlmuerzo, TurnoAlmuerzo
from app.models.incidencia import IncidenciaCobertura, HistorialReemplazo
from app.models.colaborador import Colaborador
from app.models.ausencia import Ausencia
from app.enums import EstadoIncidencia, MotivoIncidencia, Sector, EstadoAtencion
from app.core.barometro import BarometroService
from app.services import firestore_client

logger = logging.getLogger(__name__)


class CascadeEngine:
    """Motor de cascada de cobertura para rechazos/timeouts de turnos."""

    @staticmethod
    def iniciar(db: Session, asignacion_id: int, motivo: str, task_scheduler=None):
        """
        Inicia cascada de cobertura ante rechazo o timeout.

        Args:
            db: Sesión de BD
            asignacion_id: ID de AsignacionAlmuerzo que fue rechazada
            motivo: 'rechazo' o 'timeout'
            task_scheduler: TaskScheduler para agendar admin_window_end
        """
        # Obtener la asignación
        asignacion = db.query(AsignacionAlmuerzo).filter(
            AsignacionAlmuerzo.id == asignacion_id
        ).first()

        if not asignacion:
            logger.error(f"Asignación {asignacion_id} no encontrada")
            return

        turno = asignacion.turno_almuerzo
        colaborador = asignacion.colaborador
        fecha = turno.fecha
        franja = turno.franja_horaria

        logger.info(f"Iniciando cascada: {colaborador.nombre} rechazó turno {fecha} {franja.hora_inicio}-{franja.hora_fin}")

        # 1. Calcula próxima franja viable para el postergado (antes de 14:45)
        from app.models.franja_horaria import FranjaHoraria

        franjas = db.query(FranjaHoraria).order_by(FranjaHoraria.orden).all()
        proxima_franja_viable = None

        for f in franjas:
            # Si termina antes de 14:45
            if f.hora_fin.hour < 14 or (f.hora_fin.hour == 14 and f.hora_fin.minute < 45):
                # Verificar que no hay asignación conflictiva
                existe_asignacion = db.query(AsignacionAlmuerzo).join(TurnoAlmuerzo).filter(
                    TurnoAlmuerzo.fecha == fecha,
                    TurnoAlmuerzo.franja_horaria_id == f.id,
                    AsignacionAlmuerzo.colaborador_id == colaborador.id
                ).first()
                if not existe_asignacion:
                    proxima_franja_viable = f
                    break

        if not proxima_franja_viable:
            logger.warning(f"Sin franja viable para {colaborador.nombre}. Emitiendo alerta crítica al admin.")
            # Emitir alerta crítica: el postergado queda sin almuerzo ese día
            CascadeEngine._emit_critical_alert(db, asignacion)
            # La cascada continúa buscando reemplazante para la franja original

        # 2. Identifica candidatos elegibles (que pueden adelantar sin romper cobertura)
        candidatos = CascadeEngine._find_candidates(db, turno, colaborador)
        logger.info(f"Encontrados {len(candidatos)} candidatos para reemplazo")

        # 3. Ordena por: preferencia coincidente, luego equidad (reemplazos_semana ASC)
        candidatos_ordenados = CascadeEngine._sort_by_equity(db, candidatos, fecha, franja.id)

        # 4. Crea IncidenciaCobertura
        incidencia = IncidenciaCobertura(
            asignacion_id=asignacion_id,
            motivo=motivo,
            estado=EstadoIncidencia.VENTANA_ADMIN.value,
            colaborador_reemplazante_id=None
        )
        db.add(incidencia)
        db.flush()  # Obtener ID
        db.commit()

        logger.info(f"Incidencia {incidencia.id} creada")

        # 5. Escribe en Firestore
        incidencia_data = {
            "estado": EstadoIncidencia.VENTANA_ADMIN.value,
            "franja": f"{franja.hora_inicio.strftime('%H:%M')}-{franja.hora_fin.strftime('%H:%M')}",
            "fecha": str(fecha),
            "colaborador_afectado": {
                "id": colaborador.id,
                "nombre": colaborador.nombre
            },
            "colaborador_reemplazante": None,
            "candidatos": [
                {
                    "id": c.id,
                    "nombre": c.nombre,
                    "reemplazos_semana": CascadeEngine._count_replacements_this_week(db, c.id, fecha)
                }
                for c in candidatos_ordenados
            ],
            "motivo": motivo,
            "admin_window_ends_at": datetime.now().isoformat(),
        }
        firestore_client.write_incidencia_firestore(incidencia.id, incidencia_data)

        # 6. Recalcula barometro → amarillo
        barometro = BarometroService.calculate_barometro(db, str(fecha))
        firestore_client.update_barometro(barometro["estado"], barometro["franjas"], barometro["incidencias_activas"])

        # 7. Agenda admin_window_end en 1 min (si scheduler disponible)
        if task_scheduler:
            from datetime import timedelta
            run_at = datetime.now() + timedelta(seconds=60)  # 1 min en local
            task_scheduler.schedule_admin_window_end(incidencia.id, run_at)

    @staticmethod
    def _find_candidates(db: Session, turno: TurnoAlmuerzo, colaborador_rechazante: Colaborador) -> List[Colaborador]:
        """Identifica candidatos elegibles para reemplazo."""
        # Candidatos: colaboradores que pueden adelantar su turno sin romper cobertura
        # en su sector de su franja actual
        candidatos = []
        fecha = turno.fecha
        franja = turno.franja_horaria

        # Buscar colaboradores que tengan turno en esta misma fecha
        # pero en una franja posterior
        asignaciones_en_fecha = db.query(AsignacionAlmuerzo).join(TurnoAlmuerzo).filter(
            TurnoAlmuerzo.fecha == fecha,
            AsignacionAlmuerzo.colaborador_id != colaborador_rechazante.id
        ).all()

        for asi in asignaciones_en_fecha:
            colab = asi.colaborador
            turno_colab = asi.turno_almuerzo

            # Si su franja es posterior a la de la incidencia
            if turno_colab.franja_horaria.orden > franja.orden:
                # Verificar que no rompe cobertura en su franja actual
                # (simplificado: asumir que puede dejar si hay otros en su franja)
                other_in_franja = db.query(AsignacionAlmuerzo).join(TurnoAlmuerzo).filter(
                    TurnoAlmuerzo.fecha == fecha,
                    TurnoAlmuerzo.franja_horaria_id == turno_colab.franja_horaria_id,
                    AsignacionAlmuerzo.colaborador_id != colab.id
                ).count()
                if other_in_franja > 0:
                    candidatos.append(colab)

        return candidatos

    @staticmethod
    def _sort_by_equity(db: Session, candidatos: List[Colaborador], fecha, franja_id: int) -> List[Colaborador]:
        """
        Ordena candidatos por:
        1. Primero: aquellos cuya franja_preferida_id == franja_id (la franja vacante)
        2. Luego: equidad (menor count de reemplazos esta semana primero)
        """
        from datetime import datetime

        def score(colab):
            # Group 0: preference matches vacant franja, Group 1: no preference or different
            preference_matches = 0 if colab.franja_preferida_id == franja_id else 1
            count = CascadeEngine._count_replacements_this_week(db, colab.id, fecha)
            return (preference_matches, count)

        return sorted(candidatos, key=score)

    @staticmethod
    def _count_replacements_this_week(db: Session, colaborador_id: int, fecha) -> int:
        """Cuenta reemplazos del colaborador en la semana ISO actual."""
        from datetime import datetime

        # Calcular semana ISO de la fecha
        date_obj = datetime.strptime(str(fecha), "%Y-%m-%d")
        semana_iso = date_obj.isocalendar()[1]

        count = db.query(HistorialReemplazo).filter(
            HistorialReemplazo.colaborador_id == colaborador_id,
            HistorialReemplazo.semana_iso == f"{date_obj.isocalendar()[0]}-W{semana_iso:02d}"
        ).count()

        return count

    @staticmethod
    def _emit_critical_alert(db: Session, asignacion: AsignacionAlmuerzo):
        """Emite alerta crítica al admin cuando postergado no tiene franja viable."""
        from app.models.notificacion import Notificacion

        # Crear notificación crítica para admins
        admins = db.query(Colaborador).filter(Colaborador.rol == "admin").all()

        for admin in admins:
            notif = Notificacion(
                colaborador_id=admin.id,
                tipo="critica_sin_franja",
                mensaje=f"ALERTA: {asignacion.colaborador.nombre} rechazó turno {asignacion.turno_almuerzo.fecha} "
                        f"y no tiene franja viable antes de 14:45. Debe resolverse manualmente.",
                leida=False,
                canal="push"
            )
            db.add(notif)

        db.commit()
        logger.warning(f"Alerta crítica enviada a {len(admins)} admins")
