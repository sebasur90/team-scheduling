from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models.incidencia import IncidenciaCobertura, HistorialReemplazo
from app.models.turno import AsignacionAlmuerzo, TurnoAlmuerzo
from app.models.colaborador import Colaborador
from app.enums import EstadoIncidencia, EstadoAsignacion
from app.core.barometro import BarometroService
from app.services import firestore_client

router = APIRouter(prefix="/incidencias", tags=["incidencias"], redirect_slashes=False)


@router.post("/{id}/aceptar")
def aceptar_reemplazo(
    id: int,
    db: Session = Depends(get_db),
    user_id: int = None  # En real, sería del JWT
):
    """Candidato acepta tomar el reemplazo (transacción atómica FCFS)."""
    if not user_id:
        raise HTTPException(status_code=401, detail="No autenticado")

    incidencia = db.query(IncidenciaCobertura).filter(
        IncidenciaCobertura.id == id
    ).first()

    if not incidencia:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")

    # Verificar que está en estado broadcast_activo
    if incidencia.estado != EstadoIncidencia.BROADCAST_ACTIVO.value:
        raise HTTPException(status_code=409, detail="Ya no está disponible este reemplazo")

    # Verificar que no tiene reemplazante ya asignado
    if incidencia.colaborador_reemplazante_id:
        raise HTTPException(status_code=409, detail="Ya cubierto por otro colaborador")

    # Simular transacción atómica Firestore: actualizar incidencia
    incidencia.colaborador_reemplazante_id = user_id
    incidencia.estado = EstadoIncidencia.RESUELTA.value
    incidencia.resolved_at = datetime.now()

    # Obtener datos originales
    asignacion_original = incidencia.asignacion
    turno_original = asignacion_original.turno_almuerzo
    colaborador_original = asignacion_original.colaborador

    # Swap de asignaciones: el nuevo reemplazante toma la franja original
    # (En una versión completa, aquí habría lógica de swap)

    # Registrar en historial_reemplazos
    fecha_obj = datetime.strptime(str(turno_original.fecha), "%Y-%m-%d")
    semana_iso = f"{fecha_obj.isocalendar()[0]}-W{fecha_obj.isocalendar()[1]:02d}"

    historial = HistorialReemplazo(
        colaborador_id=user_id,
        incidencia_id=incidencia.id,
        fecha=str(turno_original.fecha),
        semana_iso=semana_iso
    )
    db.add(incidencia)
    db.add(historial)
    db.commit()

    # Actualizar Firestore
    firestore_client.update_incidencia_firestore(incidencia.id, {
        "estado": EstadoIncidencia.RESUELTA.value,
        "colaborador_reemplazante": {
            "id": user_id,
            "nombre": db.query(Colaborador).filter(Colaborador.id == user_id).first().nombre
        },
        "resolved_at": datetime.now().isoformat()
    })

    # Recalcular barometro → verde
    barometro = BarometroService.calculate_barometro(db, str(turno_original.fecha))
    firestore_client.update_barometro(barometro["estado"], barometro["franjas"], barometro["incidencias_activas"])

    return {
        "status": "aceptado",
        "incidencia_id": incidencia.id,
        "colaborador_reemplazante_id": user_id
    }
