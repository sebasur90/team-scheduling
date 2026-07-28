from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from app.models.turno import TurnoAlmuerzo, AsignacionAlmuerzo
from app.models.colaborador import Colaborador
from app.models.ausencia import Ausencia
from app.models.incidencia import IncidenciaCobertura
from app.enums import Sector, EstadoAtencion, EstadoIncidencia


class BarometroService:
    """Servicio testeable de cálculo del barometro tri-color."""

    @staticmethod
    def calculate_barometro(db: Session, fecha: str) -> dict:
        """
        Calcula el estado del barometro para una fecha.

        Retorna:
        {
            "estado": "verde" | "amarillo" | "rojo",
            "franjas": [
                {
                    "orden": int,
                    "hora": "12:00-12:45",
                    "estado": "ok" | "riesgo" | "critico",
                    "comercial_libre": int,
                    "operativo_libre": int
                }
            ],
            "incidencias_activas": int
        }
        """
        from app.models.franja_horaria import FranjaHoraria

        # Franjas activas o que empiezan en los próximos 30 min
        now = datetime.now()
        franjas_to_check = db.query(FranjaHoraria).order_by(FranjaHoraria.orden).all()

        franjas_state = []
        worst_state = "verde"  # Peor estado visto

        for franja in franjas_to_check:
            # Turnos para esta franja y fecha
            turnos = db.query(TurnoAlmuerzo).filter(
                TurnoAlmuerzo.fecha == fecha,
                TurnoAlmuerzo.franja_horaria_id == franja.id
            ).all()

            comercial_libre = 0
            operativo_libre = 0

            for turno in turnos:
                # Contar colaboradores asignados a esta franja
                asignados = db.query(AsignacionAlmuerzo).filter(
                    AsignacionAlmuerzo.turno_almuerzo_id == turno.id
                ).count()

                # Colaboradores en línea = presentes - ausentes - orientador - asignados a franja
                colaboradores_activos = db.query(Colaborador).filter(
                    Colaborador.estado_atencion == EstadoAtencion.ACTIVO.value,
                    Colaborador.habilitado_orientador == False  # No orientador
                ).all()

                for colab in colaboradores_activos:
                    # Verificar si está ausente
                    ausencia = db.query(Ausencia).filter(
                        Ausencia.colaborador_id == colab.id,
                        Ausencia.fecha == fecha
                    ).first()
                    if ausencia:
                        continue

                    # Verificar si no está asignado a esta franja
                    asignado_en_franja = db.query(AsignacionAlmuerzo).join(TurnoAlmuerzo).filter(
                        AsignacionAlmuerzo.colaborador_id == colab.id,
                        TurnoAlmuerzo.franja_horaria_id == franja.id,
                        TurnoAlmuerzo.fecha == fecha
                    ).first()
                    if asignado_en_franja:
                        continue

                    # En línea
                    if colab.sector == Sector.COMERCIAL.value:
                        comercial_libre += 1
                    elif colab.sector == Sector.OPERATIVO.value:
                        operativo_libre += 1

            comercial_ok = comercial_libre >= 1
            operativo_ok = operativo_libre >= 1

            # Verificar incidencias activas para esta franja
            tiene_incidencia = db.query(IncidenciaCobertura).filter(
                IncidenciaCobertura.estado.in_([
                    EstadoIncidencia.VENTANA_ADMIN.value,
                    EstadoIncidencia.BROADCAST_ACTIVO.value
                ])
            ).first()

            if not comercial_ok or not operativo_ok:
                franja_state = "critico"
            elif tiene_incidencia:
                franja_state = "riesgo"
            else:
                franja_state = "ok"

            # Actualizar peor estado
            if franja_state == "critico":
                worst_state = "rojo"
            elif franja_state == "riesgo" and worst_state != "rojo":
                worst_state = "amarillo"

            franjas_state.append({
                "orden": franja.orden,
                "hora": f"{franja.hora_inicio.strftime('%H:%M')}-{franja.hora_fin.strftime('%H:%M')}",
                "estado": franja_state,
                "comercial_libre": comercial_libre,
                "operativo_libre": operativo_libre,
            })

        # Contar incidencias activas
        incidencias_activas = db.query(IncidenciaCobertura).filter(
            IncidenciaCobertura.estado.in_([
                EstadoIncidencia.VENTANA_ADMIN.value,
                EstadoIncidencia.BROADCAST_ACTIVO.value
            ])
        ).count()

        # Color global
        color_map = {"verde": 0, "amarillo": 1, "rojo": 2}
        worst_state = "verde"
        for franja in franjas_state:
            if color_map[franja["estado"]] > color_map[worst_state]:
                worst_state = franja["estado"]

        return {
            "estado": worst_state,
            "franjas": franjas_state,
            "incidencias_activas": incidencias_activas,
        }
