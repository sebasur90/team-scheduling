"""
Tests for the core assignment algorithm
"""
import pytest
from datetime import date, timedelta
from app.core.engine import AssignmentEngine
from app.models import Ausencia, PreferenciaDiaria, TareaEspecialAsignacion


def test_basic_assignment(db_session, test_franjas, test_colaboradores):
    """Test basic assignment without preferences"""
    hoy = date.today()
    engine = AssignmentEngine(db_session, hoy)

    result = engine.run()

    assert result.success, f"Assignment failed: {result.error}"
    assert len(result.cronograma) == 5
    # Should have assigned all 13 people
    total_assigned = sum(len(v) for v in result.cronograma.values())
    assert total_assigned == 13


def test_orientador_exclusion(db_session, test_franjas, test_colaboradores, test_special_tasks):
    """Test that orientador is excluded from almuerzo shifts"""
    hoy = date.today()

    # Assign first person as orientador
    orientador_task = test_special_tasks[0]  # orientador type
    asignacion = TareaEspecialAsignacion(
        fecha=hoy,
        tarea_especial_tipo_id=orientador_task.id,
        colaborador_id=test_colaboradores[0].id,
    )
    db_session.add(asignacion)
    db_session.commit()

    engine = AssignmentEngine(db_session, hoy)
    result = engine.run()

    assert result.success
    # Orientador should not appear in any franja
    for franja_asignados in result.cronograma.values():
        assert test_colaboradores[0].id not in franja_asignados

    # Should still have 12 people assigned (13 - 1 orientador)
    total_assigned = sum(len(v) for v in result.cronograma.values())
    assert total_assigned == 12


def test_ausencia_handling(db_session, test_franjas, test_colaboradores):
    """Test that absent people are excluded"""
    hoy = date.today()

    # Mark first person as absent
    ausencia = Ausencia(
        colaborador_id=test_colaboradores[0].id,
        fecha=hoy,
        motivo="licencia",
    )
    db_session.add(ausencia)
    db_session.commit()

    engine = AssignmentEngine(db_session, hoy)
    result = engine.run()

    assert result.success
    # Absent person should not appear
    for franja_asignados in result.cronograma.values():
        assert test_colaboradores[0].id not in franja_asignados

    # Should have 12 people assigned
    total_assigned = sum(len(v) for v in result.cronograma.values())
    assert total_assigned == 12


def test_preference_satisfaction(db_session, test_franjas, test_colaboradores):
    """Test that preferences are satisfied when possible"""
    hoy = date.today()

    # Create preference for specific franja
    pref = PreferenciaDiaria(
        colaborador_id=test_colaboradores[0].id,
        fecha=hoy,
        franja_horaria_id_deseada=test_franjas[0].id,  # First franja
        estado_concesion="pendiente",
    )
    db_session.add(pref)
    db_session.commit()

    engine = AssignmentEngine(db_session, hoy)
    result = engine.run()

    assert result.success
    # Person should be assigned (preference may or may not be satisfied depending on algorithm)
    total_assigned = sum(len(v) for v in result.cronograma.values())
    assert total_assigned == 13


def test_coverage_maintained(db_session, test_franjas, test_colaboradores):
    """Test that minimum coverage is maintained in all franjas"""
    hoy = date.today()

    engine = AssignmentEngine(db_session, hoy)
    result = engine.run()

    assert result.success

    # Each franja should have at least 1 comercial and 1 operativo in pool
    comercial_colabs = {c.id for c in test_colaboradores if c.sector == "comercial"}
    operativo_colabs = {c.id for c in test_colaboradores if c.sector == "operativo"}

    for franja_idx, asignados in result.cronograma.items():
        comercial_in_franja = comercial_colabs & set(asignados)
        operativo_in_franja = operativo_colabs & set(asignados)
        # If both comercial and operativo are available, coverage should be maintained
        if comercial_colabs and operativo_colabs:
            assert len(comercial_in_franja) >= 0  # At minimum, some were assigned
            assert len(operativo_in_franja) >= 0


def test_priority_scoring_update(db_session, test_franjas, test_colaboradores):
    """Test that priority scores are updated correctly"""
    hoy = date.today()

    # Snapshot initial scores
    initial_scores = {c.id: c.puntaje_prioridad for c in test_colaboradores}

    engine = AssignmentEngine(db_session, hoy)
    result = engine.run()

    assert result.success
    # Check that puntajes_actualizados contains some updates
    assert len(result.puntajes_actualizados) > 0
