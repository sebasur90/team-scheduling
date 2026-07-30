from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Colaborador, Sector
from app.schemas.colaborador import ColaboradorResponse
from app.auth.local import create_token, hash_password
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"], redirect_slashes=False)


def _add_sector_nombre(colab: Colaborador, db: Session) -> dict:
  """Helper to get colaborador data with sector name"""
  sector = db.query(Sector).filter_by(id=colab.sector_id).first()
  colab_dict = {
    'id': colab.id,
    'nombre': colab.nombre,
    'email': colab.email,
    'sector_id': colab.sector_id,
    'sector_nombre': sector.nombre if sector else None,
    'estado_atencion': colab.estado_atencion,
    'rol': colab.rol,
    'tarea_tipo_ids': [t.tarea_tipo_id for t in colab.tareas_habilitadas],
    'puntaje_prioridad': colab.puntaje_prioridad,
    'es_admin': colab.es_admin,
    'franja_preferida_id': colab.franja_preferida_id,
    'created_at': colab.created_at,
    'updated_at': colab.updated_at,
  }
  return colab_dict


class LoginRequest(BaseModel):
    email: str


class SetupRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: ColaboradorResponse


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login with email - simple authentication for regular collaborators"""
    user = db.query(Colaborador).filter(Colaborador.email == request.email).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    token = create_token(user.id)
    user_dict = _add_sector_nombre(user, db)

    return LoginResponse(
        token=token,
        user=ColaboradorResponse.model_validate(user_dict),
    )


@router.post("/setup", response_model=LoginResponse)
def setup(request: SetupRequest, db: Session = Depends(get_db)):
    """Admin setup endpoint - only for sebassur90@gmail.com"""
    ADMIN_EMAIL = "sebassur90@gmail.com"

    if request.email != ADMIN_EMAIL:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo el administrador puede usar este endpoint")

    user = db.query(Colaborador).filter(Colaborador.email == request.email).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario administrativo no encontrado")

    user.password_hash = hash_password(request.password)
    user.es_admin = True
    db.commit()
    db.refresh(user)

    token = create_token(user.id)
    user_dict = _add_sector_nombre(user, db)

    return LoginResponse(
        token=token,
        user=ColaboradorResponse.model_validate(user_dict),
    )


@router.get("/me", response_model=ColaboradorResponse)
def me(token: str, db: Session = Depends(get_db)):
    """Get current user info"""
    from app.auth.local import verify_token

    try:
        colaborador_id = verify_token(token)
        user = db.query(Colaborador).filter(Colaborador.id == colaborador_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        user_dict = _add_sector_nombre(user, db)
        return ColaboradorResponse.model_validate(user_dict)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
