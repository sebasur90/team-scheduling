from datetime import date
from sqlalchemy import Column, Date, Integer, ForeignKey, String
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Ausencia(BaseModel):
    __tablename__ = "ausencia"

    colaborador_id = Column(Integer, ForeignKey("colaborador.id", ondelete="CASCADE"), nullable=False)
    fecha = Column(Date, nullable=False, index=True)
    motivo = Column(String(50), nullable=False, default="otro")  # 'licencia', 'enfermedad', 'otro'

    colaborador = relationship("Colaborador", back_populates="ausencias")

    def __repr__(self):
        return f"<Ausencia(colaborador_id={self.colaborador_id}, fecha={self.fecha}, motivo={self.motivo})>"
