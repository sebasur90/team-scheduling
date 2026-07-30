from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Colaborador, TurnoAlmuerzo, AsignacionAlmuerzo, FranjaHoraria, DiaNoLaborable
from app.schemas.turno import TurnoAlmuerzoResponse, AsignacionResponse
from app.dependencies import get_admin_user
from app.core.engine import AssignmentEngine
from app.core.notificador import notificar_franja_liberada
from datetime import date, timedelta
from typing import List, Dict, Any

router = APIRouter(prefix="/admin/turnos", tags=["admin_turnos"], redirect_slashes=False)


class CreateAsignacionRequest(BaseModel):
    colaborador_id: int


class GenerateDayRequest(BaseModel):
    fecha: str


@router.post("/generar-semana", status_code=status.HTTP_200_OK)
def generar_turnos_semana(
    semana: str,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """
    Generate turns for a week (Mon-Fri) using the AssignmentEngine.
    Respects coverage, preferences, and slot rotation.
    Skips non-working days and cleans orphaned shifts.
    """
    fecha_lunes = date.fromisoformat(semana)

    if fecha_lunes.weekday() != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro semana debe ser un lunes (YYYY-MM-DD)"
        )

    dias_semana = [fecha_lunes + timedelta(days=i) for i in range(5)]

    turnos_generados = []
    dias_salteados = []
    dias_con_error = []
    dias_con_advertencia = []
    conflictos = []

    for fecha in dias_semana:
        # Check if this is a non-working day
        dia_no_laborable = db.query(DiaNoLaborable).filter_by(fecha=fecha).first()

        if dia_no_laborable:
            # Clean up any existing turnos for this date
            _clean_orphaned_shifts(db, fecha)

            dias_salteados.append({
                "fecha": fecha.isoformat(),
                "motivo": dia_no_laborable.motivo
            })
            continue

        # Run the assignment engine for this day
        engine = AssignmentEngine(db, fecha)
        result = engine.run()

        if not result.success:
            dias_con_error.append({
                "fecha": fecha.isoformat(),
                "error": result.error
            })
            continue

        # Persist the day's assignments (success with or without warnings)
        try:
            _persist_day_assignments(db, fecha, result.cronograma, result.puntajes_actualizados)

            # Track warnings if any
            if result.advertencias:
                dias_con_advertencia.append({
                    "fecha": fecha.isoformat(),
                    "advertencias": result.advertencias
                })

            # Build response with turnos for this day
            turnos_dia = db.query(TurnoAlmuerzo).filter_by(fecha=fecha).all()
            for turno in turnos_dia:
                turnos_generados.append(TurnoAlmuerzoResponse.model_validate(turno))

        except Exception as e:
            dias_con_error.append({
                "fecha": fecha.isoformat(),
                "error": f"Error persisting assignments: {str(e)}"
            })
            continue

    db.commit()

    return {
        "status": "generado",
        "semana": semana,
        "turnos_generados": turnos_generados,
        "conflictos": conflictos,
        "dias_salteados": dias_salteados,
        "dias_con_advertencia": dias_con_advertencia,
        "dias_con_error": dias_con_error,
        "mensaje": f"Semana generada. {len(dias_salteados)} día(s) salteado(s), {len(dias_con_advertencia)} con advertencia(s), {len(dias_con_error)} error(es)."
    }


