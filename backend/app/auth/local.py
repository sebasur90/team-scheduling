"""
Local mock authentication for development.
In production, this would be replaced with Google OAuth.
"""
from sqlalchemy.orm import Session
from app.models import Colaborador
from app.config import SECRET_KEY
import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain: str, hash: str) -> bool:
    """Verify a plain password against a hash"""
    return pwd_context.verify(plain, hash)


def create_token(colaborador_id: int) -> str:
    """Create JWT token for local auth"""
    payload = {
        "sub": str(colaborador_id),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def verify_token(token: str) -> int:
    """Verify JWT token and return colaborador_id"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return int(payload["sub"])
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")


def get_current_user(db: Session, token: str) -> Colaborador:
    """Get current user from token"""
    try:
        colaborador_id = verify_token(token)
        user = db.query(Colaborador).filter(Colaborador.id == colaborador_id).first()
        if not user:
            raise ValueError("User not found")
        return user
    except Exception as e:
        raise ValueError(f"Authentication failed: {str(e)}")
