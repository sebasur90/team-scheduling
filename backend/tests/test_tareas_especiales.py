import pytest
from datetime import time
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import Colaborador, TareaEspecialTipo, ColaboradorTareaTipo
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
        email="admin.tarea@test.com",
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
        email="usuario.tarea@test.com",
        rol="usuario",
        sector="tipo_a",
        estado_atencion="activo",
        puntaje_prioridad=0,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


class TestTareasEspeciales:
    """Tests for special tasks CRUD endpoints"""

    def test_list_tipos_empty(self, db: Session):
        """GET /tareas-especiales/tipos should return empty list initially"""
        db.query(TareaEspecialTipo).delete()
        db.commit()

        response = client.get("/api/tareas-especiales/tipos")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_tipo_as_admin(self, db: Session, admin_user):
        """POST /tareas-especiales/tipos should create a new type (admin only)"""
        payload = {
            "nombre": "municipalidad",
            "dia_semana_aplicable": [0, 1, 2, 3, 4],
            "hora_inicio": "08:00:00",
            "hora_fin": "12:00:00",
        }

        # Clean up existing tipos
        db.query(TareaEspecialTipo).filter_by(nombre="municipalidad").delete()
        db.commit()

        response = client.post("/api/tareas-especiales/tipos", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["nombre"] == "municipalidad"
        assert data["dia_semana_aplicable"] == [0, 1, 2, 3, 4]
        assert "id" in data

    def test_create_tipo_duplicate_name(self, db: Session, admin_user):
        """POST with duplicate nombre should return 409 Conflict"""
        tipo = TareaEspecialTipo(
            nombre="duplicate_test",
            dia_semana_aplicable=[0, 1, 2],
            hora_inicio=time(8, 0),
            hora_fin=time(12, 0),
        )
        db.add(tipo)
        db.commit()

        payload = {
            "nombre": "duplicate_test",
            "dia_semana_aplicable": [0, 1, 2, 3, 4],
            "hora_inicio": "08:00:00",
            "hora_fin": "12:00:00",
        }

        response = client.post("/api/tareas-especiales/tipos", json=payload)
        assert response.status_code == 409

    def test_update_tipo_as_admin(self, db: Session, admin_user):
        """PUT /tareas-especiales/tipos/{id} should update a type (admin only)"""
        tipo = TareaEspecialTipo(
            nombre="update_test",
            dia_semana_aplicable=[0, 1],
            hora_inicio=time(8, 0),
            hora_fin=time(12, 0),
        )
        db.add(tipo)
        db.commit()
        db.refresh(tipo)

        payload = {
            "dia_semana_aplicable": [0, 1, 2, 3, 4],
            "hora_fin": "14:00:00",
        }

        response = client.put(f"/api/tareas-especiales/tipos/{tipo.id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["dia_semana_aplicable"] == [0, 1, 2, 3, 4]

    def test_delete_tipo_without_assignments(self, db: Session, admin_user):
        """DELETE /tareas-especiales/tipos/{id} should succeed if no assignments"""
        tipo = TareaEspecialTipo(
            nombre="delete_test",
            dia_semana_aplicable=[0, 1],
            hora_inicio=time(8, 0),
            hora_fin=time(12, 0),
        )
        db.add(tipo)
        db.commit()
        tipo_id = tipo.id

        response = client.delete(f"/api/tareas-especiales/tipos/{tipo_id}")
        assert response.status_code == 204

        # Verify deleted
        deleted = db.query(TareaEspecialTipo).filter_by(id=tipo_id).first()
        assert deleted is None

    def test_delete_tipo_with_assignments_fails(self, db: Session, admin_user, usuario_user):
        """DELETE should return 409 if tipo has active assignments"""
        tipo = TareaEspecialTipo(
            nombre="delete_with_assign",
            dia_semana_aplicable=[0, 1],
            hora_inicio=time(8, 0),
            hora_fin=time(12, 0),
        )
        db.add(tipo)
        db.commit()
        db.refresh(tipo)

        # Create assignment
        assignment = ColaboradorTareaTipo(
            colaborador_id=usuario_user.id,
            tarea_tipo_id=tipo.id,
        )
        db.add(assignment)
        db.commit()

        response = client.delete(f"/api/tareas-especiales/tipos/{tipo.id}")
        assert response.status_code == 409


class TestColaboradorTareasIntegration:
    """Tests for colaborador creation/update with tarea_tipos_ids"""

    def test_create_colaborador_with_tareas(self, db: Session, admin_user):
        """POST /colaboradores should create assignments via junction table"""
        # Create task types first
        tipo1 = TareaEspecialTipo(
            nombre="t1_create",
            dia_semana_aplicable=[0, 1, 2],
            hora_inicio=time(8, 0),
            hora_fin=time(12, 0),
        )
        tipo2 = TareaEspecialTipo(
            nombre="t2_create",
            dia_semana_aplicable=[0, 1, 2],
            hora_inicio=time(8, 0),
            hora_fin=time(12, 0),
        )
        db.add_all([tipo1, tipo2])
        db.commit()
        db.refresh(tipo1)
        db.refresh(tipo2)

        payload = {
            "nombre": "Nuevo Colaborador",
            "email": "nuevo.colab@test.com",
            "sector": "tipo_a",
            "estado_atencion": "activo",
            "rol": "usuario",
            "tarea_tipo_ids": [tipo1.id, tipo2.id],
        }

        response = client.post("/api/colaboradores", json=payload)
        assert response.status_code == 200
        data = response.json()
        new_id = data["id"]

        # Verify junction entries were created
        colab = db.query(Colaborador).filter_by(id=new_id).first()
        assert colab is not None
        assert len(colab.tareas_habilitadas) == 2
        assert {t.tarea_tipo_id for t in colab.tareas_habilitadas} == {tipo1.id, tipo2.id}

    def test_update_colaborador_tareas(self, db: Session, admin_user, usuario_user):
        """PATCH /colaboradores/{id} should update junction table entries"""
        # Create task type
        tipo1 = TareaEspecialTipo(
            nombre="t1_update",
            dia_semana_aplicable=[0, 1, 2],
            hora_inicio=time(8, 0),
            hora_fin=time(12, 0),
        )
        tipo2 = TareaEspecialTipo(
            nombre="t2_update",
            dia_semana_aplicable=[0, 1, 2],
            hora_inicio=time(8, 0),
            hora_fin=time(12, 0),
        )
        db.add_all([tipo1, tipo2])
        db.commit()
        db.refresh(tipo1)
        db.refresh(tipo2)

        # Create initial assignment
        assignment = ColaboradorTareaTipo(
            colaborador_id=usuario_user.id,
            tarea_tipo_id=tipo1.id,
        )
        db.add(assignment)
        db.commit()

        # Update to replace tipo1 with tipo2
        payload = {
            "tarea_tipo_ids": [tipo2.id],
        }

        response = client.patch(f"/api/colaboradores/{usuario_user.id}", json=payload)
        assert response.status_code == 200

        # Verify junction table updated
        db.refresh(usuario_user)
        assert len(usuario_user.tareas_habilitadas) == 1
        assert usuario_user.tareas_habilitadas[0].tarea_tipo_id == tipo2.id
