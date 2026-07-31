from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta, timezone
from typing import Optional, List, Dict
from io import StringIO
import csv
import logging

from app.database import get_db
from app.dependencies import get_admin_user
from app.models.colaborador import Colaborador
from app.models.ausencia import Ausencia
from app.models.turno import TurnoAlmuerzo, AsignacionAlmuerzo
from app.models.franja_horaria import FranjaHoraria
from app.models.swap import SwapSolicitud
from app.models.dia_no_laborable import DiaNoLaborable
from app.schemas.admin_reportes import (
    ResumenAusencias, AusenciaDetalle, RankingAusencia,
    ResumenFranjas, DistribucionFranjaItem, CumplimientoPreferencia, CoberturaPorFranja,
    ResumenSwaps, SwapDetalle, RankingSwapColaborador, EstadisticasSwaps
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/reportes", tags=["admin_reportes"], redirect_slashes=False)


# ===== HELPER FUNCTIONS: AUSENCIAS =====

def _contar_dias_laborables(fecha_inicio: date, fecha_fin: date, db: Session) -> int:
    """Cuenta días laborables en rango (Monday-Friday, excluye DiaNoLaborable)."""
    dias_no_laborables = db.query(DiaNoLaborable).filter(
        and_(
            DiaNoLaborable.fecha >= fecha_inicio,
            DiaNoLaborable.fecha <= fecha_fin
        )
    ).all()
    no_laborables_set = {d.fecha for d in dias_no_laborables}

    laborables = 0
    current = fecha_inicio
    while current <= fecha_fin:
        if current.weekday() < 5 and current not in no_laborables_set:
            laborables += 1
        current += timedelta(days=1)

    return laborables


def _get_ausencias_detalladas(
    db: Session,
    fecha_inicio: date,
    fecha_fin: date,
    sector_id: Optional[int] = None
) -> List[AusenciaDetalle]:
    """Obtiene lista detallada de ausencias en el rango."""
    query = db.query(
        Ausencia.id,
        Ausencia.colaborador_id,
        Colaborador.nombre.label("nombre_colaborador"),
        Colaborador.sector_id,
        Ausencia.fecha,
        Ausencia.motivo,
        Ausencia.created_at
    ).join(Colaborador).filter(
        and_(
            Ausencia.fecha >= fecha_inicio,
            Ausencia.fecha <= fecha_fin
        )
    )

    if sector_id is not None:
        query = query.filter(Colaborador.sector_id == sector_id)

    results = query.order_by(Ausencia.fecha.desc(), Colaborador.nombre.asc()).all()

    return [
        AusenciaDetalle(
            id=r[0],
            colaborador_id=r[1],
            nombre_colaborador=r[2],
            sector_id=r[3],
            fecha=r[4],
            motivo=r[5],
            created_at=r[6]
        )
        for r in results
    ]


def _calcular_ranking_ausencias(
    db: Session,
    ausencias_detalladas: List[AusenciaDetalle],
    fecha_inicio: date,
    fecha_fin: date,
    sector_id: Optional[int] = None
) -> List[RankingAusencia]:
    """Calcula ranking de colaboradores por cantidad de ausencias."""
    # Agrupar ausencias por colaborador
    ranking_dict = {}
    for ausencia in ausencias_detalladas:
        if ausencia.colaborador_id not in ranking_dict:
            ranking_dict[ausencia.colaborador_id] = {
                "nombre": ausencia.nombre_colaborador,
                "sector_id": ausencia.sector_id,
                "cantidad": 0,
                "fechas": set()
            }
        ranking_dict[ausencia.colaborador_id]["cantidad"] += 1
        ranking_dict[ausencia.colaborador_id]["fechas"].add(ausencia.fecha)

    # Calcular porcentaje
    dias_laborables = _contar_dias_laborables(fecha_inicio, fecha_fin, db)
    porcentaje_base = (100 / dias_laborables) if dias_laborables > 0 else 0

    ranking = [
        RankingAusencia(
            colaborador_id=col_id,
            nombre=data["nombre"],
            sector_id=data["sector_id"],
            cantidad_ausencias=len(data["fechas"]),
            porcentaje_semana=len(data["fechas"]) * porcentaje_base
        )
        for col_id, data in ranking_dict.items()
    ]

    # Ordenar por cantidad descendente
    ranking.sort(key=lambda x: x.cantidad_ausencias, reverse=True)
    return ranking


# ===== HELPER FUNCTIONS: FRANJAS =====

def _get_distribucion_franjas(
    db: Session,
    fecha_inicio: date,
    fecha_fin: date,
    sector_id: Optional[int] = None
) -> List[DistribucionFranjaItem]:
    """Obtiene distribución de asignaciones por franja y fecha."""
    # Query de turnos con sus asignaciones
    turnos = db.query(
        TurnoAlmuerzo.fecha,
        TurnoAlmuerzo.franja_horaria_id,
        TurnoAlmuerzo.capacidad_maxima,
        FranjaHoraria.hora_inicio,
        FranjaHoraria.hora_fin,
        FranjaHoraria.orden,
        func.count(AsignacionAlmuerzo.id).label("asignados")
    ).join(FranjaHoraria).outerjoin(
        AsignacionAlmuerzo,
        and_(
            AsignacionAlmuerzo.turno_almuerzo_id == TurnoAlmuerzo.id,
            AsignacionAlmuerzo.estado == "firme"
        )
    ).filter(
        and_(
            TurnoAlmuerzo.fecha >= fecha_inicio,
            TurnoAlmuerzo.fecha <= fecha_fin
        )
    ).group_by(
        TurnoAlmuerzo.id,
        TurnoAlmuerzo.fecha,
        TurnoAlmuerzo.franja_horaria_id,
        TurnoAlmuerzo.capacidad_maxima,
        FranjaHoraria.hora_inicio,
        FranjaHoraria.hora_fin,
        FranjaHoraria.orden
    ).all()

    distribucion = []
    for turno in turnos:
        fecha, franja_id, capacidad, hora_inicio, hora_fin, orden, asignados = turno

        # Contar ausentes en esa fecha/franja
        ausentes = db.query(func.count(Ausencia.id)).filter(
            and_(
                Ausencia.fecha == fecha,
                Ausencia.colaborador_id.in_(
                    db.query(Colaborador.id).filter(Colaborador.estado_atencion == "activo").subquery()
                )
            )
        ).scalar() or 0

        # Colaboradores activos en el sector (si se especifica)
        if sector_id is not None:
            activos = db.query(func.count(Colaborador.id)).filter(
                and_(
                    Colaborador.estado_atencion == "activo",
                    Colaborador.sector_id == sector_id
                )
            ).scalar() or 0
        else:
            activos = db.query(func.count(Colaborador.id)).filter(
                Colaborador.estado_atencion == "activo"
            ).scalar() or 0

        disponibles_backlog = max(0, activos - ausentes - (asignados or 0))

        distribucion.append(DistribucionFranjaItem(
            fecha=fecha,
            franja_id=franja_id,
            franja_nombre=f"Franja {orden}",
            hora_inicio=str(hora_inicio),
            hora_fin=str(hora_fin),
            asignados=asignados or 0,
            ausentes=ausentes,
            capacidad=capacidad,
            disponibles_backlog=disponibles_backlog
        ))

    return distribucion


def _calcular_cumplimiento_preferencias(
    db: Session,
    fecha_inicio: date,
    fecha_fin: date,
    sector_id: Optional[int] = None
) -> List[CumplimientoPreferencia]:
    """Calcula cumplimiento de preferencias de franja por colaborador."""
    query = db.query(Colaborador).filter(
        Colaborador.estado_atencion == "activo"
    )

    if sector_id is not None:
        query = query.filter(Colaborador.sector_id == sector_id)

    colaboradores = query.all()
    cumplimiento_list = []

    for col in colaboradores:
        # Total de asignaciones firmes en el período
        total_asignaciones = db.query(func.count(AsignacionAlmuerzo.id)).filter(
            and_(
                AsignacionAlmuerzo.colaborador_id == col.id,
                AsignacionAlmuerzo.estado == "firme",
                TurnoAlmuerzo.fecha >= fecha_inicio,
                TurnoAlmuerzo.fecha <= fecha_fin
            )
        ).join(TurnoAlmuerzo).scalar() or 0

        asignaciones_en_preferencia = 0
        porcentaje = 0.0

        if col.franja_preferida_id and total_asignaciones > 0:
            # Contar asignaciones en la franja preferida
            asignaciones_en_preferencia = db.query(func.count(AsignacionAlmuerzo.id)).filter(
                and_(
                    AsignacionAlmuerzo.colaborador_id == col.id,
                    AsignacionAlmuerzo.estado == "firme",
                    TurnoAlmuerzo.franja_horaria_id == col.franja_preferida_id,
                    TurnoAlmuerzo.fecha >= fecha_inicio,
                    TurnoAlmuerzo.fecha <= fecha_fin
                )
            ).join(TurnoAlmuerzo).scalar() or 0

            porcentaje = (asignaciones_en_preferencia / total_asignaciones * 100) if total_asignaciones > 0 else 0.0

        franja_pref = None
        if col.franja_preferida_id:
            franja_pref = db.query(FranjaHoraria).filter(
                FranjaHoraria.id == col.franja_preferida_id
            ).first()

        cumplimiento_list.append(CumplimientoPreferencia(
            colaborador_id=col.id,
            nombre=col.nombre,
            sector_id=col.sector_id,
            franja_preferida_id=col.franja_preferida_id,
            franja_preferida_nombre=f"Franja {franja_pref.orden}" if franja_pref else None,
            total_asignaciones=total_asignaciones,
            asignaciones_en_preferencia=asignaciones_en_preferencia,
            porcentaje_cumplimiento=porcentaje
        ))

    # Ordenar por porcentaje descendente
    cumplimiento_list.sort(key=lambda x: x.porcentaje_cumplimiento, reverse=True)
    return cumplimiento_list


def _calcular_cobertura_franjas(
    db: Session,
    fecha_inicio: date,
    fecha_fin: date
) -> List[CoberturaPorFranja]:
    """Calcula ocupación y cobertura real vs configurada por franja."""
    franjas = db.query(FranjaHoraria).order_by(FranjaHoraria.orden).all()
    cobertura_list = []

    for franja in franjas:
        # Contar turnos de esa franja en el rango
        turnos_count = db.query(func.count(TurnoAlmuerzo.id)).filter(
            and_(
                TurnoAlmuerzo.franja_horaria_id == franja.id,
                TurnoAlmuerzo.fecha >= fecha_inicio,
                TurnoAlmuerzo.fecha <= fecha_fin
            )
        ).scalar() or 0

        # Contar asignaciones en esa franja
        asignaciones_count = db.query(func.count(AsignacionAlmuerzo.id)).filter(
            and_(
                AsignacionAlmuerzo.estado == "firme",
                TurnoAlmuerzo.franja_horaria_id == franja.id,
                TurnoAlmuerzo.fecha >= fecha_inicio,
                TurnoAlmuerzo.fecha <= fecha_fin
            )
        ).join(TurnoAlmuerzo).scalar() or 0

        # Ocupación promedio
        ocupacion_promedio = 0.0
        if turnos_count > 0:
            ocupacion_promedio = asignaciones_count / turnos_count

        # Capacidad promedio
        capacidad_promedio = db.query(func.avg(TurnoAlmuerzo.capacidad_maxima)).filter(
            and_(
                TurnoAlmuerzo.franja_horaria_id == franja.id,
                TurnoAlmuerzo.fecha >= fecha_inicio,
                TurnoAlmuerzo.fecha <= fecha_fin
            )
        ).scalar() or franja.capacidad_maxima

        # Porcentaje de cobertura
        porcentaje_cobertura = 0.0
        if capacidad_promedio and turnos_count > 0:
            porcentaje_cobertura = (ocupacion_promedio / capacidad_promedio * 100) if capacidad_promedio > 0 else 0.0

        cobertura_list.append(CoberturaPorFranja(
            franja_id=franja.id,
            franja_nombre=f"Franja {franja.orden}",
            hora_inicio=str(franja.hora_inicio),
            hora_fin=str(franja.hora_fin),
            orden=franja.orden,
            ocupacion_promedio=ocupacion_promedio,
            capacidad_promedio=float(capacidad_promedio) if capacidad_promedio else 0.0,
            porcentaje_cobertura=porcentaje_cobertura
        ))

    return cobertura_list


# ===== HELPER FUNCTIONS: SWAPS =====

def _get_swaps_detallados(
    db: Session,
    fecha_inicio: date,
    fecha_fin: date,
    sector_id: Optional[int] = None
) -> List[SwapDetalle]:
    """Obtiene lista detallada de swaps en el rango."""
    query = db.query(SwapSolicitud).options(
        joinedload(SwapSolicitud.asignacion_origen)
            .joinedload(AsignacionAlmuerzo.turno_almuerzo)
            .joinedload(TurnoAlmuerzo.franja_horaria),
        joinedload(SwapSolicitud.asignacion_receptor)
            .joinedload(AsignacionAlmuerzo.turno_almuerzo)
            .joinedload(TurnoAlmuerzo.franja_horaria),
        joinedload(SwapSolicitud.colaborador_solicitante),
        joinedload(SwapSolicitud.colaborador_receptor)
    ).join(SwapSolicitud.asignacion_origen).join(AsignacionAlmuerzo.turno_almuerzo).filter(
        and_(
            TurnoAlmuerzo.fecha >= fecha_inicio,
            TurnoAlmuerzo.fecha <= fecha_fin
        )
    )

    if sector_id is not None:
        query = query.join(SwapSolicitud.colaborador_solicitante).filter(
            Colaborador.sector_id == sector_id
        )

    swaps = query.all()

    swaps_detallados = []
    now_utc = datetime.now(timezone.utc)

    for swap in swaps:
        franja_origen = swap.asignacion_origen.turno_almuerzo.franja_horaria
        franja_receptor = None
        if swap.asignacion_receptor:
            franja_receptor = swap.asignacion_receptor.turno_almuerzo.franja_horaria

        # Calcular días de antigüedad
        created_at = swap.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        dias_antiguedad = (now_utc - created_at).days

        franja_origen_str = f"{franja_origen.hora_inicio}-{franja_origen.hora_fin}"
        franja_receptor_str = f"{franja_receptor.hora_inicio}-{franja_receptor.hora_fin}" if franja_receptor else "N/A"

        swaps_detallados.append(SwapDetalle(
            id=swap.id,
            solicitante_id=swap.colaborador_solicitante_id,
            solicitante_nombre=swap.colaborador_solicitante.nombre,
            receptor_id=swap.colaborador_receptor_id,
            receptor_nombre=swap.colaborador_receptor.nombre,
            fecha=swap.asignacion_origen.turno_almuerzo.fecha,
            franja_origen=franja_origen_str,
            franja_receptor=franja_receptor_str,
            estado=swap.estado,
            motivo_rechazo=swap.motivo_rechazo,
            created_at=swap.created_at,
            dias_antiguedad=dias_antiguedad
        ))

    return swaps_detallados


def _calcular_ranking_swaps(
    db: Session,
    swaps_detallados: List[SwapDetalle]
) -> List[RankingSwapColaborador]:
    """Calcula ranking de colaboradores por actividad de swaps."""
    ranking_dict = {}

    for swap in swaps_detallados:
        # Procesar solicitante
        if swap.solicitante_id not in ranking_dict:
            col = db.query(Colaborador).filter(Colaborador.id == swap.solicitante_id).first()
            ranking_dict[swap.solicitante_id] = {
                "nombre": col.nombre,
                "sector_id": col.sector_id,
                "pendientes": 0,
                "aceptados": 0,
                "rechazados": 0
            }

        # Procesar receptor
        if swap.receptor_id not in ranking_dict:
            col = db.query(Colaborador).filter(Colaborador.id == swap.receptor_id).first()
            ranking_dict[swap.receptor_id] = {
                "nombre": col.nombre,
                "sector_id": col.sector_id,
                "pendientes": 0,
                "aceptados": 0,
                "rechazados": 0
            }

        # Contar por estado (solicitante)
        if swap.estado == "pendiente":
            ranking_dict[swap.solicitante_id]["pendientes"] += 1
        elif swap.estado == "aceptado":
            ranking_dict[swap.solicitante_id]["aceptados"] += 1
        elif swap.estado == "rechazado":
            ranking_dict[swap.solicitante_id]["rechazados"] += 1

        # Receptor también cuenta (como receptor)
        if swap.estado == "pendiente":
            ranking_dict[swap.receptor_id]["pendientes"] += 1
        elif swap.estado == "aceptado":
            ranking_dict[swap.receptor_id]["aceptados"] += 1
        elif swap.estado == "rechazado":
            ranking_dict[swap.receptor_id]["rechazados"] += 1

    ranking_list = [
        RankingSwapColaborador(
            colaborador_id=col_id,
            nombre=data["nombre"],
            sector_id=data["sector_id"],
            swaps_pendientes=data["pendientes"],
            swaps_aceptados=data["aceptados"],
            swaps_rechazados=data["rechazados"],
            total=data["pendientes"] + data["aceptados"] + data["rechazados"]
        )
        for col_id, data in ranking_dict.items()
    ]

    # Ordenar por total descendente
    ranking_list.sort(key=lambda x: x.total, reverse=True)
    return ranking_list


# ===== ENDPOINTS: AUSENCIAS =====

@router.get("/ausencias", response_model=ResumenAusencias)
def reportes_ausencias(
    fecha_inicio: date,
    fecha_fin: date,
    sector_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user)
):
    """Reporte de ausencias con ranking y detalle."""
    if fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fecha_inicio debe ser menor o igual a fecha_fin"
        )

    ausencias = _get_ausencias_detalladas(db, fecha_inicio, fecha_fin, sector_id)
    ranking = _calcular_ranking_ausencias(db, ausencias, fecha_inicio, fecha_fin, sector_id)

    logger.info(f"Reporte ausencias generado: {fecha_inicio} - {fecha_fin}, sector={sector_id}, registros={len(ausencias)}")

    return ResumenAusencias(
        ranking=ranking,
        detalle=ausencias,
        total_registros=len(ausencias),
        periodo={"fecha_inicio": str(fecha_inicio), "fecha_fin": str(fecha_fin)}
    )


