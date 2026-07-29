"""
Tests for CoberturaValidator with configurable minimums
"""
import pytest
from app.core.cobertura import CoberturaValidator
from app.core.tipos import ColaboradorInfo


@pytest.fixture
def test_colab_pool():
    """Create a test pool of colaboradores"""
    return [
        ColaboradorInfo(id=1, nombre="Juan", sector="tipo_a", estado_atencion="activo", puntaje_prioridad=0),
        ColaboradorInfo(id=2, nombre="Maria", sector="tipo_a", estado_atencion="activo", puntaje_prioridad=0),
        ColaboradorInfo(id=3, nombre="Carlos", sector="tipo_a", estado_atencion="activo", puntaje_prioridad=0),
        ColaboradorInfo(id=4, nombre="Elena", sector="tipo_b", estado_atencion="activo", puntaje_prioridad=0),
        ColaboradorInfo(id=5, nombre="Jorge", sector="tipo_b", estado_atencion="activo", puntaje_prioridad=0),
    ]


def test_satisfies_minimum_coverage_default(test_colab_pool):
    """Test that default minimums are 1,1"""
    validator = CoberturaValidator(test_colab_pool)

    # Asignados en franja: [1] (solo tipo_a), no hay tipo_b
    # Available: tipo_a = 2, 3; tipo_b = 4, 5
    # Should NOT satisfy (no tipo_b en pool disponible)
    excluidos = set()
    asignados = [1]

    result = validator.satisfies_minimum_coverage(asignados, excluidos)
    assert result is False  # Not enough tipo_b


def test_satisfies_minimum_coverage_custom_minimos(test_colab_pool):
    """Test with custom minimums (2, 1)"""
    minimos = {"tipo_a": 2, "tipo_b": 1}
    validator = CoberturaValidator(test_colab_pool, minimos)

    excluidos = set()
    asignados = [1]  # Only 1 tipo_a assigned

    # Available: tipo_a = 2, 3 (2 available); tipo_b = 4, 5 (2 available)
    # Needs: tipo_a >= 2, tipo_b >= 1
    # Has: tipo_a = 2, tipo_b = 2
    result = validator.satisfies_minimum_coverage(asignados, excluidos)
    assert result is True


def test_satisfies_minimum_coverage_zero_minimum(test_colab_pool):
    """Test with zero minimum for a sector (no requirement)"""
    minimos = {"tipo_a": 0, "tipo_b": 1}
    validator = CoberturaValidator(test_colab_pool, minimos)

    excluidos = set()
    asignados = [4]  # Only tipo_b assigned

    # Available: tipo_a = 1, 2, 3 (3 available); tipo_b = 5 (1 available)
    # Needs: tipo_a >= 0 (satisfied!), tipo_b >= 1
    # Has: tipo_a = 3, tipo_b = 1
    result = validator.satisfies_minimum_coverage(asignados, excluidos)
    assert result is True


def test_satisfies_minimum_coverage_impossible_minimum(test_colab_pool):
    """Test with minimum that's impossible to reach"""
    minimos = {"tipo_a": 10, "tipo_b": 1}
    validator = CoberturaValidator(test_colab_pool, minimos)

    excluidos = set()
    asignados = []

    # Available: tipo_a = 3 (only 3 tipo_a total), tipo_b = 2
    # Needs: tipo_a >= 10 (impossible!)
    result = validator.satisfies_minimum_coverage(asignados, excluidos)
    assert result is False


def test_get_cobertura_status(test_colab_pool):
    """Test get_cobertura_status returns correct counts"""
    validator = CoberturaValidator(test_colab_pool)

    excluidos = set()
    asignados = [1, 4]  # 1 tipo_a, 1 tipo_b assigned

    tipo_a, tipo_b = validator.get_cobertura_status(asignados, excluidos)

    # Available: tipo_a = 2, 3 (2 left); tipo_b = 5 (1 left)
    assert tipo_a == 2
    assert tipo_b == 1


def test_get_cobertura_status_with_excluded(test_colab_pool):
    """Test get_cobertura_status excludes marked as unavailable"""
    validator = CoberturaValidator(test_colab_pool)

    excluidos = {1, 4}  # Mark 1 tipo_a and 1 tipo_b as excluded
    asignados = []

    tipo_a, tipo_b = validator.get_cobertura_status(asignados, excluidos)

    # Available: tipo_a = 2, 3 (2 left); tipo_b = 5 (1 left)
    assert tipo_a == 2
    assert tipo_b == 1


def test_can_remove_person_safely_yes(test_colab_pool):
    """Test can_remove_person_safely when removal maintains coverage"""
    validator = CoberturaValidator(test_colab_pool)

    # Scenario: 2 tipo_a and 2 tipo_b in franja, all others available
    asignados = [1, 2, 4, 5]  # 2 tipo_a, 2 tipo_b
    excluidos = set()

    # Can we safely remove tipo_a (id=1)?
    # After: tipo_a = 1 + 1 available = 2 (meets minimum)
    can_remove = validator.can_remove_person_safely(1, asignados, excluidos)
    assert can_remove is True


def test_can_remove_person_safely_no(test_colab_pool):
    """Test can_remove_person_safely when removal breaks coverage"""
    validator = CoberturaValidator(test_colab_pool)

    # Scenario: only 1 tipo_b in franja
    asignados = [1, 4]  # 1 tipo_a, 1 tipo_b
    excluidos = {5}  # Other tipo_b is unavailable

    # Can we safely remove tipo_b (id=4)?
    # After: tipo_b = 0 (fails minimum)
    can_remove = validator.can_remove_person_safely(4, asignados, excluidos)
    assert can_remove is False


def test_minimos_with_high_values(test_colab_pool):
    """Test behavior with high minimum values"""
    minimos = {"tipo_a": 3, "tipo_b": 2}
    validator = CoberturaValidator(test_colab_pool, minimos)

    excluidos = set()
    asignados = []

    # Available: 3 tipo_a, 2 tipo_b
    # Needs: 3 tipo_a, 2 tipo_b
    result = validator.satisfies_minimum_coverage(asignados, excluidos)
    assert result is True

    # Now assign 1 of each
    asignados = [1, 4]
    # Available: 2 tipo_a, 1 tipo_b
    # Needs: 3 tipo_a, 2 tipo_b
    result = validator.satisfies_minimum_coverage(asignados, excluidos)
    assert result is False
