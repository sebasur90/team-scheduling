from datetime import date, time
from sqlalchemy import Column, Date, Integer, ForeignKey, String, Time, JSON, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class TareaEspecialTipo(BaseModel):
    __tablename__ = "tarea_especial_tipo"

    nombre = Column(String(100), nullable=False, unique=True)
    dia_semana_aplicable = Column(JSON, nullable=False)  # [0,1,2,3,4] for Mon-Fri
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    frecuencia = Column(String(10), nullable=False, default='semanal')  # 'semanal' or 'quincenal'
    inhabilita_almuerzo = Column(Boolean, nullable=False, default=False)
    fecha_inicio_ciclo = Column(Date, nullable=True)
    fija_almuerzo = Column(Boolean, nullable=False, default=False)
    franja_almuerzo_id = Column(Integer, ForeignKey("franja_horaria.id"), nullable=True)
    configuracion_rotacion = Column(JSON, nullable=True)

    asignaciones = relationship("TareaEspecialAsignacion", back_populates="tipo", cascade="all, delete-orphan")
    colaboradores_habilitados = relationship("ColaboradorTareaTipo", back_populates="tarea_tipo", cascade="all, delete-orphan")
    franja_almuerzo = relationship("FranjaHoraria")

    def __repr__(self):
        return f"<TareaEspecialTipo(nombre={self.nombre})>"


class ColaboradorTareaTipo(BaseModel):
    __tablename__ = "colaborador_tarea_tipo"

    colaborador_id = Column(Integer, ForeignKey("colaborador.id", ondelete="CASCADE"), nullable=False)
    tarea_tipo_id = Column(Integer, ForeignKey("tarea_especial_tipo.id", ondelete="CASCADE"), nullable=False)

    colaborador = relationship("Colaborador", back_populates="tareas_habilitadas")
    tarea_tipo = relationship("TareaEspecialTipo", back_populates="colaboradores_habilitados")

    def __repr__(self):
        return f"<ColaboradorTareaTipo(colaborador_id={self.colaborador_id}, tarea_tipo_id={self.tarea_tipo_id})>"


class TareaEspecialAsignacion(BaseModel):
    __tablename__ = "tarea_especial_asignacion"

    fecha = Column(Date, nullable=False, index=True)
    tarea_especial_tipo_id = Column(Integer, ForeignKey("tarea_especial_tipo.id"), nullable=False)
    colaborador_id = Column(Integer, ForeignKey("colaborador.id"), nullable=False)

    tipo = relationship("TareaEspecialTipo", back_populates="asignaciones")
    colaborador = relationship("Colaborador", back_populates="tareas_especiales")

    def __repr__(self):
        return f"<TareaEspecialAsignacion(fecha={self.fecha}, tipo_id={self.tarea_especial_tipo_id})>"
