from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional
from app.schemas.colaborador import ColaboradorResponse
from app.schemas.franja import FranjaHorariaResponse


class AsignacionResponse(BaseModel):
    id: int
    turno_almuerzo_id: int
    colaborador_id: int
    estado: str
    tarea_especial_asignacion_id: Optional[int] = None
    colaborador: ColaboradorResponse
    created_at: datetime

    class Config:
        from_attributes = True


class TurnoAlmuerzoResponse(BaseModel):
    id: int
    fecha: date
    franja_horaria_id: int
    capacidad_maxima: int
    franja_horaria: FranjaHorariaResponse
    asignaciones: List[AsignacionResponse]

    class Config:
        from_attributes = True


class TurnoListResponse(BaseModel):
    fecha: date
    franjas: List[TurnoAlmuerzoResponse]

    class Config:
        from_attributes = True
