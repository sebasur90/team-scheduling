from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.swap import SwapSolicitud
from app.models.turno import AsignacionAlmuerzo
from app.models.colaborador import Colaborador
from app.models.notificacion import Notificacion
from app.schemas.swap import SwapCreate, SwapResponse, SwapRechazarRequest
from app.dependencies import get_current_user, require_non_viewer
from app.core.swap_validator import validate_swap_coverage
from app.services import firestore_client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/swaps", tags=["swaps"], redirect_slashes=False)


def _format_hora(turno: AsignacionAlmuerzo) -> str:
    franja = turno.turno_almuerzo.franja_horaria
    return f"{franja.hora_inicio.strftime('%H:%M')} – {franja.hora_fin.strftime('%H:%M')}"


def _enrich_swap(swap: SwapSolicitud) -> dict:
    """Construye el dict de SwapResponse con campos denormalizados."""
    fecha = None
    franja_origen_hora = None
    franja_receptor_hora = None

    if swap.asignacion_origen and swap.asignacion_origen.turno_almuerzo:
        fecha = swap.asignacion_origen.turno_almuerzo.fecha
        franja_origen_hora = _format_hora(swap.asignacion_origen)

    if swap.asignacion_receptor and swap.asignacion_receptor.turno_almuerzo:
        franja_receptor_hora = _format_hora(swap.asignacion_receptor)

    nombre_solicitante = swap.colaborador_solicitante.nombre if swap.colaborador_solicitante else None
    nombre_receptor = swap.colaborador_receptor.nombre if swap.colaborador_receptor else None

    return SwapResponse(
        id=swap.id,
        asignacion_origen_id=swap.asignacion_origen_id,
        asignacion_receptor_id=swap.asignacion_receptor_id,
        colaborador_solicitante_id=swap.colaborador_solicitante_id,
        colaborador_receptor_id=swap.colaborador_receptor_id,
        estado=swap.estado,
        motivo_rechazo=swap.motivo_rechazo,
        created_at=swap.created_at,
        fecha=fecha,
        franja_origen_hora=franja_origen_hora,
        franja_receptor_hora=franja_receptor_hora,
        nombre_solicitante=nombre_solicitante,
        nombre_receptor=nombre_receptor,
    )


def _crear_notificacion(db: Session, colaborador_id: int, tipo: str, mensaje: str, swap_id: int):
    notif = Notificacion(
        colaborador_id=colaborador_id,
        tipo=tipo,
        mensaje=mensaje,
        leida=False,
        referencia_id=swap_id,
        referencia_tipo="swap",
        canal="in_app",
    )
    db.add(notif)
    db.flush()  # obtener notif.id sin commit

    try:
        firestore_client.write_notificacion_firestore(
            colaborador_id,
            notif.id,
            {"tipo": tipo, "mensaje": mensaje, "swap_id": swap_id, "leida": False},
        )
    except Exception as e:
        logger.error(f"Error escribiendo notificación Firestore: {e}")


