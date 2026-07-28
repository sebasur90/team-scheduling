from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, func
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class IncidenciaCobertura(BaseModel):
    __tablename__ = "incidencia_cobertura"

    asignacion_id = Column(Integer, ForeignKey("asignacion_almuerzo.id", ondelete="CASCADE"), nullable=False)
    motivo = Column(String(20), nullable=False)  # 'rechazo' or 'timeout'
    estado = Column(String(30), nullable=False, default="ventana_admin")  # 'ventana_admin', 'broadcast_activo', 'resuelta', 'sin_candidatos'
    colaborador_reemplazante_id = Column(Integer, ForeignKey("colaborador.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    asignacion = relationship("AsignacionAlmuerzo", foreign_keys=[asignacion_id])
    colaborador_reemplazante = relationship("Colaborador", foreign_keys=[colaborador_reemplazante_id])
    historial_reemplazos = relationship("HistorialReemplazo", back_populates="incidencia", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<IncidenciaCobertura(id={self.id}, asignacion_id={self.asignacion_id}, estado={self.estado})>"


class HistorialReemplazo(BaseModel):
    __tablename__ = "historial_reemplazos"

    colaborador_id = Column(Integer, ForeignKey("colaborador.id", ondelete="CASCADE"), nullable=False)
    incidencia_id = Column(Integer, ForeignKey("incidencia_cobertura.id", ondelete="CASCADE"), nullable=False)
    fecha = Column(String(10), nullable=False)  # YYYY-MM-DD
    semana_iso = Column(String(10), nullable=False)

    colaborador = relationship("Colaborador")
    incidencia = relationship("IncidenciaCobertura", back_populates="historial_reemplazos")

    def __repr__(self):
        return f"<HistorialReemplazo(colaborador_id={self.colaborador_id}, incidencia_id={self.incidencia_id}, semana_iso={self.semana_iso})>"
