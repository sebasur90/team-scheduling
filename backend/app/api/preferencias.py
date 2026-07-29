from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import PreferenciaDiaria, Colaborador, TurnoAlmuerzo
from app.schemas.preferencia import PreferenciaCreate, PreferenciaResponse
from app.dependencies import get_current_user
from typing import Optional

router = APIRouter(prefix="/preferencias", tags=["preferencias"], redirect_slashes=False)


@router.post("", response_model=PreferenciaResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PreferenciaResponse, status_code=status.HTTP_201_CREATED)
def create_preferencia(
    data: PreferenciaCreate,
    db: Session = Depends(get_db),
    current_user: Colaborador = Depends(get_current_user),
):
    """Create or replace a preference for a specific date. Only allowed if admin hasn't generated turns for that day."""
    # Check if turnos already generated for this date
    turnos_existentes = db.query(TurnoAlmuerzo).filter_by(fecha=data.fecha).first()
    if turnos_existentes:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pueden actualizar preferencias después de que el administrador ha generado los turnos para este día"
        )

    existing = db.query(PreferenciaDiaria).filter_by(
        colaborador_id=current_user.id,
        fecha=data.fecha
    ).first()

    if existing:
        existing.franja_horaria_id_deseada = data.franja_horaria_id_deseada
        existing.estado_concesion = "pendiente"
    else:
        existing = PreferenciaDiaria(
            colaborador_id=current_user.id,
            fecha=data.fecha,
            franja_horaria_id_deseada=data.franja_horaria_id_deseada,
            estado_concesion="pendiente"
        )
        db.add(existing)

    db.commit()
    db.refresh(existing)
    return PreferenciaResponse.model_validate(existing)


@router.get("", response_model=Optional[PreferenciaResponse])
@router.get("/", response_model=Optional[PreferenciaResponse])
def get_preferencia(
    fecha: str,
    colaborador_id: int,
    db: Session = Depends(get_db),
):
    """Get preference for a collaborator on a specific date"""
    from datetime import date
    fecha_obj = date.fromisoformat(fecha)

    preferencia = db.query(PreferenciaDiaria).filter_by(
        colaborador_id=colaborador_id,
        fecha=fecha_obj
    ).first()

    if not preferencia:
        return None

    return PreferenciaResponse.model_validate(preferencia)