# ===== ENDPOINTS: FRANJAS =====

@router.get("/franjas", response_model=ResumenFranjas)
def reportes_franjas(
    fecha_inicio: date,
    fecha_fin: date,
    sector_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user)
):
    """Reporte de distribución de franjas, preferencias y cobertura."""
    if fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fecha_inicio debe ser menor o igual a fecha_fin"
        )

    distribucion = _get_distribucion_franjas(db, fecha_inicio, fecha_fin, sector_id)
    preferencias = _calcular_cumplimiento_preferencias(db, fecha_inicio, fecha_fin, sector_id)
    cobertura = _calcular_cobertura_franjas(db, fecha_inicio, fecha_fin)

    logger.info(f"Reporte franjas generado: {fecha_inicio} - {fecha_fin}, sector={sector_id}")

    return ResumenFranjas(
        distribucion=distribucion,
        cumplimiento_preferencias=preferencias,
        cobertura_real=cobertura,
        periodo={"fecha_inicio": str(fecha_inicio), "fecha_fin": str(fecha_fin)}
    )


# ===== ENDPOINTS: SWAPS =====

@router.get("/swaps", response_model=ResumenSwaps)
def reportes_swaps(
    fecha_inicio: date,
    fecha_fin: date,
    sector_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user)
):
    """Reporte de swaps con ranking y detalle."""
    if fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fecha_inicio debe ser menor o igual a fecha_fin"
        )

    swaps = _get_swaps_detallados(db, fecha_inicio, fecha_fin, sector_id)
    ranking = _calcular_ranking_swaps(db, swaps)

    # Calcular estadísticas
    total_pendientes = sum(1 for s in swaps if s.estado == "pendiente")
    total_aceptados = sum(1 for s in swaps if s.estado == "aceptado")
    total_rechazados = sum(1 for s in swaps if s.estado == "rechazado")

    estadisticas = EstadisticasSwaps(
        total_pendientes=total_pendientes,
        total_aceptados=total_aceptados,
        total_rechazados=total_rechazados,
        total_general=len(swaps)
    )

    logger.info(f"Reporte swaps generado: {fecha_inicio} - {fecha_fin}, sector={sector_id}, swaps={len(swaps)}")

    return ResumenSwaps(
        ranking=ranking,
        detalle=swaps,
        estadisticas=estadisticas,
        periodo={"fecha_inicio": str(fecha_inicio), "fecha_fin": str(fecha_fin)}
    )


