"""
Tests for the franja preference notification system
"""
import pytest
from datetime import date
from app.core.notificador import notificar_franja_liberada
from app.models import (
    Colaborador, TurnoAlmuerzo, AsignacionAlmuerzo, Ausencia, Notificacion, ConfiguracionCobertura
)


def test_notificar_franja_liberada_basic(db_session, test_franjas, test_colaboradores):
    """Test that notifications are sent to eligible candidates"""
    hoy = date.today()

    # Setup: Create turno with assignments
    turno_1 = TurnoAlmuerzo(fecha=hoy, franja_horaria_id=test_franjas[0].id, capacidad_maxima=5)
    turno_2 = TurnoAlmuerzo(fecha=hoy, franja_horaria_id=test_franjas[1].id, capacidad_maxima=5)
    db_session.add_all([turno_1, turno_2])
    db_session.flush()

    # Assign test_colaboradores[0] to franja 2, but prefers franja 1
    test_colaboradores[0].franja_preferida_id = test_franjas[0].id
    asignacion_1 = AsignacionAlmuerzo(turno_almuerzo_id=turno_2.id, colaborador_id=test_colaboradores[0].id)
    db_session.add(asignacion_1)
    db_session.commit()

    # Trigger notification that franja 1 was freed
    notificar_franja_liberada(db_session, hoy, test_franjas[0].id)

    # Check that notification was created for eligible candidate
    notif = db_session.query(Notificacion).filter_by(
        colaborador_id=test_colaboradores[0].id,
        tipo='franja_preferida_disponible',
        estado='pendiente',
    ).first()

    assert notif is not None
    assert notif.fecha == hoy
    assert notif.referencia_id == test_franjas[0].id


def test_notificar_excludes_absent(db_session, test_franjas, test_colaboradores):
    """Test that absent people are excluded from notifications"""
    hoy = date.today()

    # Setup
    turno_1 = TurnoAlmuerzo(fecha=hoy, franja_horaria_id=test_franjas[0].id, capacidad_maxima=5)
    turno_2 = TurnoAlmuerzo(fecha=hoy, franja_horaria_id=test_franjas[1].id, capacidad_maxima=5)
    db_session.add_all([turno_1, turno_2])
    db_session.flush()

    # Assign test_colaboradores[0] to franja 2, prefer franja 1
    test_colaboradores[0].franja_preferida_id = test_franjas[0].id
    asignacion = AsignacionAlmuerzo(turno_almuerzo_id=turno_2.id, colaborador_id=test_colaboradores[0].id)
    db_session.add(asignacion)

    # Mark them as absent
    ausencia = Ausencia(colaborador_id=test_colaboradores[0].id, fecha=hoy, motivo="vacaciones")
    db_session.add(ausencia)
    db_session.commit()

    # Trigger notification
    notificar_franja_liberada(db_session, hoy, test_franjas[0].id)

    # Should NOT have a notification
    notif = db_session.query(Notificacion).filter_by(
        colaborador_id=test_colaboradores[0].id,
        tipo='franja_preferida_disponible',
    ).first()

    assert notif is None


def test_notificar_excludes_already_in_preferred(db_session, test_franjas, test_colaboradores):
    """Test that people already in preferred franja are excluded"""
    hoy = date.today()

    # Setup
    turno_1 = TurnoAlmuerzo(fecha=hoy, franja_horaria_id=test_franjas[0].id, capacidad_maxima=5)
    db_session.add(turno_1)
    db_session.flush()

    # Assign test_colaboradores[0] to franja 1, prefer franja 1
    test_colaboradores[0].franja_preferida_id = test_franjas[0].id
    asignacion = AsignacionAlmuerzo(turno_almuerzo_id=turno_1.id, colaborador_id=test_colaboradores[0].id)
    db_session.add(asignacion)
    db_session.commit()

    # Trigger notification that franja 1 was freed
    notificar_franja_liberada(db_session, hoy, test_franjas[0].id)

    # Should NOT have a notification (already in preferred franja)
    notif = db_session.query(Notificacion).filter_by(
        colaborador_id=test_colaboradores[0].id,
    ).first()

    assert notif is None


def test_notificar_broadcast_multiple(db_session, test_franjas, test_colaboradores):
    """Test that multiple eligible candidates receive notifications"""
    hoy = date.today()

    # Setup: create two turnos
    turno_1 = TurnoAlmuerzo(fecha=hoy, franja_horaria_id=test_franjas[0].id, capacidad_maxima=5)
    turno_2 = TurnoAlmuerzo(fecha=hoy, franja_horaria_id=test_franjas[1].id, capacidad_maxima=5)
    db_session.add_all([turno_1, turno_2])
    db_session.flush()

    # Setup: assign two people to franja 2, both prefer franja 1
    for i in range(2):
        test_colaboradores[i].franja_preferida_id = test_franjas[0].id
        asignacion = AsignacionAlmuerzo(turno_almuerzo_id=turno_2.id, colaborador_id=test_colaboradores[i].id)
        db_session.add(asignacion)
    db_session.commit()

    # Trigger notification
    notificar_franja_liberada(db_session, hoy, test_franjas[0].id)

    # Both should receive notifications
    notifs = db_session.query(Notificacion).filter(
        Notificacion.tipo == 'franja_preferida_disponible',
        Notificacion.estado == 'pendiente',
    ).all()

    assert len(notifs) == 2
    assert set(n.colaborador_id for n in notifs) == {test_colaboradores[0].id, test_colaboradores[1].id}
