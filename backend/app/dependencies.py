from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Colaborador
from app.auth.local import get_current_user as auth_get_current_user


def get_current_user(token: str = None, db: Session = Depends(get_db)) -> Colaborador:
    """Dependency to get current user from token"""
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No token provided")

    try:
        return auth_get_current_user(db, token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


def get_admin_user(current_user: Colaborador = Depends(get_current_user)) -> Colaborador:
    """Dependency to get current admin user"""
    if current_user.rol != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current_user
