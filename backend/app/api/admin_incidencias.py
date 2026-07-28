from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models.incidencia import IncidenciaCobertura
from app.models.turno import AsignacionAlmuerzo
from app.enums import EstadoIncidencia
from app.core.barometro import BarometroService
from app.services import firestore_client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/incidencias", tags=["admin"], redirect_slashes=False)


@router.get("")
def list_incidencias(
    fecha: str = Query(None),
    estado: str = Query(None),
    db: Session = Depends(get_db)
):
    """Lista incidencias activas con filtros opcionales."""
    query = db.query(IncidenciaCobertura)

    # Filtro por estado (por defecto, solo activas)
    if estado:
        query = query.filter(IncidenciaCobertura.estado == estado)
    else:
        query = query.filter(IncidenciaCobertura.estado.in_([
            EstadoIncidencia.VENTANA_ADMIN.value,
            EstadoIncidencia.BROADCAST_ACTIVO.value
        ]))

    # Filtro por fecha (opcional)
    if fecha:
        query = query.join(AsignacionAlmuerzo).join(AsignacionAlmuerzo.turno_almuerzo).filter(
            AsignacionAlmuerzo.turno_almuerzo.fecha == fecha
        )

    incidencias = query.all()

    result = []
    for inc in incidencias:
        turno = inc.asignacion.turno_almuerzo
        franja = turno.franja_horaria
        result.append({
            "id": inc.id,
            "fecha": str(turno.fecha),
            "franja": f"{franja.hora_inicio.strftime('%H:%M')}-{franja.hora_fin.strftime('%H:%M')}",
            "colaborador_afectado": {
                "id": inc.asignacion.colaborador.id,
                "nombre": inc.asignacion.colaborador.nombre
            },
            "estado": inc.estado,
            "motivo": inc.motivo,
            "created_at": inc.created_at.isoformat() if inc.created_at else None
        })

    return result


@router.post("/{id}/broadcast")
def broadcast_incidencia(
    id: int,
    db: Session = Depends(get_db)
):
    """Admin dispara broadcast manualmente."""
    incidencia = db.query(IncidenciaCobertura).filter(
        IncidenciaCobertura.id == id
    ).first()

    if not incidencia:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")

    if incidencia.estado == EstadoIncidencia.RESUELTA.value:
        raise HTTPException(status_code=400, detail="Ya resuelta")

    # Cambiar a broadcast_activo
    incidencia.estado = EstadoIncidencia.BROADCAST_ACTIVO.value
    db.add(incidencia)
    db.commit()

    # Actualizar en Firestore
    firestore_client.update_incidencia_firestore(incidencia.id, {
        "estado": EstadoIncidencia.BROADCAST_ACTIVO.value
    })

    logger.info(f"Broadcast dispuesto manualmente por admin para incidencia {id}")

    return {"status": "broadcast_activo", "incidencia_id": id}


@router.post("/{id}/presencial")
def resolver_presencial(
    id: int,
    db: Session = Depends(get_db)
):
    """Admin resuelve sin app (presencial)."""
    incidencia = db.query(IncidenciaCobertura).filter(
        IncidenciaCobertura.id == id
    ).first()

    if not incidencia:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")

    # Marcar como resuelta sin candidatos
    incidencia.estado = EstadoIncidencia.RESUELTA.value
    incidencia.resolved_at = datetime.now()
    db.add(incidencia)
    db.commit()

    # Actualizar en Firestore
    firestore_client.update_incidencia_firestore(incidencia.id, {
        "estado": EstadoIncidencia.RESUELTA.value,
        "resolved_at": datetime.now().isoformat()
    })

    # Recalcular barometro
    turno = incidencia.asignacion.turno_almuerzo
    barometro = BarometroService.calculate_barometro(db, str(turno.fecha))
    firestore_client.update_barometro(barometro["estado"], barometro["franjas"], barometro["incidencias_activas"])

    logger.info(f"Incidencia {id} resuelta presencialmente por admin")

    return {"status": "resuelto_presencial", "incidencia_id": id}
