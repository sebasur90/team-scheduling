from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.config import APP_ENV
from app.models.turno import TurnoAlmuerzo, AsignacionAlmuerzo
from app.models.notificacion import Notificacion
from app.models.incidencia import IncidenciaCobertura
from app.enums import EstadoAsignacion, EstadoIncidencia
from app.core.cascade_engine import CascadeEngine
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dev", tags=["dev"], redirect_slashes=False)


class SimularEventoRequest(BaseModel):
    tipo: str  # "t_minus_5", "timeout", "rechazo", "admin_window_end"
    id: int    # turno_id o notif_id o incidencia_id


@router.post("/simular-evento")
def simular_evento(
    request: SimularEventoRequest,
    db: Session = Depends(get_db)
):
    """Simula eventos de prueba. Solo disponible en APP_ENV=local."""
    if APP_ENV != "local":
        raise HTTPException(status_code=403, detail="Solo disponible en modo local")

    tipo = request.tipo
    id_val = request.id

    if tipo == "t_minus_5":
        # Simular notificación T-5min
        turno = db.query(TurnoAlmuerzo).filter(TurnoAlmuerzo.id == id_val).first()
        if not turno:
            raise HTTPException(status_code=404, detail="Turno no encontrado")

        # Crear notificación para cada asignación del turno
        asignaciones = db.query(AsignacionAlmuerzo).filter(
            AsignacionAlmuerzo.turno_almuerzo_id == turno.id
        ).all()

        for asignacion in asignaciones:
            notif = Notificacion(
                colaborador_id=asignacion.colaborador_id,
                tipo="confirmar_turno",
                mensaje=f"Tu almuerzo es en 5 min ({turno.franja_horaria.hora_inicio.strftime('%H:%M')}–{turno.franja_horaria.hora_fin.strftime('%H:%M')}). ¿Salís?",
                leida=False,
                canal="push"
            )
            asignacion.estado = EstadoAsignacion.NOTIFICADA.value
            db.add(notif)
            db.add(asignacion)

        db.commit()
        logger.info(f"[DEV] Notificación T-5min simulada para turno {id_val}")
        return {"status": "notificacion_t5_simulada", "turno_id": id_val}

    elif tipo == "timeout":
        # Simular timeout de notificación
        notif = db.query(Notificacion).filter(Notificacion.id == id_val).first()
        if not notif:
            raise HTTPException(status_code=404, detail="Notificación no encontrada")

        # Obtener asignación del colaborador
        asignacion = db.query(AsignacionAlmuerzo).filter(
            AsignacionAlmuerzo.colaborador_id == notif.colaborador_id,
            AsignacionAlmuerzo.estado == EstadoAsignacion.NOTIFICADA.value
        ).first()

        if asignacion:
            notif.leida = True
            db.add(notif)
            db.commit()

            # Iniciar cascada por timeout
            CascadeEngine.iniciar(db, asignacion.id, "timeout")

        logger.info(f"[DEV] Timeout simulado para notificación {id_val}")
        return {"status": "timeout_simulado", "notif_id": id_val}

    elif tipo == "rechazo":
        # Simular rechazo manual (endpoint de desarrollo)
        notif = db.query(Notificacion).filter(Notificacion.id == id_val).first()
        if not notif:
            raise HTTPException(status_code=404, detail="Notificación no encontrada")

        asignacion = db.query(AsignacionAlmuerzo).filter(
            AsignacionAlmuerzo.colaborador_id == notif.colaborador_id,
            AsignacionAlmuerzo.estado == EstadoAsignacion.NOTIFICADA.value
        ).first()

        if asignacion:
            notif.leida = True
            db.add(notif)
            db.commit()
            CascadeEngine.iniciar(db, asignacion.id, "rechazo")

        logger.info(f"[DEV] Rechazo simulado para notificación {id_val}")
        return {"status": "rechazo_simulado", "notif_id": id_val}

    elif tipo == "admin_window_end":
        # Simular fin de ventana admin (auto-broadcast)
        incidencia = db.query(IncidenciaCobertura).filter(
            IncidenciaCobertura.id == id_val
        ).first()

        if not incidencia:
            raise HTTPException(status_code=404, detail="Incidencia no encontrada")

        if incidencia.estado == EstadoIncidencia.VENTANA_ADMIN.value:
            # Cambiar a broadcast_activo automáticamente
            incidencia.estado = EstadoIncidencia.BROADCAST_ACTIVO.value
            db.add(incidencia)
            db.commit()

            # Actualizar Firestore
            from app.services import firestore_client
            firestore_client.update_incidencia_firestore(incidencia.id, {
                "estado": EstadoIncidencia.BROADCAST_ACTIVO.value
            })

        logger.info(f"[DEV] Ventana admin cerrada para incidencia {id_val} → auto-broadcast")
        return {"status": "admin_window_end_simulado", "incidencia_id": id_val}

    else:
        raise HTTPException(status_code=400, detail="Tipo de evento no válido")
