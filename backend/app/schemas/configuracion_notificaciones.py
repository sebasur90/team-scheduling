from pydantic import BaseModel, Field, field_validator
from datetime import datetime, time
from typing import Optional


class ConfiguracionNotificacionesResponse(BaseModel):
    id: int
    aviso_previo_minutos: int
    tiempo_respuesta_colab_min: int
    tiempo_aceptacion_admin_min: int
    notificaciones_pausadas: bool
    pausa_hasta: Optional[datetime] = None
    hora_inicio_envio: time
    hora_fin_envio: time
    intervalo_recordatorio_min: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConfiguracionNotificacionesUpdate(BaseModel):
    aviso_previo_minutos: Optional[int] = None
    tiempo_respuesta_colab_min: Optional[int] = None
    tiempo_aceptacion_admin_min: Optional[int] = None
    notificaciones_pausadas: Optional[bool] = None
    pausa_hasta: Optional[datetime] = None
    hora_inicio_envio: Optional[time] = None
    hora_fin_envio: Optional[time] = None
    intervalo_recordatorio_min: Optional[int] = None

    @field_validator("aviso_previo_minutos", "tiempo_respuesta_colab_min",
                     "tiempo_aceptacion_admin_min", "intervalo_recordatorio_min")
    @classmethod
    def validate_positive_integers(cls, v):
        if v is not None and v < 0:
            raise ValueError("Debe ser mayor o igual a 0")
        return v

    @field_validator("hora_fin_envio")
    @classmethod
    def validate_time_window(cls, v, info):
        if v is not None and info.data.get("hora_inicio_envio") is not None:
            if v <= info.data.get("hora_inicio_envio"):
                raise ValueError("La hora de fin debe ser posterior a la hora de inicio")
        return v
