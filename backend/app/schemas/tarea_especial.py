from pydantic import BaseModel
from typing import List, Optional
from datetime import time, datetime


class TareaEspecialTipoBase(BaseModel):
    nombre: str
    dia_semana_aplicable: List[int]
    hora_inicio: time
    hora_fin: time


class TareaEspecialTipoCreate(TareaEspecialTipoBase):
    pass


class TareaEspecialTipoUpdate(BaseModel):
    nombre: Optional[str] = None
    dia_semana_aplicable: Optional[List[int]] = None
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None


class TareaEspecialTipoResponse(TareaEspecialTipoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ColaboradorTareaTipoResponse(BaseModel):
    id: int
    colaborador_id: int
    tarea_tipo_id: int
    created_at: datetime

    class Config:
        from_attributes = True
