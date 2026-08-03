from pydantic import BaseModel, field_validator, model_validator
from typing import List, Optional, Literal, Dict
from datetime import time, datetime, date


class ConfiguracionRotacionMultiSector(BaseModel):
    """Configuración para rotación multi-sector de tareas especiales"""
    modo: Literal["patron_fijo", "personalizado"]
    patron_semanal: Optional[List[str]] = None
    distribucion_por_dia: Optional[Dict[str, Dict[str, int]]] = None
    distribuciones_sector: Dict[str, int]

    @field_validator('patron_semanal', mode='before')
    @classmethod
    def validar_patron_no_vacio_si_modo_fijo(cls, v, info):
        if info.data.get('modo') == 'patron_fijo' and not v:
            raise ValueError("patron_semanal es requerido cuando modo='patron_fijo'")
        return v

    class Config:
        from_attributes = True


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
    configuracion_rotacion: Optional[ConfiguracionRotacionMultiSector] = None

    @model_validator(mode='after')
    def validar_configuracion_rotacion(self):
        config = self.configuracion_rotacion
        if config is None:
            return self

        n_dias = len(self.dia_semana_aplicable)
        total_cuotas = sum(config.distribuciones_sector.values())

        if total_cuotas != n_dias:
            raise ValueError(
                f"La suma de distribuciones_sector ({total_cuotas}) debe coincidir "
                f"con la cantidad de días aplicables ({n_dias})"
            )

        if config.modo == 'patron_fijo':
            if not config.patron_semanal or len(config.patron_semanal) != n_dias:
                raise ValueError(
                    f"patron_semanal debe tener exactamente {n_dias} elementos "
                    f"(uno por cada día en dia_semana_aplicable)"
                )
            for sector in set(config.patron_semanal):
                if sector not in config.distribuciones_sector:
                    raise ValueError(
                        f"Sector '{sector}' en patron_semanal no está en distribuciones_sector"
                    )

        if config.modo == 'personalizado':
            if not config.distribucion_por_dia:
                raise ValueError("distribucion_por_dia es requerido cuando modo='personalizado'")
            dias_aplicables_sorted = sorted(self.dia_semana_aplicable)
            for dia in dias_aplicables_sorted:
                if str(dia) not in config.distribucion_por_dia:
                    raise ValueError(f"Falta distribucion_por_dia para día {dia}")

        return self


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
    configuracion_rotacion: Optional[ConfiguracionRotacionMultiSector] = None


class TareaEspecialTipoResponse(TareaEspecialTipoBase):
    id: int
    configuracion_rotacion: Optional[ConfiguracionRotacionMultiSector] = None
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
