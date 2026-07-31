from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional


class SwapPendienteItem(BaseModel):
    id: int
    solicitante: str
    receptor: str
    fecha: Optional[date] = None
    franja_origen: Optional[str] = None
    franja_receptor: Optional[str] = None
    hace: str  # ej: "2h", "30m"


class TurnoSinConfirmarItem(BaseModel):
    id: int
    colaborador: str
    fecha: date
    franja: str


class CoberturaEnRiesgoItem(BaseModel):
    fecha: date
    franja: str
    estado: str  # "riesgo" o "critico"
    detalle: str


class ResumenSection(BaseModel):
    count: int
    items: List[dict]


class AdminResumenResponse(BaseModel):
    swaps_pendientes: ResumenSection
    turnos_sin_confirmar: ResumenSection
    cobertura_en_riesgo: ResumenSection
    colaboradores_activos: int

    class Config:
        from_attributes = True
