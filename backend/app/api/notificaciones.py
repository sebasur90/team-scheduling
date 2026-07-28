from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.notificacion import Notificacion
from app.models.turno import AsignacionAlmuerzo
from app.enums import EstadoAsignacion
from app.core.cascade_engine import CascadeEngine
from app.core.barometro import BarometroService
from app.services import firestore_client

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"], redirect_slashes=False)


class ResponderNotificacionRequest(BaseModel):
    respuesta: str  # "si" o "no"


@router.post("/{id}/responder")
def responder_notificacion(
    id: int,
    request: ResponderNotificacionRequest,
    db: Session = Depends(get_db)
):
    """Responde a una notificación de confirmación de turno."""
    notif = db.query(Notificacion).filter(Notificacion.id == id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    # Marcar notificación como leída
    notif.leida = True

    if request.respuesta == "si":
        # Confirmación: marcar asignación como confirmada
        asignacion = db.query(AsignacionAlmuerzo).filter(
            AsignacionAlmuerzo.colaborador_id == notif.colaborador_id
        ).first()
        if asignacion:
            asignacion.estado = EstadoAsignacion.CONFIRMADA.value
            db.add(asignacion)

        db.add(notif)
        db.commit()

        # Recalcular barometro
        barometro = BarometroService.calculate_barometro(db, str(asignacion.turno_almuerzo.fecha))
        firestore_client.update_barometro(barometro["estado"], barometro["franjas"], barometro["incidencias_activas"])

        return {"status": "confirmado", "asignacion_id": asignacion.id}

    elif request.respuesta == "no":
        # Rechazo: iniciar cascada
        db.add(notif)
        db.commit()

        # Obtener asignación asociada
        asignacion = db.query(AsignacionAlmuerzo).filter(
            AsignacionAlmuerzo.colaborador_id == notif.colaborador_id
        ).first()

        if asignacion:
            CascadeEngine.iniciar(db, asignacion.id, "rechazo")
            return {"status": "cascada_iniciada", "asignacion_id": asignacion.id}
        else:
            raise HTTPException(status_code=400, detail="Asignación no encontrada")

    else:
        raise HTTPException(status_code=400, detail="Respuesta inválida")
