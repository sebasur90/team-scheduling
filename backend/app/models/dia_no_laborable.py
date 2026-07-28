from datetime import date
from sqlalchemy import Column, Date, String
from app.models.base import BaseModel


class DiaNoLaborable(BaseModel):
    __tablename__ = "dia_no_laborable"

    fecha = Column(Date, nullable=False, unique=True, index=True)
    motivo = Column(String(255), nullable=False)

    def __repr__(self):
        return f"<DiaNoLaborable(fecha={self.fecha}, motivo={self.motivo})>"
