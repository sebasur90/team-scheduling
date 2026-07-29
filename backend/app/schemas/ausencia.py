from pydantic import BaseModel, field_validator
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


class AusenciaCreateRango(BaseModel):
    colaborador_id: int
    fecha_inicio: date
    fecha_fin: date

    @field_validator("fecha_fin")
    @classmethod
    def validar_fecha_fin(cls, v, info):
        if "fecha_inicio" in info.data and v < info.data["fecha_inicio"]:
            raise ValueError("fecha_fin debe ser >= fecha_inicio")
        return v


class AusenciaDeleteBloque(BaseModel):
    colaborador_id: int
    fecha_inicio: date
    fecha_fin: date


class VacacionesBlockResponse(BaseModel):
    colaborador_id: int
    fecha_inicio: date
    fecha_fin: date
    motivo: str = "vacaciones"
    dias: list[date]
