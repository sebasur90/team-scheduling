from pydantic import BaseModel
from typing import List, Optional
from datetime import time, datetime, date


class TareaEspecialTipoBase(BaseModel):
    nombre: str
    dia_semana_aplicable: List[int]
    hora_inicio: time
    hora_fin: time
    frecuencia: str = 'semanal'
    inhabilita_almuerzo: bool = False
    fecha_inicio_ciclo: Optional[date] = None
    fija_almuerzo: bool = False
    franja_almuerzo_id: Optional[int] = None


class TareaEspecialTipoCreate(TareaEspecialTipoBase):
    pass


class TareaEspecialTipoUpdate(BaseModel):
    nombre: Optional[str] = None
    dia_semana_aplicable: Optional[List[int]] = None
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    frecuencia: Optional[str] = None
    inhabilita_almuerzo: Optional[bool] = None
    fecha_inicio_ciclo: Optional[date] = None
    fija_almuerzo: Optional[bool] = None
    franja_almuerzo_id: Optional[int] = None


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


class TareaEspecialAsignacionResponse(BaseModel):
    id: int
    fecha: date
    tarea_especial_tipo_id: int
    colaborador_id: int
    tipo_nombre: str
    colaborador_nombre: str

    class Config:
        from_attributes = True


class GenerarCronogramaRequest(BaseModel):
    fecha_inicio: date
    fecha_fin: date
    tipo_ids: Optional[List[int]] = None


class GenerarCronogramaResponse(BaseModel):
    asignaciones_creadas: int
    asignaciones_saltadas: int
    advertencias: List[str]


class SwapAsignacionRequest(BaseModel):
    colaborador_id: int


class MiTareaResponse(BaseModel):
    id: int
    fecha: date
    tipo_nombre: str
    hora_inicio: time
    hora_fin: time
    inhabilita_almuerzo: bool

    class Config:
        from_attributes = True
