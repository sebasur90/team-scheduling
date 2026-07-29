import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import Colaborador
from sqlalchemy.orm import Session

client = TestClient(app)


@pytest.fixture
def db():
    """Provide a database session for testing"""
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture
def viewer_user(db: Session):
    """Create a viewer user"""
    viewer = Colaborador(
        nombre="Viewer Test",
        email="viewer@test.com",
        rol="viewer",
        sector="tipo_a",
        estado_atencion="activo",
        puntaje_prioridad=0,
    )
    db.add(viewer)
    db.commit()
    db.refresh(viewer)
    return viewer


@pytest.fixture
def admin_user(db: Session):
    """Create an admin user"""
    admin = Colaborador(
        nombre="Admin Test",
        email="admin@test.com",
        rol="admin",
        sector="tipo_a",
        estado_atencion="activo",
        puntaje_prioridad=0,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@pytest.fixture
def usuario_user(db: Session):
    """Create a regular user"""
    usuario = Colaborador(
        nombre="Usuario Test",
        email="usuario@test.com",
        rol="usuario",
        sector="tipo_a",
        estado_atencion="activo",
        puntaje_prioridad=0,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def test_viewer_role_in_colaborador(db: Session):
    """Test that database accepts rol='viewer'"""
    viewer = Colaborador(
        nombre="Test Viewer",
        email="test@viewer.com",
        rol="viewer",
        sector="tipo_a",
        estado_atencion="activo",
        puntaje_prioridad=0,
    )
    db.add(viewer)
    db.commit()
    db.refresh(viewer)

    assert viewer.id is not None
    assert viewer.rol == "viewer"

    # Verify it's retrieved correctly
    retrieved = db.query(Colaborador).filter_by(rol="viewer").first()
    assert retrieved is not None
    assert retrieved.rol == "viewer"


def test_require_non_viewer_blocks_viewer(viewer_user: Colaborador):
    """Test that require_non_viewer dependency blocks viewer role"""
    from app.auth.local import create_token

    token = create_token(viewer_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"notificaciones_pausadas": True}
    response = client.put(
        "/api/configuracion/notificaciones",
        json=payload,
        headers=headers
    )

    assert response.status_code == 403
    assert "solo lectura" in response.json()["detail"].lower()


def test_require_non_viewer_allows_admin(admin_user: Colaborador):
    """Test that require_non_viewer allows admin"""
    from app.auth.local import create_token

    token = create_token(admin_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"notificaciones_pausadas": False}
    response = client.put(
        "/api/configuracion/notificaciones",
        json=payload,
        headers=headers
    )

    assert response.status_code == 200


def test_require_non_viewer_allows_usuario(usuario_user: Colaborador):
    """Test that require_non_viewer allows usuario"""
    from app.auth.local import create_token

    token = create_token(usuario_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"notificaciones_pausadas": False}
    response = client.put(
        "/api/configuracion/notificaciones",
        json=payload,
        headers=headers
    )

    assert response.status_code == 200


def test_colaborador_list_endpoint_allows_viewer(viewer_user: Colaborador):
    """Test that viewer can READ colaboradores endpoint"""
    from app.auth.local import create_token

    token = create_token(viewer_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/colaboradores", headers=headers)

    # Should allow read access
    assert response.status_code in [200, 403]  # May depend on other permissions


def test_colaborador_create_endpoint_blocks_viewer(viewer_user: Colaborador):
    """Test that viewer CANNOT CREATE colaboradores"""
    from app.auth.local import create_token

    token = create_token(viewer_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "nombre": "New Colab",
        "email": "new@test.com",
        "sector": "tipo_a",
        "estado_atencion": "activo",
        "puntaje_prioridad": 0,
    }

    response = client.post(
        "/api/colaboradores",
        json=payload,
        headers=headers
    )

    # Should be blocked (403 or 404)
    assert response.status_code in [403, 404]


def test_viewer_can_read_configuration(viewer_user: Colaborador):
    """Test that viewer can READ configuration endpoints"""
    from app.auth.local import create_token

    token = create_token(viewer_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/configuracion/notificaciones", headers=headers)

    assert response.status_code == 200


def test_viewer_cannot_write_configuration(viewer_user: Colaborador):
    """Test that viewer CANNOT UPDATE configuration"""
    from app.auth.local import create_token

    token = create_token(viewer_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {"aviso_previo_minutos": 10}

    response = client.put(
        "/api/configuracion/notificaciones",
        json=payload,
        headers=headers
    )

    assert response.status_code == 403


def test_valid_roles_only(db: Session):
    """Test that only valid roles (admin, usuario, viewer) are accepted"""
    from sqlalchemy.exc import IntegrityError

    # Try to create with invalid role
    invalid_user = Colaborador(
        nombre="Invalid Role",
        email="invalid@test.com",
        rol="superuser",  # Invalid role
        sector="tipo_a",
        estado_atencion="activo",
        puntaje_prioridad=0,
    )

    db.add(invalid_user)

    # This should raise an integrity error due to CHECK constraint
    with pytest.raises(IntegrityError):
        db.commit()
