from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class PreferenciaCreate(BaseModel):
    fecha: date
    franja_horaria_id_deseada: int


class PreferenciaResponse(BaseModel):
    id: int
    colaborador_id: int
    fecha: date
    franja_horaria_id_deseada: int
    estado_concesion: str
    created_at: datetime

    class Config:
        from_attributes = True
