from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import FranjaHoraria, Colaborador
from app.schemas.franja import FranjaHorariaResponse, FranjaCreate, FranjaUpdate
from app.dependencies import get_admin_user
from typing import List

router = APIRouter(prefix="/franjas", tags=["franjas"], redirect_slashes=False)


@router.get("", response_model=List[FranjaHorariaResponse])
@router.get("/", response_model=List[FranjaHorariaResponse])
def list_franjas(db: Session = Depends(get_db)):
    """Get all time slots"""
    franjas = db.query(FranjaHoraria).order_by(FranjaHoraria.orden).all()
    return [FranjaHorariaResponse.model_validate(f) for f in franjas]


@router.post("", response_model=FranjaHorariaResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=FranjaHorariaResponse, status_code=status.HTTP_201_CREATED)
def create_franja(
    data: FranjaCreate,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Create a new time slot (admin only)"""
    existing = db.query(FranjaHoraria).filter_by(orden=data.orden).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Franja con orden {data.orden} ya existe"
        )

    franja = FranjaHoraria(
        hora_inicio=data.hora_inicio,
        hora_fin=data.hora_fin,
        orden=data.orden,
    )
    db.add(franja)
    db.commit()
    db.refresh(franja)
    return FranjaHorariaResponse.model_validate(franja)


@router.patch("/{franja_id}", response_model=FranjaHorariaResponse)
def update_franja(
    franja_id: int,
    data: FranjaUpdate,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Update a time slot (admin only)"""
    franja = db.query(FranjaHoraria).filter_by(id=franja_id).first()
    if not franja:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Franja {franja_id} no encontrada"
        )

    if data.hora_inicio is not None:
        franja.hora_inicio = data.hora_inicio
    if data.hora_fin is not None:
        franja.hora_fin = data.hora_fin
    if data.orden is not None:
        existing = db.query(FranjaHoraria).filter(
            FranjaHoraria.orden == data.orden,
            FranjaHoraria.id != franja_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Franja con orden {data.orden} ya existe"
            )
        franja.orden = data.orden

    db.commit()
    db.refresh(franja)
    return FranjaHorariaResponse.model_validate(franja)


@router.delete("/{franja_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_franja(
    franja_id: int,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Delete a time slot (admin only). Returns 409 if it has associated turns."""
    franja = db.query(FranjaHoraria).filter_by(id=franja_id).first()
    if not franja:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Franja {franja_id} no encontrada"
        )

    if franja.turnos:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar una franja con turnos asociados"
        )

    db.delete(franja)
    db.commit()