@router.post("/generate-day", status_code=status.HTTP_200_OK)
def generar_turnos_dia(
    request: GenerateDayRequest,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """
    Generate turns for a specific day using the AssignmentEngine.
    Respects coverage, preferences, and slot rotation.
    Skips non-working days and cleans orphaned shifts.
    """
    fecha = date.fromisoformat(request.fecha)

    turnos_generados = []
    dias_salteados = []
    dias_con_error = []
    dias_con_advertencia = []
    conflictos = []

    # Check if this is a non-working day
    dia_no_laborable = db.query(DiaNoLaborable).filter_by(fecha=fecha).first()

    if dia_no_laborable:
        # Clean up any existing turnos for this date
        _clean_orphaned_shifts(db, fecha)

        dias_salteados.append({
            "fecha": fecha.isoformat(),
            "motivo": dia_no_laborable.motivo
        })
    else:
        # Run the assignment engine for this day
        engine = AssignmentEngine(db, fecha)
        result = engine.run()

        if not result.success:
            dias_con_error.append({
                "fecha": fecha.isoformat(),
                "error": result.error
            })
        else:
            # Persist the day's assignments (success with or without warnings)
            try:
                _persist_day_assignments(db, fecha, result.cronograma, result.puntajes_actualizados)

                # Track warnings if any
                if result.advertencias:
                    dias_con_advertencia.append({
                        "fecha": fecha.isoformat(),
                        "advertencias": result.advertencias
                    })

                # Build response with turnos for this day
                turnos_dia = db.query(TurnoAlmuerzo).filter_by(fecha=fecha).all()
                for turno in turnos_dia:
                    turnos_generados.append(TurnoAlmuerzoResponse.model_validate(turno))

            except Exception as e:
                dias_con_error.append({
                    "fecha": fecha.isoformat(),
                    "error": f"Error persisting assignments: {str(e)}"
                })

    db.commit()

    return {
        "status": "generado",
        "fecha": request.fecha,
        "turnos_generados": turnos_generados,
        "conflictos": conflictos,
        "dias_salteados": dias_salteados,
        "dias_con_advertencia": dias_con_advertencia,
        "dias_con_error": dias_con_error,
        "mensaje": f"Día generado. {len(dias_salteados)} día(s) salteado(s), {len(dias_con_advertencia)} con advertencia(s), {len(dias_con_error)} error(es)."
    }


@router.post("/confirmar-semana", status_code=status.HTTP_200_OK)
def confirmar_turnos_semana(
    semana: str,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Confirm and verify that a week's turnos have been persisted."""
    fecha_lunes = date.fromisoformat(semana)

    if fecha_lunes.weekday() != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro semana debe ser un lunes (YYYY-MM-DD)"
        )

    dias_semana = [fecha_lunes + timedelta(days=i) for i in range(5)]
    turnos_confirmados = []

    for fecha in dias_semana:
        # Check if this is a non-working day
        dia_no_laborable = db.query(DiaNoLaborable).filter_by(fecha=fecha).first()

        if dia_no_laborable:
            continue

        # Get all turnos for this day
        turnos = db.query(TurnoAlmuerzo).filter_by(fecha=fecha).all()
        for turno in turnos:
            turnos_confirmados.append(TurnoAlmuerzoResponse.model_validate(turno))

    return {
        "status": "confirmado",
        "semana": semana,
        "turnos_confirmados": turnos_confirmados,
        "mensaje": f"Semana {semana} confirmada con {len(turnos_confirmados)} turnos."
    }


def _clean_orphaned_shifts(db: Session, fecha: date) -> None:
    """Delete all TurnoAlmuerzo for a given fecha (cascades to AsignacionAlmuerzo)."""
    turnos_existentes = db.query(TurnoAlmuerzo).filter_by(fecha=fecha).all()
    for turno in turnos_existentes:
        db.delete(turno)


def _persist_day_assignments(
    db: Session,
    fecha: date,
    cronograma: Dict[int, List[int]],
    puntajes_actualizados: Dict[int, int],
) -> None:
    """
    Persist a day's assignments from the engine.

    Args:
        db: Database session
        fecha: Date to persist assignments for
        cronograma: Dict mapping franja_orden (int) -> [colaborador_ids]
        puntajes_actualizados: Dict mapping colaborador_id -> new puntaje
    """
    # Get all franjas to map orden to franja_id and capacidad
    franjas = db.query(FranjaHoraria).all()
    franja_map = {f.orden - 1: f.id for f in franjas}  # Convert orden to 0-based index
    franja_capacity_map = {f.orden - 1: f.capacidad_maxima for f in franjas}

    # Clean any existing turnos for this date (in case of re-generation)
    _clean_orphaned_shifts(db, fecha)

    # Create turnos and assignments from cronograma
    for franja_orden, colaborador_ids in cronograma.items():
        if franja_orden not in franja_map:
            continue

        franja_id = franja_map[franja_orden]
        capacidad = franja_capacity_map.get(franja_orden, 2)

        # Create turno
        turno = TurnoAlmuerzo(
            fecha=fecha,
            franja_horaria_id=franja_id,
            capacidad_maxima=capacidad,
        )
        db.add(turno)
        db.flush()

        # Create assignments for this turno
        for colaborador_id in colaborador_ids:
            asignacion = AsignacionAlmuerzo(
                turno_almuerzo_id=turno.id,
                colaborador_id=colaborador_id,
                estado='firme'
            )
            db.add(asignacion)

    # Update puntajes for affected colaboradores
    for colaborador_id, nuevo_puntaje in puntajes_actualizados.items():
        colaborador = db.query(Colaborador).filter_by(id=colaborador_id).first()
        if colaborador:
            colaborador.puntaje_prioridad = nuevo_puntaje


@router.post("/{turno_id}/asignaciones", status_code=status.HTTP_201_CREATED, response_model=AsignacionResponse)
def create_asignacion(
    turno_id: int,
    request: CreateAsignacionRequest,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Create a new assignment for a shift."""
    turno = db.query(TurnoAlmuerzo).filter_by(id=turno_id).first()
    if not turno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turno {turno_id} no encontrado"
        )

    if len(turno.asignaciones) >= turno.capacidad_maxima:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El turno ya alcanzó su capacidad máxima"
        )

    colaborador = db.query(Colaborador).filter_by(id=request.colaborador_id).first()
    if not colaborador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Colaborador {request.colaborador_id} no encontrado"
        )

    asignacion = AsignacionAlmuerzo(
        turno_almuerzo_id=turno_id,
        colaborador_id=request.colaborador_id,
        estado='firme'
    )
    db.add(asignacion)
    db.commit()
    db.refresh(asignacion)

    return AsignacionResponse.model_validate(asignacion)


@router.delete("/asignaciones/{asignacion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asignacion(
    asignacion_id: int,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Delete an individual assignment."""
    asignacion = db.query(AsignacionAlmuerzo).filter_by(id=asignacion_id).first()
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asignación {asignacion_id} no encontrada"
        )

    fecha = asignacion.turno_almuerzo.fecha
    franja_horaria_id = asignacion.turno_almuerzo.franja_horaria_id

    db.delete(asignacion)
    db.commit()

    # Trigger notification for eligible candidates
    notificar_franja_liberada(db, fecha, franja_horaria_id)

    return None


@router.delete("/{turno_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_turno(
    turno_id: int,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Delete an entire shift with cascade to its assignments."""
    turno = db.query(TurnoAlmuerzo).filter_by(id=turno_id).first()
    if not turno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turno {turno_id} no encontrado"
        )

    fecha = turno.fecha
    franja_horaria_id = turno.franja_horaria_id

    db.delete(turno)
    db.commit()

    # Trigger notification for eligible candidates
    notificar_franja_liberada(db, fecha, franja_horaria_id)

    return None


@router.patch("/asignaciones/{asignacion_id}", status_code=status.HTTP_200_OK)
def override_asignacion(
    asignacion_id: int,
    colaborador_id: int,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Override a specific assignment (change assigned collaborator to a slot on a specific day)."""
    asignacion = db.query(AsignacionAlmuerzo).filter_by(id=asignacion_id).first()
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asignación {asignacion_id} no encontrada"
        )

    asignacion.colaborador_id = colaborador_id
    db.commit()
    db.refresh(asignacion)

    return {"status": "updated", "asignacion_id": asignacion_id}
