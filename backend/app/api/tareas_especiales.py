from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app.database import get_db
from app.models import TareaEspecialTipo, ColaboradorTareaTipo, Colaborador, TareaEspecialAsignacion, AsignacionAlmuerzo, TurnoAlmuerzo
from app.schemas.tarea_especial import (
    TareaEspecialTipoResponse,
    TareaEspecialTipoCreate,
    TareaEspecialTipoUpdate,
    GenerarCronogramaRequest,
    GenerarCronogramaResponse,
    TareaEspecialAsignacionResponse,
    SwapAsignacionRequest,
    MiTareaResponse,
)
from app.dependencies import get_admin_user, get_current_user
from app.core.task_rotation_engine import TaskRotationEngine
from app.core.notificador import notificar_franja_liberada, _should_send_push
from app.models import Notificacion

router = APIRouter(prefix="/tareas-especiales", tags=["tareas-especiales"], redirect_slashes=False)


@router.get("/tipos", response_model=List[TareaEspecialTipoResponse])
@router.get("/tipos/", response_model=List[TareaEspecialTipoResponse])
def list_tipos(
    db: Session = Depends(get_db),
    _: Colaborador = Depends(get_current_user),
):
    """Get all special task types (autenticado)"""
    tipos = db.query(TareaEspecialTipo).order_by(TareaEspecialTipo.id).all()
    return [TareaEspecialTipoResponse.model_validate(t) for t in tipos]


@router.post("/tipos", response_model=TareaEspecialTipoResponse, status_code=status.HTTP_201_CREATED)
@router.post("/tipos/", response_model=TareaEspecialTipoResponse, status_code=status.HTTP_201_CREATED)
def create_tipo(
    data: TareaEspecialTipoCreate,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Create a new special task type (admin only)"""
    existing = db.query(TareaEspecialTipo).filter_by(nombre=data.nombre).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tipo de tarea '{data.nombre}' ya existe"
        )

    tipo = TareaEspecialTipo(
        nombre=data.nombre,
        dia_semana_aplicable=data.dia_semana_aplicable,
        hora_inicio=data.hora_inicio,
        hora_fin=data.hora_fin,
        frecuencia=data.frecuencia,
        inhabilita_almuerzo=data.inhabilita_almuerzo,
        fecha_inicio_ciclo=data.fecha_inicio_ciclo,
        fija_almuerzo=data.fija_almuerzo,
        franja_almuerzo_id=data.franja_almuerzo_id,
        configuracion_rotacion=(
            data.configuracion_rotacion.model_dump()
            if data.configuracion_rotacion else None
        ),
    )
    db.add(tipo)
    db.commit()
    db.refresh(tipo)
    return TareaEspecialTipoResponse.model_validate(tipo)


@router.put("/tipos/{tipo_id}", response_model=TareaEspecialTipoResponse)
def update_tipo(
    tipo_id: int,
    data: TareaEspecialTipoUpdate,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Update a special task type (admin only)"""
    tipo = db.query(TareaEspecialTipo).filter_by(id=tipo_id).first()
    if not tipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tipo de tarea {tipo_id} no encontrado"
        )

    if data.nombre is not None:
        existing = db.query(TareaEspecialTipo).filter(
            TareaEspecialTipo.nombre == data.nombre,
            TareaEspecialTipo.id != tipo_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tipo de tarea '{data.nombre}' ya existe"
            )
        tipo.nombre = data.nombre

    if data.dia_semana_aplicable is not None:
        tipo.dia_semana_aplicable = data.dia_semana_aplicable
    if data.hora_inicio is not None:
        tipo.hora_inicio = data.hora_inicio
    if data.hora_fin is not None:
        tipo.hora_fin = data.hora_fin
    if data.frecuencia is not None:
        tipo.frecuencia = data.frecuencia
    if data.inhabilita_almuerzo is not None:
        tipo.inhabilita_almuerzo = data.inhabilita_almuerzo
    if data.fecha_inicio_ciclo is not None:
        tipo.fecha_inicio_ciclo = data.fecha_inicio_ciclo
    if data.fija_almuerzo is not None:
        tipo.fija_almuerzo = data.fija_almuerzo
    if data.franja_almuerzo_id is not None:
        tipo.franja_almuerzo_id = data.franja_almuerzo_id

    # Handle configuracion_rotacion with model_fields_set to distinguish null from unset
    if 'configuracion_rotacion' in data.model_fields_set:
        tipo.configuracion_rotacion = (
            data.configuracion_rotacion.model_dump()
            if data.configuracion_rotacion else None
        )

    db.commit()
    db.refresh(tipo)
    return TareaEspecialTipoResponse.model_validate(tipo)


