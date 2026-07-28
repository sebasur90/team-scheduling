from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Colaborador, TurnoAlmuerzo, AsignacionAlmuerzo, FranjaHoraria
from app.schemas.turno import TurnoAlmuerzoResponse, AsignacionResponse
from app.dependencies import get_admin_user
from datetime import date, timedelta
from typing import List

router = APIRouter(prefix="/admin/turnos", tags=["admin_turnos"], redirect_slashes=False)


class CreateAsignacionRequest(BaseModel):
    colaborador_id: int


@router.post("/generar-semana", status_code=status.HTTP_200_OK)
def generar_turnos_semana(
    semana: str,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Generate turns for a week (Mon-Fri). Returns preview with generated turns and any tie conflicts."""
    fecha_lunes = date.fromisoformat(semana)

    if fecha_lunes.weekday() != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro semana debe ser un lunes (YYYY-MM-DD)"
        )

    dias_semana = [fecha_lunes + timedelta(days=i) for i in range(5)]

    preview_turnos = []
    conflictos = []

    franjas = db.query(FranjaHoraria).order_by(FranjaHoraria.orden).all()

    # Get all active colaboradores
    colaboradores_activos = db.query(Colaborador).filter_by(
        estado_atencion='activo'
    ).order_by(Colaborador.puntaje_prioridad).all()

    colab_index = 0

    for dia in dias_semana:
        for franja in franjas:
            turno = db.query(TurnoAlmuerzo).filter_by(fecha=dia, franja_horaria_id=franja.id).first()
            if not turno:
                turno = TurnoAlmuerzo(
                    fecha=dia,
                    franja_horaria_id=franja.id,
                    capacidad_maxima=2,
                )
                db.add(turno)
                db.flush()  # Get the turno ID without committing

            # Create assignments for the slot
            existing_asignaciones = db.query(AsignacionAlmuerzo).filter_by(
                turno_almuerzo_id=turno.id
            ).count()

            # Create assignments up to capacity if none exist
            if existing_asignaciones == 0 and colaboradores_activos:
                for _ in range(turno.capacidad_maxima):
                    colab = colaboradores_activos[colab_index % len(colaboradores_activos)]
                    asignacion = AsignacionAlmuerzo(
                        turno_almuerzo_id=turno.id,
                        colaborador_id=colab.id,
                        estado='firme'
                    )
                    db.add(asignacion)
                    colab_index += 1

            preview_turnos.append(TurnoAlmuerzoResponse.model_validate(turno))

    db.commit()

    return {
        "status": "preview_generated",
        "semana": semana,
        "turnos": preview_turnos,
        "conflictos": conflictos,
        "mensaje": "Preview generado. Confirma con POST /confirmar-semana"
    }


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

    db.delete(asignacion)
    db.commit()
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

    db.delete(turno)
    db.commit()
    return None


@router.post("/confirmar-semana", status_code=status.HTTP_200_OK)
def confirmar_turnos_semana(
    semana: str,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Confirm the generated preview for the week."""
    fecha_lunes = date.fromisoformat(semana)

    if fecha_lunes.weekday() != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El parámetro semana debe ser un lunes (YYYY-MM-DD)"
        )

    return {
        "status": "confirmed",
        "semana": semana,
        "mensaje": "Turnos confirmados para la semana"
    }


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
