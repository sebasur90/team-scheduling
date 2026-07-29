from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Sector, Colaborador
from app.schemas.sector import SectorCreate, SectorUpdate, SectorResponse
from app.dependencies import get_admin_user

router = APIRouter(prefix="/sectores", tags=["sectores"], redirect_slashes=False)


@router.get("", response_model=List[SectorResponse])
@router.get("/", response_model=List[SectorResponse])
def list_sectores(db: Session = Depends(get_db)):
    """Get all sectors"""
    sectores = db.query(Sector).order_by(Sector.nombre).all()
    return [SectorResponse.model_validate(s) for s in sectores]


@router.post("", response_model=SectorResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SectorResponse, status_code=status.HTTP_201_CREATED)
def create_sector(
    data: SectorCreate,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Create a new sector (admin only)"""
    existing = db.query(Sector).filter_by(nombre=data.nombre).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Sector '{data.nombre}' ya existe"
        )

    sector = Sector(
        nombre=data.nombre,
        capacidad_maxima=data.capacidad_maxima,
        participa_almuerzo=data.participa_almuerzo,
        acceso_rol=data.acceso_rol,
        minimo_cobertura=data.minimo_cobertura,
        color=data.color,
    )
    db.add(sector)
    db.commit()
    db.refresh(sector)
    return SectorResponse.model_validate(sector)


@router.patch("/{sector_id}", response_model=SectorResponse)
def update_sector(
    sector_id: int,
    data: SectorUpdate,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Update a sector (admin only)"""
    sector = db.query(Sector).filter_by(id=sector_id).first()
    if not sector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sector {sector_id} no encontrado"
        )

    if data.nombre is not None:
        existing = db.query(Sector).filter(
            Sector.nombre == data.nombre,
            Sector.id != sector_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Sector '{data.nombre}' ya existe"
            )
        sector.nombre = data.nombre

    if data.capacidad_maxima is not None:
        sector.capacidad_maxima = data.capacidad_maxima
    if data.participa_almuerzo is not None:
        sector.participa_almuerzo = data.participa_almuerzo
    if data.acceso_rol is not None:
        sector.acceso_rol = data.acceso_rol
    if data.minimo_cobertura is not None:
        sector.minimo_cobertura = data.minimo_cobertura
    if data.color is not None:
        sector.color = data.color

    db.commit()
    db.refresh(sector)
    return SectorResponse.model_validate(sector)


@router.delete("/{sector_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sector(
    sector_id: int,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Delete a sector (admin only). Returns 409 if it has associated colaboradores."""
    sector = db.query(Sector).filter_by(id=sector_id).first()
    if not sector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sector {sector_id} no encontrado"
        )

    colaboradores_count = db.query(Colaborador).filter_by(sector_id=sector_id).count()
    if colaboradores_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se puede eliminar sector con {colaboradores_count} colaboradores asociados"
        )

    db.delete(sector)
    db.commit()
