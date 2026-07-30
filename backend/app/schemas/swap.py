from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


class SwapCreate(BaseModel):
    asignacion_origen_id: int
    asignacion_receptor_id: int


class SwapRechazarRequest(BaseModel):
    motivo: Optional[str] = None


class SwapResponse(BaseModel):
    id: int
    asignacion_origen_id: int
    asignacion_receptor_id: Optional[int] = None
    colaborador_solicitante_id: int
    colaborador_receptor_id: int
    estado: str
    motivo_rechazo: Optional[str] = None
    created_at: datetime
    fecha: Optional[date] = None
    franja_origen_hora: Optional[str] = None
    franja_receptor_hora: Optional[str] = None
    nombre_solicitante: Optional[str] = None
    nombre_receptor: Optional[str] = None

    class Config:
        from_attributes = True
