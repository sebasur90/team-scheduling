from datetime import time
from sqlalchemy import Column, Time, Integer
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class FranjaHoraria(BaseModel):
    __tablename__ = "franja_horaria"

    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    orden = Column(Integer, nullable=False, unique=True)
    capacidad_maxima = Column(Integer, default=2, nullable=False)

    turnos = relationship("TurnoAlmuerzo", back_populates="franja_horaria")

    def __repr__(self):
        return f"<FranjaHoraria(orden={self.orden}, {self.hora_inicio}-{self.hora_fin}, cap={self.capacidad_maxima})>"
