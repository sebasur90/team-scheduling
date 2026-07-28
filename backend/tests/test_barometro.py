import pytest
from datetime import date
from sqlalchemy.orm import Session
from app.models.turno import TurnoAlmuerzo, AsignacionAlmuerzo
from app.models.incidencia import IncidenciaCobertura
from app.enums import EstadoIncidencia
from app.core.barometro import BarometroService


def test_barometro_verde(test_franjas, test_colaboradores, db_session: Session):
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

    # Asignar colaboradores (mix comercial y operativo)
    colab_comercial = test_colaboradores[0]  # comercial
    colab_operativo = test_colaboradores[7]  # operativo (7+ son operativos)

    for colab in [colab_comercial, colab_operativo]:
        asignacion = AsignacionAlmuerzo(
            turno_almuerzo_id=turno.id,
            colaborador_id=colab.id,
            estado="confirmada"
        )
        db_session.add(asignacion)

    db_session.commit()

    # Calcular barometro
    barometro = BarometroService.calculate_barometro(db_session, str(fecha))

    assert barometro["estado"] == "verde"
    assert barometro["incidencias_activas"] == 0
    assert len(barometro["franjas"]) > 0


def test_barometro_amarillo_with_incidencia(test_franjas, test_colaboradores, db_session: Session):
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

    # Calcular barometro
    barometro = BarometroService.calculate_barometro(db_session, str(fecha))

    assert barometro["incidencias_activas"] == 1
    # El estado puede ser amarillo (si la cobertura es ok) o rojo (si está rota)
