from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SwapCreate(BaseModel):
    asignacion_origen_id: int
    colaborador_receptor_id: int


class SwapResponse(BaseModel):
    id: int
    asignacion_origen_id: int
    colaborador_solicitante_id: int
    colaborador_receptor_id: int
    asignacion_receptor_id: Optional[int] = None
    estado: str
    motivo_rechazo: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
