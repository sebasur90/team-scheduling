from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SectorBase(BaseModel):
    nombre: str
    capacidad_maxima: int = 10
    participa_almuerzo: bool = True
    acceso_rol: str = "gestion"  # 'gestion' or 'viewer'
    minimo_cobertura: int = 1
    color: str = "#000000"


class SectorCreate(SectorBase):
    pass


class SectorUpdate(BaseModel):
    nombre: Optional[str] = None
    capacidad_maxima: Optional[int] = None
    participa_almuerzo: Optional[bool] = None
    acceso_rol: Optional[str] = None
    minimo_cobertura: Optional[int] = None
    color: Optional[str] = None


class SectorResponse(SectorBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
