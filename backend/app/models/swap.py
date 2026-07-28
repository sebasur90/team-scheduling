from sqlalchemy import Column, Integer, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class SwapSolicitud(BaseModel):
    __tablename__ = "swap_solicitud"

    asignacion_origen_id = Column(Integer, ForeignKey("asignacion_almuerzo.id", ondelete="CASCADE"), nullable=False)
    colaborador_solicitante_id = Column(Integer, ForeignKey("colaborador.id"), nullable=False)
    colaborador_receptor_id = Column(Integer, ForeignKey("colaborador.id"), nullable=False)
    asignacion_receptor_id = Column(Integer, ForeignKey("asignacion_almuerzo.id", ondelete="CASCADE"))
    estado = Column(String(50), nullable=False, default="pendiente")  # 'pendiente', 'aceptado', 'rechazado', 'cancelado'
    motivo_rechazo = Column(Text)

    asignacion_origen = relationship("AsignacionAlmuerzo", foreign_keys=[asignacion_origen_id], back_populates="swaps_origen")
    asignacion_receptor = relationship("AsignacionAlmuerzo", foreign_keys=[asignacion_receptor_id], back_populates="swaps_receptor")
    colaborador_solicitante = relationship("Colaborador", foreign_keys=[colaborador_solicitante_id])
    colaborador_receptor = relationship("Colaborador", foreign_keys=[colaborador_receptor_id])

    def __repr__(self):
        return f"<SwapSolicitud(id={self.id}, solicitante={self.colaborador_solicitante_id}, estado={self.estado})>"
