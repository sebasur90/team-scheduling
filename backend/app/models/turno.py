from datetime import date
from sqlalchemy import Column, Date, Integer, ForeignKey, String
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class TurnoAlmuerzo(BaseModel):
    __tablename__ = "turno_almuerzo"

    fecha = Column(Date, nullable=False, index=True)
    franja_horaria_id = Column(Integer, ForeignKey("franja_horaria.id"), nullable=False)
    capacidad_maxima = Column(Integer, nullable=False)

    franja_horaria = relationship("FranjaHoraria", back_populates="turnos")
    asignaciones = relationship("AsignacionAlmuerzo", back_populates="turno_almuerzo", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TurnoAlmuerzo(fecha={self.fecha}, franja_id={self.franja_horaria_id})>"


class AsignacionAlmuerzo(BaseModel):
    __tablename__ = "asignacion_almuerzo"

    turno_almuerzo_id = Column(Integer, ForeignKey("turno_almuerzo.id", ondelete="CASCADE"), nullable=False)
    colaborador_id = Column(Integer, ForeignKey("colaborador.id"), nullable=False)
    estado = Column(String(50), nullable=False, default="firme")  # 'firme' or 'pendiente_swap'
    tarea_especial_asignacion_id = Column(
        Integer, ForeignKey("tarea_especial_asignacion.id", ondelete="SET NULL"), nullable=True
    )  # Set when this lunch slot was forced by a fija_almuerzo special task

    turno_almuerzo = relationship("TurnoAlmuerzo", back_populates="asignaciones")
    colaborador = relationship("Colaborador", back_populates="asignaciones")
    tarea_especial_asignacion = relationship("TareaEspecialAsignacion")
    swaps_origen = relationship("SwapSolicitud", foreign_keys="SwapSolicitud.asignacion_origen_id", back_populates="asignacion_origen")
    swaps_receptor = relationship("SwapSolicitud", foreign_keys="SwapSolicitud.asignacion_receptor_id", back_populates="asignacion_receptor")

    def __repr__(self):
        return f"<AsignacionAlmuerzo(turno_id={self.turno_almuerzo_id}, colaborador_id={self.colaborador_id})>"