# ===== EXPORTACIÓN CSV =====

def _serialize_ausencias_to_csv(
    ausencias: List[AusenciaDetalle],
    ranking: List[RankingAusencia]
) -> str:
    """Serializa datos de ausencias a formato CSV."""
    output = StringIO()
    writer = csv.writer(output)

    # Sección de ranking
    writer.writerow(["RANKING DE AUSENCIAS"])
    writer.writerow(["Colaborador", "Sector ID", "Cantidad Ausencias", "Porcentaje (%)", ""])
    for item in ranking:
        writer.writerow([
            item.nombre,
            item.sector_id,
            item.cantidad_ausencias,
            f"{item.porcentaje_semana:.2f}"
        ])

    writer.writerow([])

    # Sección de detalle
    writer.writerow(["DETALLE DE AUSENCIAS"])
    writer.writerow(["Colaborador", "Fecha", "Motivo", "Sector ID", "Creado"])
    for item in ausencias:
        writer.writerow([
            item.nombre_colaborador,
            item.fecha,
            item.motivo,
            item.sector_id,
            item.created_at.strftime("%Y-%m-%d %H:%M:%S")
        ])

    return output.getvalue()


def _serialize_franjas_to_csv(
    distribucion: List[DistribucionFranjaItem],
    cumplimiento: List[CumplimientoPreferencia],
    cobertura: List[CoberturaPorFranja]
) -> str:
    """Serializa datos de franjas a formato CSV."""
    output = StringIO()
    writer = csv.writer(output)

    # Sección de distribución
    writer.writerow(["DISTRIBUCIÓN DE FRANJAS"])
    writer.writerow(["Fecha", "Franja", "Hora Inicio", "Hora Fin", "Asignados", "Ausentes", "Capacidad", "Disponibles"])
    for item in distribucion:
        writer.writerow([
            item.fecha,
            item.franja_nombre,
            item.hora_inicio,
            item.hora_fin,
            item.asignados,
            item.ausentes,
            item.capacidad,
            item.disponibles_backlog
        ])

    writer.writerow([])

    # Sección de cumplimiento
    writer.writerow(["CUMPLIMIENTO DE PREFERENCIAS"])
    writer.writerow(["Colaborador", "Franja Preferida", "Total Asignaciones", "En Preferencia", "Cumplimiento (%)"])
    for item in cumplimiento:
        writer.writerow([
            item.nombre,
            item.franja_preferida_nombre or "N/A",
            item.total_asignaciones,
            item.asignaciones_en_preferencia,
            f"{item.porcentaje_cumplimiento:.2f}"
        ])

    writer.writerow([])

    # Sección de cobertura
    writer.writerow(["COBERTURA POR FRANJA"])
    writer.writerow(["Franja", "Hora Inicio", "Hora Fin", "Ocupación Promedio", "Capacidad Promedio", "Cobertura (%)"])
    for item in cobertura:
        writer.writerow([
            item.franja_nombre,
            item.hora_inicio,
            item.hora_fin,
            f"{item.ocupacion_promedio:.2f}",
            f"{item.capacidad_promedio:.2f}",
            f"{item.porcentaje_cobertura:.2f}"
        ])

    return output.getvalue()


