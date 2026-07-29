from sqlalchemy import Column, Integer
from app.models.base import BaseModel


class ConfiguracionCobertura(BaseModel):
    __tablename__ = "configuracion_cobertura"

    minimo_tipo_a = Column(Integer, nullable=False, default=1)
    minimo_tipo_b = Column(Integer, nullable=False, default=1)

    def __repr__(self):
        return f"<ConfiguracionCobertura(minimo_tipo_a={self.minimo_tipo_a}, minimo_tipo_b={self.minimo_tipo_b})>"
