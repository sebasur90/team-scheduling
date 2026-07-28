from pydantic import BaseModel
from datetime import date


class DiaNoLaborableCreate(BaseModel):
    fecha: date
    motivo: str


class DiaNoLaborableResponse(BaseModel):
    fecha: date
    motivo: str

    class Config:
        from_attributes = True