def _serialize_swaps_to_csv(
    swaps: List[SwapDetalle],
    ranking: List[RankingSwapColaborador],
    estadisticas: EstadisticasSwaps
) -> str:
    """Serializa datos de swaps a formato CSV."""
    output = StringIO()
    writer = csv.writer(output)

    # Sección de estadísticas
    writer.writerow(["ESTADÍSTICAS DE SWAPS"])
    writer.writerow(["Pendientes", "Aceptados", "Rechazados", "Total"])
    writer.writerow([
        estadisticas.total_pendientes,
        estadisticas.total_aceptados,
        estadisticas.total_rechazados,
        estadisticas.total_general
    ])

    writer.writerow([])

    # Sección de ranking
    writer.writerow(["RANKING POR COLABORADOR"])
    writer.writerow(["Colaborador", "Pendientes", "Aceptados", "Rechazados", "Total"])
    for item in ranking:
        writer.writerow([
            item.nombre,
            item.swaps_pendientes,
            item.swaps_aceptados,
            item.swaps_rechazados,
            item.total
        ])

    writer.writerow([])

    # Sección de detalle
    writer.writerow(["DETALLE DE SWAPS"])
    writer.writerow(["Solicitante", "Receptor", "Fecha", "Franja Origen", "Franja Receptor", "Estado", "Antigüedad (días)"])
    for item in swaps:
        writer.writerow([
            item.solicitante_nombre,
            item.receptor_nombre,
            item.fecha,
            item.franja_origen,
            item.franja_receptor,
            item.estado,
            item.dias_antiguedad
        ])

    return output.getvalue()


