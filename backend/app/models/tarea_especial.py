from datetime import date, time
from sqlalchemy import Column, Date, Integer, ForeignKey, String, Time, ARRAY
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class TareaEspecialTipo(BaseModel):
    __tablename__ = "tarea_especial_tipo"

    nombre = Column(String(100), nullable=False, unique=True)
    dia_semana_aplicable = Column(ARRAY(Integer), nullable=False)  # [0,1,2,3,4] for Mon-Fri
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)

    asignaciones = relationship("TareaEspecialAsignacion", back_populates="tipo", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TareaEspecialTipo(nombre={self.nombre})>"


class TareaEspecialAsignacion(BaseModel):
    __tablename__ = "tarea_especial_asignacion"

    fecha = Column(Date, nullable=False, index=True)
    tarea_especial_tipo_id = Column(Integer, ForeignKey("tarea_especial_tipo.id"), nullable=False)
    colaborador_id = Column(Integer, ForeignKey("colaborador.id"), nullable=False)

    tipo = relationship("TareaEspecialTipo", back_populates="asignaciones")
    colaborador = relationship("Colaborador", back_populates="tareas_especiales")

    def __repr__(self):
        return f"<TareaEspecialAsignacion(fecha={self.fecha}, tipo_id={self.tarea_especial_tipo_id})>"
