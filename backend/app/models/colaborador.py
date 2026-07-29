from sqlalchemy import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Colaborador(BaseModel):
    __tablename__ = "colaborador"

    nombre = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    sector = Column(String(50), nullable=False)  # 'tipo_a' or 'tipo_b'
    estado_atencion = Column(String(50), nullable=False, default="activo")  # 'activo' or 'desafectado'
    rol = Column(String(50), nullable=False, default="usuario")  # 'admin', 'usuario', or 'viewer'
    puntaje_prioridad = Column(Integer, default=0)
    fcm_token = Column(String(512), nullable=True)
    password_hash = Column(String(255), nullable=True)
    es_admin = Column(Boolean, default=False)
    franja_preferida_id = Column(Integer, ForeignKey("franja_horaria.id"), nullable=True)

    asignaciones = relationship("AsignacionAlmuerzo", back_populates="colaborador", cascade="all, delete-orphan")
    ausencias = relationship("Ausencia", back_populates="colaborador", cascade="all, delete-orphan")
    tareas_especiales = relationship("TareaEspecialAsignacion", back_populates="colaborador")
    tareas_habilitadas = relationship("ColaboradorTareaTipo", back_populates="colaborador", cascade="all, delete-orphan")
    notificaciones = relationship("Notificacion", back_populates="colaborador", cascade="all, delete-orphan")
    franja_preferida = relationship("FranjaHoraria")

    def __repr__(self):
        return f"<Colaborador(id={self.id}, nombre={self.nombre}, sector={self.sector})>"
