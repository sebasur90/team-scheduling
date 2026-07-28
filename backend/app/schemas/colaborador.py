from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class ColaboradorBase(BaseModel):
    nombre: str
    email: EmailStr
    sector: str  # 'comercial' or 'operativo'
    estado_atencion: str = "activo"
    rol: str = "usuario"
    habilitado_orientador: bool = False
    habilitado_gestion_externa: bool = False


class ColaboradorCreate(ColaboradorBase):
    pass


class ColaboradorUpdate(BaseModel):
    nombre: Optional[str] = None
    sector: Optional[str] = None
    estado_atencion: Optional[str] = None
    rol: Optional[str] = None
    habilitado_orientador: Optional[bool] = None
    habilitado_gestion_externa: Optional[bool] = None


class ColaboradorResponse(ColaboradorBase):
    id: int
    puntaje_prioridad: int
    es_admin: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
