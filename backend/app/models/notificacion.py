from sqlalchemy import Column, Integer, ForeignKey, String, Text, Boolean, Date
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Notificacion(BaseModel):
    __tablename__ = "notificacion"

    colaborador_id = Column(Integer, ForeignKey("colaborador.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(50), nullable=False)  # 'preference', 'swap', 'system', 'absence_alert', 'franja_preferida_disponible'
    mensaje = Column(Text, nullable=False)
    leida = Column(Boolean, default=False)
    referencia_id = Column(Integer)  # ID of related object (swap_id, preference_id, franja_horaria_id, etc)
    referencia_tipo = Column(String(50))  # 'swap', 'preference', 'absence', 'franja_horaria', etc
    canal = Column(String(20), default='in_app')  # 'in_app' or 'push'
    incidencia_id = Column(Integer, ForeignKey("incidencia_cobertura.id"), nullable=True)
    fecha = Column(Date, nullable=True)  # Date when franja was freed (for franja_preferida_disponible)
    estado = Column(String(50), default='pendiente')  # 'pendiente', 'aceptada', 'expirada'

    colaborador = relationship("Colaborador", back_populates="notificaciones")
    incidencia = relationship("IncidenciaCobertura")

    def __repr__(self):
        return f"<Notificacion(colaborador_id={self.colaborador_id}, tipo={self.tipo}, leida={self.leida})>"
