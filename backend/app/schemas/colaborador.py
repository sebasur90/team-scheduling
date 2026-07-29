from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class ColaboradorBase(BaseModel):
    nombre: str
    email: EmailStr
    sector: str  # 'tipo_a' or 'tipo_b'
    estado_atencion: str = "activo"
    rol: str = "usuario"
    tarea_tipo_ids: List[int] = []


class ColaboradorCreate(ColaboradorBase):
    pass


class ColaboradorUpdate(BaseModel):
    nombre: Optional[str] = None
    sector: Optional[str] = None
    estado_atencion: Optional[str] = None
    rol: Optional[str] = None
    tarea_tipo_ids: Optional[List[int]] = None


class ColaboradorResponse(ColaboradorBase):
    id: int
    puntaje_prioridad: int
    es_admin: bool = False
    franja_preferida_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