@router.post("", response_model=SwapResponse, status_code=status.HTTP_201_CREATED)
def crear_swap(
    body: SwapCreate,
    current_user: Colaborador = Depends(require_non_viewer),
    db: Session = Depends(get_db),
):
    """Solicitar un intercambio de franja de almuerzo con otro usuario."""
    asig_origen = db.query(AsignacionAlmuerzo).filter(
        AsignacionAlmuerzo.id == body.asignacion_origen_id
    ).first()
    if not asig_origen:
        raise HTTPException(status_code=404, detail="Asignación origen no encontrada")

    if asig_origen.colaborador_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes intercambiar la asignación de otro usuario")

    asig_receptor = db.query(AsignacionAlmuerzo).filter(
        AsignacionAlmuerzo.id == body.asignacion_receptor_id
    ).first()
    if not asig_receptor:
        raise HTTPException(status_code=404, detail="Asignación receptor no encontrada")

    if asig_receptor.colaborador_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes intercambiar contigo mismo")

    if asig_origen.turno_almuerzo.fecha != asig_receptor.turno_almuerzo.fecha:
        raise HTTPException(status_code=400, detail="Solo se puede intercambiar entre franjas del mismo día")

    if asig_origen.tarea_especial_asignacion_id or asig_receptor.tarea_especial_asignacion_id:
        raise HTTPException(
            status_code=409,
            detail="No se puede intercambiar una asignación fijada por una tarea especial",
        )

    # Verificar que ninguna tenga swap pendiente
    for asig in [asig_origen, asig_receptor]:
        swap_pendiente = db.query(SwapSolicitud).filter(
            or_(
                SwapSolicitud.asignacion_origen_id == asig.id,
                SwapSolicitud.asignacion_receptor_id == asig.id,
            ),
            SwapSolicitud.estado == "pendiente",
        ).first()
        if swap_pendiente:
            raise HTTPException(
                status_code=409,
                detail="Una de las asignaciones ya tiene un intercambio pendiente",
            )

    # Validar cobertura
    ok, motivo = validate_swap_coverage(db, asig_origen, asig_receptor)
    if not ok:
        raise HTTPException(status_code=409, detail=motivo)

    # Crear swap
    swap = SwapSolicitud(
        asignacion_origen_id=asig_origen.id,
        asignacion_receptor_id=asig_receptor.id,
        colaborador_solicitante_id=current_user.id,
        colaborador_receptor_id=asig_receptor.colaborador_id,
        estado="pendiente",
    )
    db.add(swap)
    asig_origen.estado = "pendiente_swap"
    asig_receptor.estado = "pendiente_swap"
    db.flush()

    # Notificar al receptor y admins
    franja_origen = _format_hora(asig_origen)
    franja_receptor = _format_hora(asig_receptor)
    fecha_str = asig_origen.turno_almuerzo.fecha.strftime("%d/%m/%Y")
    mensaje_receptor = (
        f"{current_user.nombre} quiere intercambiar su turno {franja_origen} "
        f"por tu turno {franja_receptor} del {fecha_str}"
    )
    _crear_notificacion(db, asig_receptor.colaborador_id, "swap_solicitado", mensaje_receptor, swap.id)

    admins = db.query(Colaborador).filter(Colaborador.rol == "admin").all()
    for admin in admins:
        _crear_notificacion(
            db, admin.id, "swap_solicitado",
            f"{current_user.nombre} solicitó intercambio con {asig_receptor.colaborador.nombre} el {fecha_str}",
            swap.id,
        )

    db.commit()
    db.refresh(swap)
    return _enrich_swap(swap)


