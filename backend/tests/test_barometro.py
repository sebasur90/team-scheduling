import pytest
from datetime import date
from sqlalchemy.orm import Session
from app.models.turno import TurnoAlmuerzo, AsignacionAlmuerzo
from app.models.incidencia import IncidenciaCobertura
from app.enums import EstadoIncidencia
from app.core.barometro import BarometroService


def test_barometro_verde(test_franjas, test_colaboradores, test_configuracion_cobertura, db_session: Session):
    """Test barometro verde cuando todo está bien."""
    fecha = date(2026, 7, 28)

    # Crear turno
    turno = TurnoAlmuerzo(
        fecha=fecha,
        franja_horaria_id=test_franjas[0].id,
        capacidad_maxima=5
    )
    db_session.add(turno)
    db_session.flush()

    # Asignar colaboradores (mix tipo_a y tipo_b)
    colab_tipo_a = test_colaboradores[0]  # tipo_a
    colab_tipo_b = test_colaboradores[7]  # tipo_b (7+ son tipo_b)

    for colab in [colab_tipo_a, colab_tipo_b]:
        asignacion = AsignacionAlmuerzo(
            turno_almuerzo_id=turno.id,
            colaborador_id=colab.id,
            estado="confirmada"
        )
        db_session.add(asignacion)

    db_session.commit()

    # Calcular barometro - should not raise AttributeError
    barometro = BarometroService.calculate_barometro(db_session, str(fecha))

    assert barometro["estado"] == "verde"
    assert barometro["incidencias_activas"] == 0
    assert len(barometro["franjas"]) > 0


def test_barometro_amarillo_with_incidencia(test_franjas, test_colaboradores, test_configuracion_cobertura, db_session: Session):
    """Test barometro amarillo cuando hay incidencia activa."""
    fecha = date(2026, 7, 28)

    # Crear turno y asignación
    turno = TurnoAlmuerzo(
        fecha=fecha,
        franja_horaria_id=test_franjas[0].id,
        capacidad_maxima=5
    )
    db_session.add(turno)
    db_session.flush()

    asignacion = AsignacionAlmuerzo(
        turno_almuerzo_id=turno.id,
        colaborador_id=test_colaboradores[0].id,
        estado="confirmada"
    )
    db_session.add(asignacion)
    db_session.flush()

    # Crear incidencia activa
    incidencia = IncidenciaCobertura(
        asignacion_id=asignacion.id,
        motivo="rechazo",
        estado=EstadoIncidencia.VENTANA_ADMIN.value
    )
    db_session.add(incidencia)
    db_session.commit()

    # Calcular barometro - should not raise AttributeError
    barometro = BarometroService.calculate_barometro(db_session, str(fecha))

    assert barometro["incidencias_activas"] == 1
    # El estado puede ser amarillo (si la cobertura es ok) o rojo (si está rota)


def test_barometro_respects_configured_minimums(test_franjas, test_colaboradores, test_configuracion_cobertura, db_session: Session):
    """Test that barometro uses configured minimums, not hardcoded 1,1"""
    fecha = date(2026, 7, 28)

    # Set high minimums
    test_configuracion_cobertura.minimo_tipo_a = 3
    test_configuracion_cobertura.minimo_tipo_b = 3
    db_session.commit()

    # Create turno with only 2 tipo_a and 2 tipo_b (not enough)
    turno = TurnoAlmuerzo(
        fecha=fecha,
        franja_horaria_id=test_franjas[0].id,
        capacidad_maxima=10
    )
    db_session.add(turno)
    db_session.flush()

    # Assign 2 tipo_a and 2 tipo_b
    for i in range(2):
        asignacion = AsignacionAlmuerzo(
            turno_almuerzo_id=turno.id,
            colaborador_id=test_colaboradores[i].id,  # tipo_a
            estado="confirmada"
        )
        db_session.add(asignacion)

        asignacion = AsignacionAlmuerzo(
            turno_almuerzo_id=turno.id,
            colaborador_id=test_colaboradores[7 + i].id,  # tipo_b
            estado="confirmada"
        )
        db_session.add(asignacion)

    db_session.commit()

    # Calculate barometro
    barometro = BarometroService.calculate_barometro(db_session, str(fecha))

    # With minimums of 3,3, having only 2,2 should mark franja as critical
    # (estado should be "critico" for that franja)
    franja_estados = [f["estado"] for f in barometro["franjas"]]
    assert "critico" in franja_estados or barometro["estado"] == "rojo"
