from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, date, timedelta
from app.database import get_db
from app.dependencies import get_admin_user
from app.models.colaborador import Colaborador
from app.models.swap import SwapSolicitud
from app.models.turno import TurnoAlmuerzo, AsignacionAlmuerzo
from app.models.ausencia import Ausencia
from app.models.franja_horaria import FranjaHoraria
from app.models.configuracion_cobertura import ConfiguracionCobertura
from app.schemas.admin_resumen import AdminResumenResponse
from app.enums import EstadoAtencion
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin_resumen"], redirect_slashes=False)


def _format_tiempo_hace(created_at: datetime) -> str:
    """Formatea el tiempo transcurrido como '2h', '30m', etc."""
    ahora = datetime.utcnow()
    diff = ahora - created_at
    minutos = diff.total_seconds() / 60

    if minutos < 1:
        return "ahora"
    elif minutos < 60:
        return f"{int(minutos)}m"
    elif minutos < 1440:
        horas = int(minutos / 60)
        return f"{horas}h"
    else:
        dias = int(minutos / 1440)
        return f"{dias}d"


def _get_swaps_pendientes(db: Session) -> dict:
    """Obtiene swaps pendientes con detalles."""
    swaps = db.query(SwapSolicitud).filter(
        SwapSolicitud.estado == "pendiente"
    ).options(
        joinedload(SwapSolicitud.asignacion_origen).joinedload("turno_almuerzo").joinedload("franja_horaria"),
        joinedload(SwapSolicitud.asignacion_receptor).joinedload("turno_almuerzo").joinedload("franja_horaria"),
        joinedload(SwapSolicitud.colaborador_solicitante),
        joinedload(SwapSolicitud.colaborador_receptor),
    ).order_by(SwapSolicitud.created_at.desc()).limit(10).all()

    items = []
    for swap in swaps:
        try:
            franja_origen = None
            franja_receptor = None
            fecha = None

            if swap.asignacion_origen and swap.asignacion_origen.turno_almuerzo:
                turno_origen = swap.asignacion_origen.turno_almuerzo
                fecha = turno_origen.fecha
                if turno_origen.franja_horaria:
                    franja_origen = f"{turno_origen.franja_horaria.hora_inicio.strftime('%H:%M')}–{turno_origen.franja_horaria.hora_fin.strftime('%H:%M')}"

            if swap.asignacion_receptor and swap.asignacion_receptor.turno_almuerzo:
                turno_receptor = swap.asignacion_receptor.turno_almuerzo
                if turno_receptor.franja_horaria:
                    franja_receptor = f"{turno_receptor.franja_horaria.hora_inicio.strftime('%H:%M')}–{turno_receptor.franja_horaria.hora_fin.strftime('%H:%M')}"

            items.append({
                "id": swap.id,
                "solicitante": swap.colaborador_solicitante.nombre if swap.colaborador_solicitante else "?",
                "receptor": swap.colaborador_receptor.nombre if swap.colaborador_receptor else "?",
                "fecha": fecha.isoformat() if fecha else None,
                "franja_origen": franja_origen,
                "franja_receptor": franja_receptor,
                "hace": _format_tiempo_hace(swap.created_at),
            })
        except Exception as e:
            logger.warning(f"Error procesando swap {swap.id}: {e}")
            continue

    return {"count": len(items), "items": items}


def _get_turnos_sin_confirmar(db: Session) -> dict:
    """Obtiene turnos sin confirmar. Interpreta como asignaciones con estado 'pendiente_swap'."""
    hoy = date.today()
    proxima_semana = hoy + timedelta(days=7)

    asignaciones = db.query(AsignacionAlmuerzo).join(TurnoAlmuerzo).filter(
        AsignacionAlmuerzo.estado == "pendiente_swap",
        TurnoAlmuerzo.fecha >= hoy,
        TurnoAlmuerzo.fecha <= proxima_semana,
    ).order_by(TurnoAlmuerzo.fecha.asc()).limit(10).all()

    items = []
    for asign in asignaciones:
        turno = asign.turno_almuerzo
        franja_str = f"{turno.franja_horaria.hora_inicio.strftime('%H:%M')}–{turno.franja_horaria.hora_fin.strftime('%H:%M')}"

        items.append({
            "id": asign.id,
            "colaborador": asign.colaborador.nombre if asign.colaborador else "?",
            "fecha": turno.fecha.isoformat(),
            "franja": franja_str,
        })

    return {"count": len(items), "items": items}


