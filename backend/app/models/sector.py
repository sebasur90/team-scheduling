from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Sector(BaseModel):
    __tablename__ = "sector"

    nombre = Column(String(255), nullable=False, unique=True, index=True)
    capacidad_maxima = Column(Integer, default=10)
    participa_almuerzo = Column(Boolean, default=True)
    acceso_rol = Column(String(50), default="gestion")  # 'gestion' or 'viewer'
    minimo_cobertura = Column(Integer, default=1)
    color = Column(String(7), default="#000000")

    colaboradores = relationship("Colaborador", back_populates="sector_obj")

    def __repr__(self):
        return f"<Sector(id={self.id}, nombre={self.nombre}, capacidad_maxima={self.capacidad_maxima})>"
