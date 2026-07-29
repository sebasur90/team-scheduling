from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import TurnoAlmuerzo, FranjaHoraria
from app.schemas.turno import TurnoListResponse, TurnoAlmuerzoResponse
from datetime import date

router = APIRouter(prefix="/turnos", tags=["turnos"], redirect_slashes=False)


@router.get("", response_model=TurnoListResponse)
@router.get("/", response_model=TurnoListResponse)
def list_turnos_by_date(
    fecha: str,
    db: Session = Depends(get_db),
):
    """Get all time slots for a date with their assignments. Returns empty assignments if no turns generated yet."""
    fecha_obj = date.fromisoformat(fecha)

    turnos = db.query(TurnoAlmuerzo).filter_by(fecha=fecha_obj).all()

    if turnos:
        response_turnos = [TurnoAlmuerzoResponse.model_validate(t) for t in turnos]
    else:
        # If no turnos exist for this date, return all available franjas with empty assignments
        franjas = db.query(FranjaHoraria).order_by(FranjaHoraria.orden).all()
        response_turnos = [
            TurnoAlmuerzoResponse(
                id=0,
                fecha=fecha_obj,
                franja_horaria_id=f.id,
                capacidad_maxima=2,
                franja_horaria=f,
                asignaciones=[]
            )
            for f in franjas
        ]

    return TurnoListResponse(fecha=fecha_obj, franjas=response_turnos)
