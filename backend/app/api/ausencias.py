from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import List, Optional
from app.database import get_db
from app.models import Ausencia, Colaborador, AsignacionAlmuerzo, TurnoAlmuerzo
from app.schemas.ausencia import (
    AusenciaCreateRango,
    AusenciaDeleteBloque,
    AusenciaResponse,
    VacacionesBlockResponse,
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/ausencias", tags=["ausencias"], redirect_slashes=False)


def _get_workdays_in_range(fecha_inicio: date, fecha_fin: date) -> List[date]:
    """Extract all weekdays (Mon-Fri) in date range."""
    dias = []
    current = fecha_inicio
    while current <= fecha_fin:
        if current.weekday() < 5:  # 0-4 = Mon-Fri
            dias.append(current)
        current += timedelta(days=1)
    return dias


def _check_permission(user: Colaborador, target_colaborador_id: int):
    """Validate user can manage vacations for target_colaborador_id."""
    if user.rol != "admin" and user.id != target_colaborador_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para gestionar vacaciones de otro colaborador",
        )


@router.post("", response_model=VacacionesBlockResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=VacacionesBlockResponse, status_code=status.HTTP_201_CREATED)
def create_vacaciones(
    data: AusenciaCreateRango,
    db: Session = Depends(get_db),
    user: Colaborador = Depends(get_current_user),
):
    """Create vacation range (skip weekends, auto-release lunch assignments)."""
    # Get workdays in range
    dias_habiles = _get_workdays_in_range(data.fecha_inicio, data.fecha_fin)

    if not dias_habiles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El rango no contiene ningún día hábil (lunes a viernes)",
        )

    # Check permissions
    _check_permission(user, data.colaborador_id)

    # Get actual fecha_inicio/fin from workdays (for response)
    fecha_inicio_real = dias_habiles[0]
    fecha_fin_real = dias_habiles[-1]

    # Find existing vacations for this collaborator in this range (idempotence)
    existing_dates = {
        a.fecha
        for a in db.query(Ausencia)
        .filter(
            Ausencia.colaborador_id == data.colaborador_id,
            Ausencia.motivo == "vacaciones",
            Ausencia.fecha.in_(dias_habiles),
        )
        .all()
    }

    # Dias a crear: los que no existen ya
    dias_crear = [d for d in dias_habiles if d not in existing_dates]

    # Delete existing lunch assignments for these days
    db.query(AsignacionAlmuerzo).filter(
        AsignacionAlmuerzo.colaborador_id == data.colaborador_id,
        AsignacionAlmuerzo.turno_almuerzo_id.in_(
            db.query(TurnoAlmuerzo.id).filter(TurnoAlmuerzo.fecha.in_(dias_crear))
        ),
    ).delete()

    # Create vacation records
    for dia in dias_crear:
        ausencia = Ausencia(
            colaborador_id=data.colaborador_id,
            fecha=dia,
            motivo="vacaciones",
        )
        db.add(ausencia)

    db.commit()

    return VacacionesBlockResponse(
        colaborador_id=data.colaborador_id,
        fecha_inicio=fecha_inicio_real,
        fecha_fin=fecha_fin_real,
        motivo="vacaciones",
        dias=dias_habiles,
    )


@router.get("", response_model=List[AusenciaResponse])
@router.get("/", response_model=List[AusenciaResponse])
def list_ausencias(
    colaborador_id: Optional[int] = None,
    mes: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Colaborador = Depends(get_current_user),
):
    """List vacations. Non-admins see only their own unless colaborador_id specified."""
    # Determine whose vacations to fetch
    if colaborador_id is None:
        if user.rol == "admin":
            # Admin without filter sees all
            target_ids = None
        else:
            # Non-admin sees only their own
            target_ids = [user.id]
    else:
        # Specific user requested
        target_ids = [colaborador_id]

    query = db.query(Ausencia).filter(Ausencia.motivo == "vacaciones")

    if target_ids:
        query = query.filter(Ausencia.colaborador_id.in_(target_ids))

    # Filter by month if provided (YYYY-MM format)
    if mes:
        try:
            year, month = mes.split("-")
            year, month = int(year), int(month)
            query = query.filter(
                Ausencia.fecha >= date(year, month, 1),
                Ausencia.fecha < date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1),
            )
        except (ValueError, IndexError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de mes inválido. Usa YYYY-MM",
            )

    ausencias = query.all()
    return [AusenciaResponse.model_validate(a) for a in ausencias]


@router.delete("/bloque", status_code=status.HTTP_204_NO_CONTENT)
def delete_vacaciones_bloque(
    data: AusenciaDeleteBloque,
    db: Session = Depends(get_db),
    user: Colaborador = Depends(get_current_user),
):
    """Delete vacation block (all rows in range for user)."""
    # Check permissions
    _check_permission(user, data.colaborador_id)

    # Find matching rows
    ausencias = db.query(Ausencia).filter(
        Ausencia.colaborador_id == data.colaborador_id,
        Ausencia.motivo == "vacaciones",
        Ausencia.fecha >= data.fecha_inicio,
        Ausencia.fecha <= data.fecha_fin,
    ).all()

    if not ausencias:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró ninguna vacación en ese rango",
        )

    # Delete all matching rows
    for ausencia in ausencias:
        db.delete(ausencia)

    db.commit()
