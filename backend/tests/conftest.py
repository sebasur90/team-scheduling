import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base
from app.models import (
    Colaborador, FranjaHoraria, TurnoAlmuerzo, AsignacionAlmuerzo,
    TareaEspecialTipo, TareaEspecialAsignacion,
    Ausencia, SwapSolicitud, Notificacion, ConfiguracionCobertura
)
from datetime import time, date, timedelta


@pytest.fixture(scope="session")
def db_engine():
    """Create in-memory test database"""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a fresh session for each test"""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def test_franjas(db_session):
    """Create the 5 fixed franjas"""
    franjas = [
        FranjaHoraria(hora_inicio=time(12, 0), hora_fin=time(12, 45), orden=1),
        FranjaHoraria(hora_inicio=time(12, 30), hora_fin=time(13, 15), orden=2),
        FranjaHoraria(hora_inicio=time(13, 0), hora_fin=time(13, 45), orden=3),
        FranjaHoraria(hora_inicio=time(13, 30), hora_fin=time(14, 15), orden=4),
        FranjaHoraria(hora_inicio=time(14, 0), hora_fin=time(14, 45), orden=5),
    ]
    for f in franjas:
        db_session.add(f)
    db_session.commit()
    return franjas


@pytest.fixture
def test_colaboradores(db_session):
    """Create 13 test colaboradores (7 Tipo-A, 6 Tipo-B)"""
    nombres_tipo_a = ["Juan", "Maria", "Carlos", "Ana", "Luis", "Sofia", "Pedro"]
    nombres_tipo_b = ["Elena", "Jorge", "Rita", "Gabriel", "Martina", "Patricia"]

    colabs = []
    for i, nombre in enumerate(nombres_tipo_a):
        colab = Colaborador(
            nombre=nombre,
            email=f"{nombre.lower()}@example.com",
            sector="tipo_a",
            estado_atencion="activo",
            rol="usuario",
            puntaje_prioridad=0,
        )
        db_session.add(colab)
        colabs.append(colab)

    for i, nombre in enumerate(nombres_tipo_b):
        colab = Colaborador(
            nombre=nombre,
            email=f"{nombre.lower()}@example.com",
            sector="tipo_b",
            estado_atencion="activo",
            rol="usuario",
            puntaje_prioridad=0,
        )
        db_session.add(colab)
        colabs.append(colab)

    db_session.commit()
    return colabs


@pytest.fixture
def test_special_tasks(db_session):
    """Create the 3 special task types"""
    tasks = [
        TareaEspecialTipo(nombre="tarea_especial_1", dia_semana_aplicable=[0, 1, 2, 3, 4],
                          hora_inicio=time(10, 0), hora_fin=time(15, 0)),
        TareaEspecialTipo(nombre="tarea_especial_2", dia_semana_aplicable=[2],
                          hora_inicio=time(11, 0), hora_fin=time(13, 0)),
        TareaEspecialTipo(nombre="tarea_especial_3", dia_semana_aplicable=[3],
                          hora_inicio=time(10, 0), hora_fin=time(13, 0)),
    ]
    for t in tasks:
        db_session.add(t)
    db_session.commit()
    return tasks


@pytest.fixture
def test_configuracion_cobertura(db_session):
    """Create default coverage configuration"""
    config = ConfiguracionCobertura(minimo_tipo_a=1, minimo_tipo_b=1)
    db_session.add(config)
    db_session.commit()
    return config