@router.delete("/tipos/{tipo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tipo(
    tipo_id: int,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Delete a special task type (admin only). Returns 409 if it has active assignments."""
    tipo = db.query(TareaEspecialTipo).filter_by(id=tipo_id).first()
    if not tipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tipo de tarea {tipo_id} no encontrado"
        )

    has_assignments = db.query(ColaboradorTareaTipo).filter_by(tarea_tipo_id=tipo_id).first()
    if has_assignments:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar un tipo de tarea con asignaciones activas"
        )

    db.delete(tipo)
    db.commit()


@router.post("/generar-cronograma", response_model=GenerarCronogramaResponse)
def generar_cronograma(
    data: GenerarCronogramaRequest,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Generate task assignments for a date range (admin only)"""
    result = TaskRotationEngine.generar(db, data.fecha_inicio, data.fecha_fin, data.tipo_ids)
    return GenerarCronogramaResponse(**result)


@router.get("/cronograma", response_model=List[TareaEspecialAsignacionResponse])
def get_cronograma(
    fecha_inicio: date,
    fecha_fin: date,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Get task assignments for a date range (admin only)"""
    asignaciones = (
        db.query(
            TareaEspecialAsignacion.id,
            TareaEspecialAsignacion.fecha,
            TareaEspecialAsignacion.tarea_especial_tipo_id,
            TareaEspecialAsignacion.colaborador_id,
            TareaEspecialTipo.nombre.label('tipo_nombre'),
            Colaborador.nombre.label('colaborador_nombre'),
        )
        .join(TareaEspecialTipo, TareaEspecialAsignacion.tarea_especial_tipo_id == TareaEspecialTipo.id)
        .join(Colaborador, TareaEspecialAsignacion.colaborador_id == Colaborador.id)
        .filter(
            TareaEspecialAsignacion.fecha >= fecha_inicio,
            TareaEspecialAsignacion.fecha <= fecha_fin,
        )
        .order_by(TareaEspecialAsignacion.fecha, TareaEspecialTipo.nombre)
        .all()
    )

    return [TareaEspecialAsignacionResponse(**dict(row._mapping)) for row in asignaciones]


@router.put("/asignaciones/{asignacion_id}", response_model=TareaEspecialAsignacionResponse)
def swap_asignacion(
    asignacion_id: int,
    data: SwapAsignacionRequest,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Swap task assignment with cascade logic (admin only)"""
    asignacion = db.query(TareaEspecialAsignacion).filter_by(id=asignacion_id).first()
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asignación {asignacion_id} no encontrada",
        )

    # Save previous collaborator
    colaborador_anterior_id = asignacion.colaborador_id

    # Update assignment
    asignacion.colaborador_id = data.colaborador_id
    db.flush()

    # If task excludes lunch, handle lunch assignments
    if asignacion.tipo.inhabilita_almuerzo:
        # Release previous collaborator's lunch
        asignacion_almuerzo_anterior = db.query(AsignacionAlmuerzo).filter(
            AsignacionAlmuerzo.colaborador_id == colaborador_anterior_id,
            AsignacionAlmuerzo.turno_almuerzo.has(
                TurnoAlmuerzo.fecha == asignacion.fecha,
            ),
        ).first()
        if asignacion_almuerzo_anterior:
            db.delete(asignacion_almuerzo_anterior)
            # Notify franja freed up
            try:
                notificar_franja_liberada(db, asignacion.fecha, asignacion_almuerzo_anterior.turno_almuerzo.franja_horaria_id)
            except Exception:
                pass

        # Remove new collaborator's lunch if exists
        asignacion_almuerzo_nueva = db.query(AsignacionAlmuerzo).filter(
            AsignacionAlmuerzo.colaborador_id == data.colaborador_id,
            AsignacionAlmuerzo.turno_almuerzo.has(
                TurnoAlmuerzo.fecha == asignacion.fecha,
            ),
        ).first()
        if asignacion_almuerzo_nueva:
            db.delete(asignacion_almuerzo_nueva)

    # Create notifications
    canal = "fcm" if _should_send_push(db) else "in_app"

    # Notification for new collaborator
    notif_nuevo = Notificacion(
        colaborador_id=data.colaborador_id,
        tipo="tarea_especial",
        mensaje=f"Ahora eres responsable de {asignacion.tipo.nombre} el {asignacion.fecha}.",
        canal=canal,
        referencia_id=asignacion_id,
        referencia_tipo="tarea_especial",
    )
    db.add(notif_nuevo)

    # Notification for previous collaborator
    notif_anterior = Notificacion(
        colaborador_id=colaborador_anterior_id,
        tipo="tarea_especial",
        mensaje=f"Ya no tienes asignada {asignacion.tipo.nombre} el {asignacion.fecha}.",
        canal=canal,
        referencia_id=asignacion_id,
        referencia_tipo="tarea_especial",
    )
    db.add(notif_anterior)

    db.commit()
    db.refresh(asignacion)

    return TareaEspecialAsignacionResponse(
        id=asignacion.id,
        fecha=asignacion.fecha,
        tarea_especial_tipo_id=asignacion.tarea_especial_tipo_id,
        colaborador_id=asignacion.colaborador_id,
        tipo_nombre=asignacion.tipo.nombre,
        colaborador_nombre=db.query(Colaborador).filter_by(id=asignacion.colaborador_id).first().nombre,
    )


@router.get("/mis-tareas", response_model=List[MiTareaResponse])
def get_mis_tareas(
    dias: int = 30,
    db: Session = Depends(get_db),
    current_user: Colaborador = Depends(get_current_user),
):
    """Get user's assigned tasks for the next N days"""
    from datetime import datetime, timedelta
    hoy = datetime.now().date()
    hasta = hoy + timedelta(days=dias)

    tareas = (
        db.query(
            TareaEspecialAsignacion.id,
            TareaEspecialAsignacion.fecha,
            TareaEspecialTipo.nombre.label('tipo_nombre'),
            TareaEspecialTipo.hora_inicio,
            TareaEspecialTipo.hora_fin,
            TareaEspecialTipo.inhabilita_almuerzo,
        )
        .join(TareaEspecialTipo, TareaEspecialAsignacion.tarea_especial_tipo_id == TareaEspecialTipo.id)
        .filter(
            TareaEspecialAsignacion.colaborador_id == current_user.id,
            TareaEspecialAsignacion.fecha >= hoy,
            TareaEspecialAsignacion.fecha <= hasta,
        )
        .order_by(TareaEspecialAsignacion.fecha)
        .all()
    )

    return [MiTareaResponse(**dict(row._mapping)) for row in tareas]