def _get_cobertura_en_riesgo(db: Session) -> dict:
    """Detecta franjas en riesgo de cobertura (simplificado)."""
    config = db.query(ConfiguracionCobertura).first()
    minimo_tipo_a = config.minimo_tipo_a if config else 1
    minimo_tipo_b = config.minimo_tipo_b if config else 1

    hoy = date.today()
    proxima_semana = hoy + timedelta(days=7)

    franjas = db.query(FranjaHoraria).order_by(FranjaHoraria.orden).all()
    items = []

    for franja in franjas:
        turnos_en_franja = db.query(TurnoAlmuerzo).filter(
            TurnoAlmuerzo.franja_horaria_id == franja.id,
            TurnoAlmuerzo.fecha >= hoy,
            TurnoAlmuerzo.fecha <= proxima_semana,
        ).all()

        for turno in turnos_en_franja:
            # Contar colaboradores disponibles (sin ausencia y sin asignación en esta franja)
            colaboradores_activos = db.query(Colaborador).filter(
                Colaborador.estado_atencion == EstadoAtencion.ACTIVO.value
            ).all()

            disponibles_a = 0
            disponibles_b = 0

            for colab in colaboradores_activos:
                # Verificar ausencia
                ausencia = db.query(Ausencia).filter(
                    Ausencia.colaborador_id == colab.id,
                    Ausencia.fecha == turno.fecha
                ).first()
                if ausencia:
                    continue

                # Verificar asignación en esta franja
                asignado = db.query(AsignacionAlmuerzo).filter(
                    AsignacionAlmuerzo.colaborador_id == colab.id,
                    AsignacionAlmuerzo.turno_almuerzo_id == turno.id
                ).first()
                if asignado:
                    continue

                # Contar por sector
                if colab.sector_id == 1:  # Asumir sector 1 = Tipo A
                    disponibles_a += 1
                else:
                    disponibles_b += 1

            # Detectar riesgo
            riesgo_a = disponibles_a < minimo_tipo_a
            riesgo_b = disponibles_b < minimo_tipo_b
            estado = "critico" if (riesgo_a and riesgo_b) else ("riesgo" if (riesgo_a or riesgo_b) else None)

            if estado:
                franja_str = f"{franja.hora_inicio.strftime('%H:%M')}–{franja.hora_fin.strftime('%H:%M')}"
                items.append({
                    "fecha": turno.fecha.isoformat(),
                    "franja": franja_str,
                    "estado": estado,
                    "detalle": f"Tipo A: {disponibles_a}/{minimo_tipo_a}, Tipo B: {disponibles_b}/{minimo_tipo_b}",
                })

    return {"count": len(items), "items": items}


def _get_colaboradores_activos(db: Session) -> int:
    """Retorna cantidad de colaboradores activos."""
    return db.query(Colaborador).filter(
        Colaborador.estado_atencion == EstadoAtencion.ACTIVO.value
    ).count()


@router.get("/resumen", status_code=status.HTTP_200_OK)
def get_admin_resumen(
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
) -> AdminResumenResponse:
    """
    Retorna resumen de alertas para admin:
    - Swaps pendientes
    - Turnos sin confirmar
    - Cobertura en riesgo
    - Colaboradores activos
    """
    try:
        return AdminResumenResponse(
            swaps_pendientes=_get_swaps_pendientes(db),
            turnos_sin_confirmar=_get_turnos_sin_confirmar(db),
            cobertura_en_riesgo=_get_cobertura_en_riesgo(db),
            colaboradores_activos=_get_colaboradores_activos(db),
        )
    except Exception as e:
        logger.error(f"Error en admin/resumen: {e}")
        raise
