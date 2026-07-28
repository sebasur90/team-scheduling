from datetime import date
from sqlalchemy import Column, Date, Integer, ForeignKey, String
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class PreferenciaDiaria(BaseModel):
    __tablename__ = "preferencia_diaria"

    colaborador_id = Column(Integer, ForeignKey("colaborador.id", ondelete="CASCADE"), nullable=False)
    fecha = Column(Date, nullable=False, index=True)
    franja_horaria_id_deseada = Column(Integer, ForeignKey("franja_horaria.id"), nullable=False)
    estado_concesion = Column(String(50), nullable=False, default="pendiente")  # 'pendiente', 'otorgado', 'denegado'

    colaborador = relationship("Colaborador", back_populates="preferencias")
    franja_horaria_deseada = relationship("FranjaHoraria", back_populates="preferencias")

    def __repr__(self):
        return f"<PreferenciaDiaria(colaborador_id={self.colaborador_id}, fecha={self.fecha}, estado={self.estado_concesion})>"
