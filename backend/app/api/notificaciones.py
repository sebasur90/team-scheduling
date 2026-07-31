from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date as DateType
from app.database import get_db
from app.models.notificacion import Notificacion
from app.models.turno import AsignacionAlmuerzo, TurnoAlmuerzo
from app.models import Colaborador
from app.enums import EstadoAsignacion
from app.core.cascade_engine import CascadeEngine
from app.core.barometro import BarometroService
from app.services import firestore_client
from app.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)

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


@router.post("/{id}/aceptar-cambio-franja")
def aceptar_cambio_franja(
    id: int,
    current_user: Colaborador = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accept a franja preference change offer.
    Atomically verifies: notification is pending + franja has capacity.
    """
    notif = db.query(Notificacion).filter(Notificacion.id == id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    if notif.colaborador_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para aceptar esta notificación")

    if notif.estado != "pendiente":
        raise HTTPException(status_code=409, detail="Esta notificación ya ha expirado o fue aceptada")

    fecha = notif.fecha
    franja_preferida_id = notif.referencia_id

    # Find current assignment
    asignacion_actual = db.query(AsignacionAlmuerzo).join(TurnoAlmuerzo).filter(
        TurnoAlmuerzo.fecha == fecha,
        AsignacionAlmuerzo.colaborador_id == current_user.id,
    ).first()

    if not asignacion_actual:
        raise HTTPException(status_code=400, detail="No tienes una asignación para ese día")

    # Check if preferred franja turn exists and has capacity
    turno_preferido = db.query(TurnoAlmuerzo).filter(
        TurnoAlmuerzo.fecha == fecha,
        TurnoAlmuerzo.franja_horaria_id == franja_preferida_id,
    ).first()

    if not turno_preferido:
        raise HTTPException(status_code=400, detail="El turno de la franja preferida no existe")

    # Check capacity
    asignados_en_preferida = db.query(AsignacionAlmuerzo).filter(
        AsignacionAlmuerzo.turno_almuerzo_id == turno_preferido.id,
    ).count()

    if asignados_en_preferida >= turno_preferido.capacidad_maxima:
        notif.estado = "expirada"
        db.commit()
        raise HTTPException(status_code=409, detail="La franja ya fue ocupada por otro candidato")

    # Atomic swap: delete from current, add to preferred, update notification
    try:
        # Delete from current franja
        db.delete(asignacion_actual)

        # Create new assignment in preferred franja
        nueva_asignacion = AsignacionAlmuerzo(
            turno_almuerzo_id=turno_preferido.id,
            colaborador_id=current_user.id,
            estado="firme",
        )
        db.add(nueva_asignacion)

        # Mark this notification as accepted
        notif.estado = "aceptada"
        db.add(notif)

        # Mark other notifications for the same event as expired
        otras_notif = db.query(Notificacion).filter(
            Notificacion.tipo == "franja_preferida_disponible",
            Notificacion.fecha == fecha,
            Notificacion.referencia_id == franja_preferida_id,
            Notificacion.id != id,
        ).all()

        for otra in otras_notif:
            otra.estado = "expirada"
            db.add(otra)

        db.commit()

        return {
            "status": "cambio_aceptado",
            "asignacion_anterior": asignacion_actual.id,
            "asignacion_nueva": nueva_asignacion.id,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def get_mis_notificaciones(
    current_user: Colaborador = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtiene todas las notificaciones del usuario actual, pendientes y recientes."""
    from app.models.franja_horaria import FranjaHoraria

    notificaciones = db.query(Notificacion).filter(
        Notificacion.colaborador_id == current_user.id
    ).order_by(Notificacion.created_at.desc()).all()

    result = []
    for notif in notificaciones:
        notif_dict = {
            "id": notif.id,
            "tipo": notif.tipo,
            "mensaje": notif.mensaje,
            "leida": notif.leida,
            "estado": notif.estado,
            "created_at": notif.created_at.isoformat(),
            "fecha": notif.fecha.isoformat() if notif.fecha else None,
            "referencia_id": notif.referencia_id,
            "referencia_tipo": notif.referencia_tipo,
        }

        # Si es notificación de franja preferida, añade detalles de la franja
        if notif.referencia_tipo == "franja_horaria" and notif.referencia_id:
            franja = db.query(FranjaHoraria).filter(
                FranjaHoraria.id == notif.referencia_id
            ).first()
            if franja:
                notif_dict["franja_detalles"] = {
                    "id": franja.id,
                    "hora_inicio": franja.hora_inicio,
                    "hora_fin": franja.hora_fin,
                    "orden": franja.orden,
                }

        result.append(notif_dict)

    return result


@router.patch("/{id}/leer", status_code=status.HTTP_200_OK)
def marcar_notificacion_leida(
    id: int,
    current_user: Colaborador = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marca una notificación como leída."""
    notif = db.query(Notificacion).filter(Notificacion.id == id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    if notif.colaborador_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para marcar esta notificación")

    notif.leida = True
    db.add(notif)
    db.commit()

    # Actualizar en Firestore también
    try:
        firestore_client.write_notificacion_firestore(
            current_user.id,
            notif.id,
            {
                "tipo": notif.tipo,
                "mensaje": notif.mensaje,
                "leida": True,
            },
        )
    except Exception as e:
        logger.warning(f"Error actualizando Firestore para notificación {notif.id}: {e}")

    return {"status": "ok", "notificacion_id": notif.id}
