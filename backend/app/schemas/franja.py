from pydantic import BaseModel, field_validator
from datetime import time
from typing import Optional


class FranjaCreate(BaseModel):
    hora_inicio: time
    hora_fin: time
    orden: int

    @field_validator('hora_fin')
    @classmethod
    def validar_hora_fin(cls, v, info):
        if 'hora_inicio' in info.data and v <= info.data['hora_inicio']:
            raise ValueError('hora_fin debe ser mayor que hora_inicio')
        return v


class FranjaUpdate(BaseModel):
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    orden: Optional[int] = None

    @field_validator('hora_fin')
    @classmethod
    def validar_hora_fin(cls, v, info):
        if v is not None and 'hora_inicio' in info.data and info.data['hora_inicio'] is not None:
            if v <= info.data['hora_inicio']:
                raise ValueError('hora_fin debe ser mayor que hora_inicio')
        return v


class FranjaHorariaResponse(BaseModel):
    id: int
    hora_inicio: time
    hora_fin: time
    orden: int

    class Config:
        from_attributes = True