@router.get("", response_model=list[SwapResponse])
def listar_swaps(
    current_user: Colaborador = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista los swaps del usuario (enviados y recibidos)."""
    swaps = db.query(SwapSolicitud).filter(
        or_(
            SwapSolicitud.colaborador_solicitante_id == current_user.id,
            SwapSolicitud.colaborador_receptor_id == current_user.id,
        )
    ).order_by(SwapSolicitud.created_at.desc()).all()

    return [_enrich_swap(s) for s in swaps]


@router.post("/{swap_id}/aceptar", response_model=SwapResponse)
def aceptar_swap(
    swap_id: int,
    current_user: Colaborador = Depends(require_non_viewer),
    db: Session = Depends(get_db),
):
    """Aceptar un intercambio pendiente. Solo el receptor puede aceptar."""
    swap = db.query(SwapSolicitud).filter(SwapSolicitud.id == swap_id).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap no encontrado")

    if swap.colaborador_receptor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo el receptor puede aceptar este intercambio")

    if swap.estado != "pendiente":
        raise HTTPException(status_code=409, detail="El intercambio ya no está pendiente")

    asig_origen = db.query(AsignacionAlmuerzo).filter(
        AsignacionAlmuerzo.id == swap.asignacion_origen_id
    ).first()
    asig_receptor = db.query(AsignacionAlmuerzo).filter(
        AsignacionAlmuerzo.id == swap.asignacion_receptor_id
    ).first()

    if not asig_origen or not asig_receptor:
        # El admin eliminó una asignación; cancelar swap automáticamente
        swap.estado = "cancelado"
        if asig_origen:
            asig_origen.estado = "firme"
        if asig_receptor:
            asig_receptor.estado = "firme"
        db.commit()
        raise HTTPException(
            status_code=409,
            detail="Una de las asignaciones fue eliminada. El intercambio fue cancelado automáticamente.",
        )

    # Intercambio atómico
    asig_origen.colaborador_id = swap.colaborador_receptor_id
    asig_receptor.colaborador_id = swap.colaborador_solicitante_id
    asig_origen.estado = "firme"
    asig_receptor.estado = "firme"
    swap.estado = "aceptado"

    franja_receptor = _format_hora(asig_receptor)
    fecha_str = asig_origen.turno_almuerzo.fecha.strftime("%d/%m/%Y")

    # Notificar al solicitante y admins
    _crear_notificacion(
        db, swap.colaborador_solicitante_id, "swap_aceptado",
        f"{current_user.nombre} aceptó el intercambio del {fecha_str}. Tu nuevo turno: {franja_receptor}",
        swap.id,
    )
    admins = db.query(Colaborador).filter(Colaborador.rol == "admin").all()
    for admin in admins:
        _crear_notificacion(
            db, admin.id, "swap_aceptado",
            f"{current_user.nombre} aceptó el intercambio con {swap.colaborador_solicitante.nombre} el {fecha_str}",
            swap.id,
        )

    db.commit()
    db.refresh(swap)
    return _enrich_swap(swap)


@router.post("/{swap_id}/rechazar", response_model=SwapResponse)
def rechazar_swap(
    swap_id: int,
    body: SwapRechazarRequest = None,
    current_user: Colaborador = Depends(require_non_viewer),
    db: Session = Depends(get_db),
):
    """Rechazar un intercambio pendiente. Solo el receptor puede rechazar."""
    swap = db.query(SwapSolicitud).filter(SwapSolicitud.id == swap_id).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap no encontrado")

    if swap.colaborador_receptor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo el receptor puede rechazar este intercambio")

    if swap.estado != "pendiente":
        raise HTTPException(status_code=409, detail="El intercambio ya no está pendiente")

    swap.estado = "rechazado"
    if body and body.motivo:
        swap.motivo_rechazo = body.motivo

    asig_origen = db.query(AsignacionAlmuerzo).filter(
        AsignacionAlmuerzo.id == swap.asignacion_origen_id
    ).first()
    asig_receptor = db.query(AsignacionAlmuerzo).filter(
        AsignacionAlmuerzo.id == swap.asignacion_receptor_id
    ).first()
    if asig_origen:
        asig_origen.estado = "firme"
    if asig_receptor:
        asig_receptor.estado = "firme"

    fecha_str = asig_origen.turno_almuerzo.fecha.strftime("%d/%m/%Y") if asig_origen else "?"
    _crear_notificacion(
        db, swap.colaborador_solicitante_id, "swap_rechazado",
        f"{current_user.nombre} rechazó el intercambio del {fecha_str}",
        swap.id,
    )

    db.commit()
    db.refresh(swap)
    return _enrich_swap(swap)


@router.post("/{swap_id}/cancelar", response_model=SwapResponse)
def cancelar_swap(
    swap_id: int,
    current_user: Colaborador = Depends(require_non_viewer),
    db: Session = Depends(get_db),
):
    """Cancelar un intercambio pendiente. Solo el solicitante puede cancelar."""
    swap = db.query(SwapSolicitud).filter(SwapSolicitud.id == swap_id).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap no encontrado")

    if swap.colaborador_solicitante_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo el solicitante puede cancelar este intercambio")

    if swap.estado != "pendiente":
        raise HTTPException(status_code=409, detail="El intercambio ya no está pendiente")

    swap.estado = "cancelado"

    asig_origen = db.query(AsignacionAlmuerzo).filter(
        AsignacionAlmuerzo.id == swap.asignacion_origen_id
    ).first()
    asig_receptor = db.query(AsignacionAlmuerzo).filter(
        AsignacionAlmuerzo.id == swap.asignacion_receptor_id
    ).first()
    if asig_origen:
        asig_origen.estado = "firme"
    if asig_receptor:
        asig_receptor.estado = "firme"

    fecha_str = asig_origen.turno_almuerzo.fecha.strftime("%d/%m/%Y") if asig_origen else "?"
    _crear_notificacion(
        db, swap.colaborador_receptor_id, "swap_cancelado",
        f"{current_user.nombre} canceló la solicitud de intercambio del {fecha_str}",
        swap.id,
    )

    db.commit()
    db.refresh(swap)
    return _enrich_swap(swap)
