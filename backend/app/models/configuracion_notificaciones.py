from sqlalchemy import Column, Integer, Boolean, DateTime, Time
from app.models.base import BaseModel
from datetime import time as time_type


class ConfiguracionNotificaciones(BaseModel):
    __tablename__ = "configuracion_notificaciones"

    aviso_previo_minutos = Column(Integer, nullable=False, default=5)
    tiempo_respuesta_colab_min = Column(Integer, nullable=False, default=3)
    tiempo_aceptacion_admin_min = Column(Integer, nullable=False, default=1)
    notificaciones_pausadas = Column(Boolean, nullable=False, default=False)
    pausa_hasta = Column(DateTime(timezone=True), nullable=True)
    hora_inicio_envio = Column(Time, nullable=False, default=time_type(8, 0))
    hora_fin_envio = Column(Time, nullable=False, default=time_type(18, 0))
    intervalo_recordatorio_min = Column(Integer, nullable=False, default=30)

    def __repr__(self):
        return f"<ConfiguracionNotificaciones(id={self.id}, paused={self.notificaciones_pausadas})>"
