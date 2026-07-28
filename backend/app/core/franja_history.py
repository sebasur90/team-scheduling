from datetime import date, timedelta
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import AsignacionAlmuerzo, TurnoAlmuerzo, FranjaHoraria


def get_last_assigned_franja(db: Session, colaborador_id: int, fecha_actual: date) -> Optional[int]:
    """
    Get the last franja (as orden index) assigned to a colaborador before fecha_actual.

    Returns the franja orden index (0-based), or None if no history.
    """
    result = (
        db.query(FranjaHoraria.orden)
        .join(TurnoAlmuerzo, TurnoAlmuerzo.franja_horaria_id == FranjaHoraria.id)
        .join(AsignacionAlmuerzo, AsignacionAlmuerzo.turno_almuerzo_id == TurnoAlmuerzo.id)
        .filter(
            AsignacionAlmuerzo.colaborador_id == colaborador_id,
            TurnoAlmuerzo.fecha < fecha_actual,
        )
        .order_by(TurnoAlmuerzo.fecha.desc())
        .first()
    )

    if result:
        return result[0] - 1  # Convert from 1-based orden to 0-based index
    return None


def get_franja_distribution(
    db: Session, colaborador_id: int, lookback_days: int = 30
) -> Dict[int, int]:
    """
    Count assignments per franja_orden in past lookback_days.

    Returns dict: {"franja_orden_index": count, ...}
    e.g., {0: 2, 1: 1, 2: 0, 3: 1, 4: 0} means 2 times franja 0, 1 time franja 1, etc.
    """
    cutoff_date = date.today() - timedelta(days=lookback_days)

    results = (
        db.query(FranjaHoraria.orden, func.count(AsignacionAlmuerzo.id))
        .join(TurnoAlmuerzo, TurnoAlmuerzo.franja_horaria_id == FranjaHoraria.id)
        .join(AsignacionAlmuerzo, AsignacionAlmuerzo.turno_almuerzo_id == TurnoAlmuerzo.id)
        .filter(
            AsignacionAlmuerzo.colaborador_id == colaborador_id,
            TurnoAlmuerzo.fecha >= cutoff_date,
        )
        .group_by(FranjaHoraria.orden)
        .all()
    )

    distribution = {i - 1: count for orden, count in results}  # Convert orden to 0-based index
    return distribution


def find_least_recent_franja(
    db: Session, colaborador_id: int, allowed_franjas: List[int], fecha_actual: date
) -> int:
    """
    Find the franja (from allowed_franjas) where colaborador hasn't eaten most recently.

    Args:
        db: Database session
        colaborador_id: ID of the colaborador
        allowed_franjas: List of allowed franja indices (0-based)
        fecha_actual: Current date (for filtering history)

    Returns:
        The franja_orden index (0-based) to assign to
    """
    if not allowed_franjas:
        raise ValueError("No allowed franjas provided")

    distribution = get_franja_distribution(db, colaborador_id, lookback_days=30)

    # Find franja with minimum count in distribution
    # If tied, prefer the one with earliest last assignment
    best_franja = None
    min_count = float('inf')

    for franja_idx in allowed_franjas:
        count = distribution.get(franja_idx, 0)

        if count < min_count:
            min_count = count
            best_franja = franja_idx

    if best_franja is None:
        # Fallback: return first allowed franja
        return allowed_franjas[0]

    return best_franja
