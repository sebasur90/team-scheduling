from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


class NotificacionResponse(BaseModel):
    id: int
    colaborador_id: int
    tipo: str
    mensaje: str
    leida: bool
    referencia_id: Optional[int] = None
    referencia_tipo: Optional[str] = None
    canal: str = 'in_app'
    fecha: Optional[date] = None
    estado: Optional[str] = 'pendiente'
    created_at: datetime

    class Config:
        from_attributes = True
