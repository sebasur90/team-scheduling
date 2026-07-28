from pydantic import BaseModel
from datetime import time
from typing import Optional


class FranjaCreate(BaseModel):
    hora_inicio: time
    hora_fin: time
    orden: int


class FranjaUpdate(BaseModel):
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    orden: Optional[int] = None


class FranjaHorariaResponse(BaseModel):
    id: int
    hora_inicio: time
    hora_fin: time
    orden: int

    class Config:
        from_attributes = True
