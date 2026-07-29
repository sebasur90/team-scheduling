from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import TareaEspecialTipo, ColaboradorTareaTipo, Colaborador
from app.schemas.tarea_especial import (
    TareaEspecialTipoResponse,
    TareaEspecialTipoCreate,
    TareaEspecialTipoUpdate,
)
from app.dependencies import get_admin_user, get_current_user

router = APIRouter(prefix="/tareas-especiales", tags=["tareas-especiales"], redirect_slashes=False)


@router.get("/tipos", response_model=List[TareaEspecialTipoResponse])
@router.get("/tipos/", response_model=List[TareaEspecialTipoResponse])
def list_tipos(
    db: Session = Depends(get_db),
    _: Colaborador = Depends(get_current_user),
):
    """Get all special task types (autenticado)"""
    tipos = db.query(TareaEspecialTipo).order_by(TareaEspecialTipo.id).all()
    return [TareaEspecialTipoResponse.model_validate(t) for t in tipos]


@router.post("/tipos", response_model=TareaEspecialTipoResponse, status_code=status.HTTP_201_CREATED)
@router.post("/tipos/", response_model=TareaEspecialTipoResponse, status_code=status.HTTP_201_CREATED)
def create_tipo(
    data: TareaEspecialTipoCreate,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Create a new special task type (admin only)"""
    existing = db.query(TareaEspecialTipo).filter_by(nombre=data.nombre).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tipo de tarea '{data.nombre}' ya existe"
        )

    tipo = TareaEspecialTipo(
        nombre=data.nombre,
        dia_semana_aplicable=data.dia_semana_aplicable,
        hora_inicio=data.hora_inicio,
        hora_fin=data.hora_fin,
    )
    db.add(tipo)
    db.commit()
    db.refresh(tipo)
    return TareaEspecialTipoResponse.model_validate(tipo)


@router.put("/tipos/{tipo_id}", response_model=TareaEspecialTipoResponse)
def update_tipo(
    tipo_id: int,
    data: TareaEspecialTipoUpdate,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Update a special task type (admin only)"""
    tipo = db.query(TareaEspecialTipo).filter_by(id=tipo_id).first()
    if not tipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tipo de tarea {tipo_id} no encontrado"
        )

    if data.nombre is not None:
        existing = db.query(TareaEspecialTipo).filter(
            TareaEspecialTipo.nombre == data.nombre,
            TareaEspecialTipo.id != tipo_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tipo de tarea '{data.nombre}' ya existe"
            )
        tipo.nombre = data.nombre

    if data.dia_semana_aplicable is not None:
        tipo.dia_semana_aplicable = data.dia_semana_aplicable
    if data.hora_inicio is not None:
        tipo.hora_inicio = data.hora_inicio
    if data.hora_fin is not None:
        tipo.hora_fin = data.hora_fin

    db.commit()
    db.refresh(tipo)
    return TareaEspecialTipoResponse.model_validate(tipo)


@router.delete("/tipos/{tipo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tipo(
    tipo_id: int,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Delete a special task type (admin only). Returns 409 if it has active assignments."""
    tipo = db.query(TareaEspecialTipo).filter_by(id=tipo_id).first()
    if not tipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tipo de tarea {tipo_id} no encontrado"
        )

    has_assignments = db.query(ColaboradorTareaTipo).filter_by(tarea_tipo_id=tipo_id).first()
    if has_assignments:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar un tipo de tarea con asignaciones activas"
        )

    db.delete(tipo)
    db.commit()
