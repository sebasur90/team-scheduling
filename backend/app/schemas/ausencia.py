from pydantic import BaseModel
from datetime import date, datetime


class AusenciaCreate(BaseModel):
    colaborador_id: int
    fecha: date
    motivo: str = "otro"


class AusenciaResponse(BaseModel):
    id: int
    colaborador_id: int
    fecha: date
    motivo: str
    created_at: datetime

    class Config:
        from_attributes = True
