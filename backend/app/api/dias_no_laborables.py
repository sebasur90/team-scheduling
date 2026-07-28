from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DiaNoLaborable, Colaborador
from app.schemas.dia_no_laborable import DiaNoLaborableCreate, DiaNoLaborableResponse
from app.dependencies import get_admin_user
from datetime import date
from typing import List

router = APIRouter(prefix="/dias-no-laborables", tags=["dias_no_laborables"], redirect_slashes=False)


@router.get("", response_model=List[DiaNoLaborableResponse])
@router.get("/", response_model=List[DiaNoLaborableResponse])
def list_dias_no_laborables(
    mes: str,
    db: Session = Depends(get_db),
):
    """Get non-working days for a specific month (YYYY-MM)"""
    year, month = mes.split("-")
    year, month = int(year), int(month)

    dias = db.query(DiaNoLaborable).all()
    return [
        DiaNoLaborableResponse.model_validate(d)
        for d in dias
        if d.fecha.year == year and d.fecha.month == month
    ]


@router.post("", response_model=DiaNoLaborableResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=DiaNoLaborableResponse, status_code=status.HTTP_201_CREATED)
def create_dia_no_laborable(
    data: DiaNoLaborableCreate,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Mark a date as non-working (admin only)"""
    existing = db.query(DiaNoLaborable).filter_by(fecha=data.fecha).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Date {data.fecha} is already marked as non-working"
        )

    dia = DiaNoLaborable(fecha=data.fecha, motivo=data.motivo)
    db.add(dia)
    db.commit()
    db.refresh(dia)
    return DiaNoLaborableResponse.model_validate(dia)


@router.delete("/{fecha}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dia_no_laborable(
    fecha: str,
    db: Session = Depends(get_db),
    admin: Colaborador = Depends(get_admin_user),
):
    """Remove non-working day status (admin only)"""
    fecha_obj = date.fromisoformat(fecha)
    dia = db.query(DiaNoLaborable).filter_by(fecha=fecha_obj).first()
    if not dia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Date {fecha} not found"
        )

    db.delete(dia)
    db.commit()
