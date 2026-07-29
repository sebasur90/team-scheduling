from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ConfiguracionCobertura, Colaborador, ConfiguracionNotificaciones
from app.schemas.configuracion import (
    ConfiguracionCoberturaResponse, ConfiguracionCoberturaUpdate,
    ConfiguracionNotificacionesResponse, ConfiguracionNotificacionesUpdate
)
from app.dependencies import get_admin_user, get_current_user, require_non_viewer

router = APIRouter(prefix="/configuracion", tags=["configuracion"], redirect_slashes=False)


@router.get("/cobertura", response_model=ConfiguracionCoberturaResponse)
def get_configuracion_cobertura(
    db: Session = Depends(get_db),
    current_user: Colaborador = Depends(get_current_user),
):
    """Get current coverage configuration (any authenticated user)"""
    config = db.query(ConfiguracionCobertura).first()
    if not config:
        config = ConfiguracionCobertura(minimo_tipo_a=1, minimo_tipo_b=1)
        db.add(config)
        db.commit()
        db.refresh(config)
    return ConfiguracionCoberturaResponse.model_validate(config)


@router.put("/cobertura", response_model=ConfiguracionCoberturaResponse)
def update_configuracion_cobertura(
    data: ConfiguracionCoberturaUpdate,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Update coverage configuration (admin only)"""
    config = db.query(ConfiguracionCobertura).first()
    if not config:
        config = ConfiguracionCobertura(minimo_tipo_a=data.minimo_tipo_a, minimo_tipo_b=data.minimo_tipo_b)
        db.add(config)
    else:
        config.minimo_tipo_a = data.minimo_tipo_a
        config.minimo_tipo_b = data.minimo_tipo_b

    db.commit()
    db.refresh(config)
    return ConfiguracionCoberturaResponse.model_validate(config)


@router.get("/notificaciones", response_model=ConfiguracionNotificacionesResponse)
def get_notificaciones(
    db: Session = Depends(get_db),
    current_user: Colaborador = Depends(get_current_user),
):
    """Get notification configuration (any authenticated user)"""
    config = db.query(ConfiguracionNotificaciones).first()
    if not config:
        config = ConfiguracionNotificaciones()
        db.add(config)
        db.commit()
        db.refresh(config)
    return ConfiguracionNotificacionesResponse.model_validate(config)


@router.put("/notificaciones", response_model=ConfiguracionNotificacionesResponse)
def update_notificaciones(
    data: ConfiguracionNotificacionesUpdate,
    db: Session = Depends(get_db),
    user: Colaborador = Depends(require_non_viewer),
):
    """Update notification configuration (admin+usuario only, not viewer)"""
    config = db.query(ConfiguracionNotificaciones).first()
    if not config:
        config = ConfiguracionNotificaciones()
        db.add(config)

    if data.aviso_previo_minutos is not None:
        config.aviso_previo_minutos = data.aviso_previo_minutos
    if data.tiempo_respuesta_colab_min is not None:
        config.tiempo_respuesta_colab_min = data.tiempo_respuesta_colab_min
    if data.tiempo_aceptacion_admin_min is not None:
        config.tiempo_aceptacion_admin_min = data.tiempo_aceptacion_admin_min
    if data.notificaciones_pausadas is not None:
        config.notificaciones_pausadas = data.notificaciones_pausadas
    if data.pausa_hasta is not None:
        config.pausa_hasta = data.pausa_hasta
    if data.hora_inicio_envio is not None:
        config.hora_inicio_envio = data.hora_inicio_envio
    if data.hora_fin_envio is not None:
        config.hora_fin_envio = data.hora_fin_envio
    if data.intervalo_recordatorio_min is not None:
        config.intervalo_recordatorio_min = data.intervalo_recordatorio_min

    db.commit()
    db.refresh(config)
    return ConfiguracionNotificacionesResponse.model_validate(config)