@router.get("/export/csv")
def export_csv(
    seccion: str,
    fecha_inicio: date,
    fecha_fin: date,
    sector_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user)
):
    """Exporta reporte activo en formato CSV."""
    if seccion not in ["ausencias", "franjas", "swaps"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="seccion debe ser: ausencias, franjas o swaps"
        )

    if fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fecha_inicio debe ser menor o igual a fecha_fin"
        )

    if seccion == "ausencias":
        ausencias = _get_ausencias_detalladas(db, fecha_inicio, fecha_fin, sector_id)
        ranking = _calcular_ranking_ausencias(db, ausencias, fecha_inicio, fecha_fin, sector_id)
        csv_content = _serialize_ausencias_to_csv(ausencias, ranking)
    elif seccion == "franjas":
        distribucion = _get_distribucion_franjas(db, fecha_inicio, fecha_fin, sector_id)
        cumplimiento = _calcular_cumplimiento_preferencias(db, fecha_inicio, fecha_fin, sector_id)
        cobertura = _calcular_cobertura_franjas(db, fecha_inicio, fecha_fin)
        csv_content = _serialize_franjas_to_csv(distribucion, cumplimiento, cobertura)
    else:  # swaps
        swaps = _get_swaps_detallados(db, fecha_inicio, fecha_fin, sector_id)
        ranking = _calcular_ranking_swaps(db, swaps)
        total_pendientes = sum(1 for s in swaps if s.estado == "pendiente")
        total_aceptados = sum(1 for s in swaps if s.estado == "aceptado")
        total_rechazados = sum(1 for s in swaps if s.estado == "rechazado")
        estadisticas = EstadisticasSwaps(
            total_pendientes=total_pendientes,
            total_aceptados=total_aceptados,
            total_rechazados=total_rechazados,
            total_general=len(swaps)
        )
        csv_content = _serialize_swaps_to_csv(swaps, ranking, estadisticas)

    filename = f"reporte_{seccion}_{fecha_inicio}_{fecha_fin}.csv"
    logger.info(f"CSV exportado: {filename}")

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ===== EXPORTACIÓN PDF =====

