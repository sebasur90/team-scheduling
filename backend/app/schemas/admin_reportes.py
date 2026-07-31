from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional


# ===== AUSENCIAS =====

class AusenciaDetalle(BaseModel):
    id: int
    colaborador_id: int
    nombre_colaborador: str
    sector_id: int
    fecha: date
    motivo: str
    created_at: datetime

    class Config:
        from_attributes = True


class RankingAusencia(BaseModel):
    colaborador_id: int
    nombre: str
    sector_id: int
    cantidad_ausencias: int
    porcentaje_semana: float

    class Config:
        from_attributes = True


class ResumenAusencias(BaseModel):
    ranking: List[RankingAusencia]
    detalle: List[AusenciaDetalle]
    total_registros: int
    periodo: dict  # {fecha_inicio, fecha_fin}


# ===== FRANJAS =====

class DistribucionFranjaItem(BaseModel):
    fecha: date
    franja_id: int
    franja_nombre: str
    hora_inicio: str
    hora_fin: str
    asignados: int
    ausentes: int
    capacidad: int
    disponibles_backlog: int

    class Config:
        from_attributes = True


class CumplimientoPreferencia(BaseModel):
    colaborador_id: int
    nombre: str
    sector_id: int
    franja_preferida_id: Optional[int]
    franja_preferida_nombre: Optional[str]
    total_asignaciones: int
    asignaciones_en_preferencia: int
    porcentaje_cumplimiento: float

    class Config:
        from_attributes = True


class CoberturaPorFranja(BaseModel):
    franja_id: int
    franja_nombre: str
    hora_inicio: str
    hora_fin: str
    orden: int
    ocupacion_promedio: float
    capacidad_promedio: float
    porcentaje_cobertura: float

    class Config:
        from_attributes = True


class ResumenFranjas(BaseModel):
    distribucion: List[DistribucionFranjaItem]
    cumplimiento_preferencias: List[CumplimientoPreferencia]
    cobertura_real: List[CoberturaPorFranja]
    periodo: dict


# ===== SWAPS =====

class SwapDetalle(BaseModel):
    id: int
    solicitante_id: int
    solicitante_nombre: str
    receptor_id: int
    receptor_nombre: str
    fecha: date
    franja_origen: str
    franja_receptor: str
    estado: str
    motivo_rechazo: Optional[str] = None
    created_at: datetime
    dias_antiguedad: int

    class Config:
        from_attributes = True


class RankingSwapColaborador(BaseModel):
    colaborador_id: int
    nombre: str
    sector_id: int
    swaps_pendientes: int
    swaps_aceptados: int
    swaps_rechazados: int
    total: int

    class Config:
        from_attributes = True


class EstadisticasSwaps(BaseModel):
    total_pendientes: int
    total_aceptados: int
    total_rechazados: int
    total_general: int


class ResumenSwaps(BaseModel):
    ranking: List[RankingSwapColaborador]
    detalle: List[SwapDetalle]
    estadisticas: EstadisticasSwaps
    periodo: dict
