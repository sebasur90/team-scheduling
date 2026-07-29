from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Colaborador, ColaboradorTareaTipo
from app.schemas.colaborador import ColaboradorResponse, ColaboradorCreate, ColaboradorUpdate
from app.dependencies import get_admin_user, get_current_user
from typing import List, Optional

router = APIRouter(prefix="/colaboradores", tags=["colaboradores"], redirect_slashes=False)


class FCMTokenRequest(BaseModel):
    fcm_token: str


@router.get("", response_model=List[ColaboradorResponse])
@router.get("/", response_model=List[ColaboradorResponse])
def list_colaboradores(token: str = "", db: Session = Depends(get_db)):
    """Get all colaboradores (admin only)"""
    # TODO: Add proper admin check
    colaboradores = db.query(Colaborador).all()
    return [ColaboradorResponse.model_validate(c) for c in colaboradores]


@router.post("", response_model=ColaboradorResponse)
@router.post("/", response_model=ColaboradorResponse)
def create_colaborador(
    colab: ColaboradorCreate,
    token: str = "",
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Create a new colaborador (admin only)"""
    # Check if email already exists
    existing = db.query(Colaborador).filter(Colaborador.email == colab.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email ya existe")

    colab_data = colab.model_dump(exclude={"tarea_tipo_ids"})
    new_colab = Colaborador(**colab_data)
    db.add(new_colab)
    db.commit()
    db.refresh(new_colab)

    # Create junction table entries for special tasks
    for tarea_tipo_id in colab.tarea_tipo_ids:
        junction = ColaboradorTareaTipo(
            colaborador_id=new_colab.id,
            tarea_tipo_id=tarea_tipo_id,
        )
        db.add(junction)
    db.commit()
    db.refresh(new_colab)

    return ColaboradorResponse.model_validate(new_colab)


@router.get("/{colaborador_id}", response_model=ColaboradorResponse)
def get_colaborador(colaborador_id: int, db: Session = Depends(get_db)):
    """Get a specific colaborador"""
    colab = db.query(Colaborador).filter(Colaborador.id == colaborador_id).first()
    if not colab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador no encontrado")
    return ColaboradorResponse.model_validate(colab)


@router.patch("/{colaborador_id}", response_model=ColaboradorResponse)
def update_colaborador(
    colaborador_id: int,
    update_data: ColaboradorUpdate,
    token: str = "",
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Update a colaborador (admin only)"""
    colab = db.query(Colaborador).filter(Colaborador.id == colaborador_id).first()
    if not colab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador no encontrado")

    update_dict = update_data.model_dump(exclude_unset=True, exclude={"tarea_tipo_ids"})
    for key, value in update_dict.items():
        setattr(colab, key, value)

    # Handle tarea_tipo_ids update if provided
    if "tarea_tipo_ids" in update_data.model_dump(exclude_unset=True):
        # Delete existing assignments
        db.query(ColaboradorTareaTipo).filter_by(colaborador_id=colaborador_id).delete()
        # Create new assignments
        for tarea_tipo_id in update_data.tarea_tipo_ids:
            junction = ColaboradorTareaTipo(
                colaborador_id=colaborador_id,
                tarea_tipo_id=tarea_tipo_id,
            )
            db.add(junction)

    db.commit()
    db.refresh(colab)

    return ColaboradorResponse.model_validate(colab)


@router.patch("/{colaborador_id}/fcm-token")
def update_fcm_token(
    colaborador_id: int,
    request: FCMTokenRequest,
    db: Session = Depends(get_db),
):
    """Actualiza el token FCM del dispositivo del colaborador."""
    colab = db.query(Colaborador).filter(Colaborador.id == colaborador_id).first()
    if not colab:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador no encontrado")

    colab.fcm_token = request.fcm_token
    db.add(colab)
    db.commit()
    db.refresh(colab)

    return {"status": "fcm_token_actualizado", "colaborador_id": colaborador_id}


class PreferenciaRequest(BaseModel):
    franja_horaria_id: Optional[int] = None


@router.patch("/me/preferencia", response_model=ColaboradorResponse)
def update_mi_preferencia(
    request: PreferenciaRequest,
    current_user: Colaborador = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update logged-in user's general preferred franja."""
    current_user.franja_preferida_id = request.franja_horaria_id
    db.commit()
    db.refresh(current_user)
    return ColaboradorResponse.model_validate(current_user)
