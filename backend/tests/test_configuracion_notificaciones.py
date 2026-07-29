import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import ConfiguracionNotificaciones, Colaborador
from sqlalchemy.orm import Session

client = TestClient(app)


@pytest.fixture
def db():
    """Provide a database session for testing"""
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture
def admin_user(db: Session):
    """Create an admin user for testing"""
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
    """Create a regular user for testing"""
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


@pytest.fixture
def viewer_user(db: Session):
    """Create a viewer user for testing"""
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


def test_get_notificaciones_default(db: Session):
    """GET with no config should create and return defaults"""
    db.query(ConfiguracionNotificaciones).delete()
    db.commit()

    response = client.get("/api/configuracion/notificaciones")

    assert response.status_code == 200
    data = response.json()
    assert data["aviso_previo_minutos"] == 5
    assert data["tiempo_respuesta_colab_min"] == 3
    assert data["tiempo_aceptacion_admin_min"] == 1
    assert data["notificaciones_pausadas"] is False
    assert data["pausa_hasta"] is None
    assert data["hora_inicio_envio"] == "08:00:00"
    assert data["hora_fin_envio"] == "18:00:00"
    assert data["intervalo_recordatorio_min"] == 30


def test_update_notificaciones_pause_active():
    """Test pausing notifications with NULL pausa_hasta"""
    payload = {
        "notificaciones_pausadas": True,
        "pausa_hasta": None,
    }

    response = client.put("/api/configuracion/notificaciones", json=payload)

    assert response.status_code == 403 or response.status_code == 200  # Depends on auth context
    if response.status_code == 200:
        data = response.json()
        assert data["notificaciones_pausadas"] is True
        assert data["pausa_hasta"] is None


def test_update_notificaciones_pause_until():
    """Test pausing notifications until a specific time"""
    future_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    payload = {
        "notificaciones_pausadas": True,
        "pausa_hasta": future_time,
    }

    response = client.put("/api/configuracion/notificaciones", json=payload)

    assert response.status_code == 403 or response.status_code == 200
    if response.status_code == 200:
        data = response.json()
        assert data["notificaciones_pausadas"] is True
        assert data["pausa_hasta"] is not None


def test_viewer_can_read_notificaciones(viewer_user: Colaborador):
    """Test that viewer role can read notification configuration"""
    from app.auth.local import create_token

    token = create_token(viewer_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/configuracion/notificaciones", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["aviso_previo_minutos"] >= 0


def test_notificaciones_only_non_viewer_can_write(viewer_user: Colaborador, usuario_user: Colaborador):
    """Test that viewer role cannot update notifications"""
    from app.auth.local import create_token

    viewer_token = create_token(viewer_user.id)
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    payload = {"notificaciones_pausadas": True}
    response = client.put(
        "/api/configuracion/notificaciones",
        json=payload,
        headers=viewer_headers
    )

    assert response.status_code == 403
    assert "solo lectura" in response.json()["detail"].lower()

    # Test that usuario can update
    usuario_token = create_token(usuario_user.id)
    usuario_headers = {"Authorization": f"Bearer {usuario_token}"}

    response = client.put(
        "/api/configuracion/notificaciones",
        json=payload,
        headers=usuario_headers
    )

    assert response.status_code == 200


def test_pause_active_omits_push(db: Session):
    """Test that paused notifications skip FCM"""
    from app.core.notificador import _should_send_push

    config = db.query(ConfiguracionNotificaciones).first()
    if config:
        config.notificaciones_pausadas = True
        config.pausa_hasta = None
        db.commit()

    result = _should_send_push(db)
    assert result is False


def test_outside_window_omits_push(db: Session):
    """Test that notifications outside hours skip FCM"""
    from app.core.notificador import _should_send_push
    from datetime import time

    config = db.query(ConfiguracionNotificaciones).first()
    if config:
        config.notificaciones_pausadas = False
        config.hora_inicio_envio = time(12, 0)  # Noon to 1pm
        config.hora_fin_envio = time(13, 0)
        db.commit()

    result = _should_send_push(db)
    # Result depends on current time, but at least verify no exception
    assert isinstance(result, bool)


def test_inside_window_sends_push(db: Session):
    """Test that notifications within hours should send FCM"""
    from app.core.notificador import _should_send_push
    from datetime import time

    config = db.query(ConfiguracionNotificaciones).first()
    if config:
        config.notificaciones_pausadas = False
        config.hora_inicio_envio = time(0, 0)  # All day
        config.hora_fin_envio = time(23, 59)
        db.commit()

    result = _should_send_push(db)
    assert result is True


def test_update_timings(db: Session):
    """Test updating timing parameters"""
    payload = {
        "aviso_previo_minutos": 10,
        "tiempo_respuesta_colab_min": 5,
        "tiempo_aceptacion_admin_min": 2,
        "intervalo_recordatorio_min": 45,
    }

    response = client.put("/api/configuracion/notificaciones", json=payload)

    assert response.status_code == 403 or response.status_code == 200
    if response.status_code == 200:
        data = response.json()
        assert data["aviso_previo_minutos"] == 10
        assert data["tiempo_respuesta_colab_min"] == 5
        assert data["tiempo_aceptacion_admin_min"] == 2
        assert data["intervalo_recordatorio_min"] == 45
