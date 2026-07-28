import pytest
from datetime import datetime, date
from sqlalchemy.orm import Session
from app.models.turno import TurnoAlmuerzo, AsignacionAlmuerzo
from app.models.colaborador import Colaborador
from app.models.incidencia import IncidenciaCobertura
from app.enums import EstadoIncidencia
from app.core.cascade_engine import CascadeEngine


def test_cascade_engine_basic(test_franjas, test_colaboradores, db_session: Session):
    """Test básico del cascade engine."""
    # Crear turno
    turno = TurnoAlmuerzo(
        fecha=date(2026, 7, 28),
        franja_horaria_id=test_franjas[0].id,
        capacidad_maxima=5
    )
    db_session.add(turno)
    db_session.flush()

    # Crear asignación
    asignacion = AsignacionAlmuerzo(
        turno_almuerzo_id=turno.id,
        colaborador_id=test_colaboradores[0].id,
        estado="firme"
    )
    db_session.add(asignacion)
    db_session.commit()

    # Iniciar cascada
    CascadeEngine.iniciar(db_session, asignacion.id, "rechazo")

    # Verificar que incidencia fue creada
    incidencia = db_session.query(IncidenciaCobertura).filter(
        IncidenciaCobertura.asignacion_id == asignacion.id
    ).first()

    assert incidencia is not None
    assert incidencia.motivo == "rechazo"
    assert incidencia.estado == EstadoIncidencia.VENTANA_ADMIN.value


def test_cascade_engine_multiple_candidates(test_franjas, test_colaboradores, db_session: Session):
    """Test con múltiples candidatos disponibles."""
    fecha = date(2026, 7, 28)

    # Crear turnos para dos franjas
    turno1 = TurnoAlmuerzo(
        fecha=fecha,
        franja_horaria_id=test_franjas[0].id,  # Primera franja
        capacidad_maxima=5
    )
    turno2 = TurnoAlmuerzo(
        fecha=fecha,
        franja_horaria_id=test_franjas[1].id,  # Segunda franja
        capacidad_maxima=5
    )
    db_session.add_all([turno1, turno2])
    db_session.flush()

    # Asignación para la primera franja
    asignacion1 = AsignacionAlmuerzo(
        turno_almuerzo_id=turno1.id,
        colaborador_id=test_colaboradores[0].id,
        estado="firme"
    )

    # Asignaciones para la segunda franja (candidatos potenciales)
    asignacion2 = AsignacionAlmuerzo(
        turno_almuerzo_id=turno2.id,
        colaborador_id=test_colaboradores[1].id,
        estado="firme"
    )
    asignacion3 = AsignacionAlmuerzo(
        turno_almuerzo_id=turno2.id,
        colaborador_id=test_colaboradores[2].id,
        estado="firme"
    )

    db_session.add_all([asignacion1, asignacion2, asignacion3])
    db_session.commit()

    # Iniciar cascada para primera asignación
    CascadeEngine.iniciar(db_session, asignacion1.id, "timeout")

    # Verificar que incidencia existe
    incidencia = db_session.query(IncidenciaCobertura).filter(
        IncidenciaCobertura.asignacion_id == asignacion1.id
    ).first()

    assert incidencia is not None
    assert incidencia.estado == EstadoIncidencia.VENTANA_ADMIN.value