def _generar_html_reporte(
    titulo: str,
    secciones: Dict[str, str]
) -> str:
    """Genera HTML para exportación PDF."""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{titulo}</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #333;
            }}
            h1 {{
                color: #2c3e50;
                border-bottom: 3px solid #3498db;
                padding-bottom: 10px;
            }}
            h2 {{
                color: #34495e;
                margin-top: 30px;
                margin-bottom: 15px;
                font-size: 18px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }}
            th {{
                background-color: #3498db;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: bold;
            }}
            td {{
                padding: 10px;
                border-bottom: 1px solid #ddd;
            }}
            tr:nth-child(even) {{
                background-color: #f9f9f9;
            }}
            .footer {{
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
            }}
            .metadata {{
                background-color: #ecf0f1;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 20px;
                font-size: 13px;
            }}
        </style>
    </head>
    <body>
        <h1>{titulo}</h1>
        <div class="metadata">
            <p><strong>Generado:</strong> {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}</p>
        </div>
    """

    for seccion_titulo, seccion_html in secciones.items():
        html += f"<h2>{seccion_titulo}</h2>\n{seccion_html}\n"

    html += """
        <div class="footer">
            <p>Este reporte fue generado automáticamente por el sistema de gestión de turnos de almuerzo.</p>
        </div>
    </body>
    </html>
    """

    return html


def _render_table_html(headers: List[str], rows: List[List[str]]) -> str:
    """Renderiza tabla HTML a partir de headers y filas."""
    html = "<table><thead><tr>"
    for header in headers:
        html += f"<th>{header}</th>"
    html += "</tr></thead><tbody>"
    for row in rows:
        html += "<tr>"
        for cell in row:
            html += f"<td>{cell}</td>"
        html += "</tr>"
    html += "</tbody></table>"
    return html


@router.get("/export/pdf")
def export_pdf(
    seccion: str,
    fecha_inicio: date,
    fecha_fin: date,
    sector_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user)
):
    """Exporta reporte activo en formato PDF."""
    try:
        from weasyprint import HTML, CSS
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="WeasyPrint no está instalado. Instala con: pip install WeasyPrint"
        )

    if seccion not in ["ausencias", "franjas", "swaps"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="seccion debe ser: ausencias, franjas o swaps"
        )

    if fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fecha_inicio debe ser menor o igual a fecha_fin"
        )

    titulo = f"Reporte de {seccion.capitalize()}: {fecha_inicio} - {fecha_fin}"
    secciones = {}

    if seccion == "ausencias":
        ausencias = _get_ausencias_detalladas(db, fecha_inicio, fecha_fin, sector_id)
        ranking = _calcular_ranking_ausencias(db, ausencias, fecha_inicio, fecha_fin, sector_id)

        ranking_rows = [
            [item.nombre, str(item.sector_id), str(item.cantidad_ausencias), f"{item.porcentaje_semana:.2f}%"]
            for item in ranking
        ]
        secciones["Ranking de Ausencias"] = _render_table_html(
            ["Colaborador", "Sector ID", "Cantidad", "Porcentaje"],
            ranking_rows
        )

        detalle_rows = [
            [item.nombre_colaborador, str(item.fecha), item.motivo, str(item.sector_id)]
            for item in ausencias
        ]
        secciones["Detalle de Ausencias"] = _render_table_html(
            ["Colaborador", "Fecha", "Motivo", "Sector ID"],
            detalle_rows
        )

    elif seccion == "franjas":
        distribucion = _get_distribucion_franjas(db, fecha_inicio, fecha_fin, sector_id)
        cumplimiento = _calcular_cumplimiento_preferencias(db, fecha_inicio, fecha_fin, sector_id)
        cobertura = _calcular_cobertura_franjas(db, fecha_inicio, fecha_fin)

        dist_rows = [
            [str(item.fecha), item.franja_nombre, item.hora_inicio, item.hora_fin, str(item.asignados), str(item.ausentes)]
            for item in distribucion[:20]  # Limitar a 20 filas para PDF
        ]
        secciones["Distribución de Franjas"] = _render_table_html(
            ["Fecha", "Franja", "Hora Inicio", "Hora Fin", "Asignados", "Ausentes"],
            dist_rows
        )

        cum_rows = [
            [item.nombre, item.franja_preferida_nombre or "N/A", str(item.total_asignaciones), f"{item.porcentaje_cumplimiento:.2f}%"]
            for item in cumplimiento[:20]
        ]
        secciones["Cumplimiento de Preferencias"] = _render_table_html(
            ["Colaborador", "Franja Preferida", "Total", "Cumplimiento"],
            cum_rows
        )

        cob_rows = [
            [item.franja_nombre, item.hora_inicio, item.hora_fin, f"{item.ocupacion_promedio:.2f}", f"{item.porcentaje_cobertura:.2f}%"]
            for item in cobertura
        ]
        secciones["Cobertura por Franja"] = _render_table_html(
            ["Franja", "Hora Inicio", "Hora Fin", "Ocupación", "Cobertura"],
            cob_rows
        )

    else:  # swaps
        swaps = _get_swaps_detallados(db, fecha_inicio, fecha_fin, sector_id)
        ranking = _calcular_ranking_swaps(db, swaps)

        total_pendientes = sum(1 for s in swaps if s.estado == "pendiente")
        total_aceptados = sum(1 for s in swaps if s.estado == "aceptado")
        total_rechazados = sum(1 for s in swaps if s.estado == "rechazado")

        stats_rows = [
            [str(total_pendientes), str(total_aceptados), str(total_rechazados), str(len(swaps))]
        ]
        secciones["Estadísticas"] = _render_table_html(
            ["Pendientes", "Aceptados", "Rechazados", "Total"],
            stats_rows
        )

        rank_rows = [
            [item.nombre, str(item.swaps_pendientes), str(item.swaps_aceptados), str(item.swaps_rechazados), str(item.total)]
            for item in ranking[:20]
        ]
        secciones["Ranking por Colaborador"] = _render_table_html(
            ["Colaborador", "Pendientes", "Aceptados", "Rechazados", "Total"],
            rank_rows
        )

        det_rows = [
            [item.solicitante_nombre, item.receptor_nombre, str(item.fecha), item.franja_origen, item.estado]
            for item in swaps[:20]
        ]
        secciones["Detalle de Swaps"] = _render_table_html(
            ["Solicitante", "Receptor", "Fecha", "Franja", "Estado"],
            det_rows
        )

    html_content = _generar_html_reporte(titulo, secciones)

    try:
        pdf_bytes = HTML(string=html_content).write_pdf()
    except Exception as e:
        logger.error(f"Error rendering PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar PDF: {str(e)}"
        )

    filename = f"reporte_{seccion}_{fecha_inicio}_{fecha_fin}.pdf"
    logger.info(f"PDF exportado: {filename}")

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
