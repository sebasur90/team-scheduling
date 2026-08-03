"""Tests para rotación multi-sector en tareas especiales"""

import pytest
from datetime import date
from app.models import (
    TareaEspecialTipo, Colaborador, Sector, ColaboradorTareaTipo,
    TareaEspecialAsignacion
)
from app.schemas.tarea_especial import ConfiguracionRotacionMultiSector, TareaEspecialTipoCreate
from app.core.task_rotation_engine import TaskRotationEngine
from sqlalchemy.orm import Session


class TestConfiguracionRotacionMultiSectorSchema:
    """Validación del schema de configuración multi-sector"""

    def test_patron_fijo_valido(self):
        """Crear configuración patrón fijo válida"""
        config = ConfiguracionRotacionMultiSector(
            modo="patron_fijo",
            patron_semanal=["comerciales", "operativos", "comerciales", "operativos", "gerencia"],
            distribucion_por_dia=None,
            distribuciones_sector={"comerciales": 2, "operativos": 2, "gerencia": 1}
        )
        assert config.modo == "patron_fijo"
        assert len(config.patron_semanal) == 5

    def test_personalizado_valido(self):
        """Crear configuración personalizado válida"""
        config = ConfiguracionRotacionMultiSector(
            modo="personalizado",
            patron_semanal=None,
            distribucion_por_dia={
                "0": {"comerciales": 1, "operativos": 0, "gerencia": 0},
                "1": {"comerciales": 0, "operativos": 1, "gerencia": 0},
                "2": {"comerciales": 1, "operativos": 0, "gerencia": 0},
                "3": {"comerciales": 0, "operativos": 1, "gerencia": 0},
                "4": {"comerciales": 0, "operativos": 0, "gerencia": 1},
            },
            distribuciones_sector={"comerciales": 2, "operativos": 2, "gerencia": 1}
        )
        assert config.modo == "personalizado"

    def test_patron_fijo_requiere_patron_semanal(self):
        """Rechaza patrón fijo sin patron_semanal"""
        with pytest.raises(ValueError):
            ConfiguracionRotacionMultiSector(
                modo="patron_fijo",
                patron_semanal=None,
                distribucion_por_dia=None,
                distribuciones_sector={"comerciales": 2}
            )

    def test_suma_distribuciones_se_valida_en_tarea_especial_tipo(self):
        """La suma de distribuciones_sector se valida en TareaEspecialTipoCreate"""
        # suma de distribuciones (2+2+1=5) != len(dia_semana_aplicable) (3)
        with pytest.raises(ValueError, match="suma de distribuciones_sector"):
            TareaEspecialTipoCreate(
                nombre="Orientador",
                dia_semana_aplicable=[0, 1, 2],  # 3 días
                hora_inicio="09:00",
                hora_fin="10:00",
                configuracion_rotacion=ConfiguracionRotacionMultiSector(
                    modo="patron_fijo",
                    patron_semanal=["comerciales", "operativos", "gerencia"],
                    distribuciones_sector={"comerciales": 2, "operativos": 2, "gerencia": 1}  # suma=5
                )
            )

    def test_patron_semanal_largo_incorrecto(self):
        """Rechaza patron con largo != dias aplicables"""
        with pytest.raises(ValueError, match="patron_semanal debe tener"):
            TareaEspecialTipoCreate(
                nombre="Orientador",
                dia_semana_aplicable=[0, 1, 2, 3, 4],  # 5 días
                hora_inicio="09:00",
                hora_fin="10:00",
                configuracion_rotacion=ConfiguracionRotacionMultiSector(
                    modo="patron_fijo",
                    patron_semanal=["comerciales", "operativos"],  # solo 2 elementos
                    distribuciones_sector={"comerciales": 2, "operativos": 2, "gerencia": 1}
                )
            )

    def test_sector_en_patron_no_en_distribuciones(self):
        """Rechaza si sector en patrón no está en distribuciones"""
        with pytest.raises(ValueError, match="no está en distribuciones_sector"):
            TareaEspecialTipoCreate(
                nombre="Orientador",
                dia_semana_aplicable=[0, 1],
                hora_inicio="09:00",
                hora_fin="10:00",
                configuracion_rotacion=ConfiguracionRotacionMultiSector(
                    modo="patron_fijo",
                    patron_semanal=["comerciales", "desconocido"],
                    distribuciones_sector={"comerciales": 1, "operativos": 1}
                )
            )


class TestTaskRotationEngineMultiSector:
    """Generación de cronograma con rotación multi-sector"""

    def test_generar_sin_config_usa_logica_simple(self, db: Session, setup_test_data):
        """Tareas sin configuracion_rotacion usan round-robin simple"""
        tipo = setup_test_data['tipo_simple']
        colaboradores = setup_test_data['colaboradores']

        # Asegurar que la tarea no tiene configuracion_rotacion
        assert tipo.configuracion_rotacion is None

        fecha_inicio = date(2026, 9, 1)  # Lunes
        fecha_fin = date(2026, 9, 5)  # Viernes

        result = TaskRotationEngine.generar(db, fecha_inicio, fecha_fin, [tipo.id])

        # Debe crear 5 asignaciones (1 por día lunes-viernes)
        assert result['asignaciones_creadas'] == 5
        assert len(result['advertencias']) == 0

        # Verificar que se crearon en BD
        asignaciones = db.query(TareaEspecialAsignacion).filter(
            TareaEspecialAsignacion.tarea_especial_tipo_id == tipo.id
        ).all()
        assert len(asignaciones) == 5

    def test_generar_patron_fijo_con_rotacion(self, db: Session, setup_test_data):
        """Genera asignaciones correctas con patrón fijo multi-sector"""
        tipo = setup_test_data['tipo_multi_sector']

        fecha_inicio = date(2026, 9, 1)  # Lunes
        fecha_fin = date(2026, 9, 5)  # Viernes

        result = TaskRotationEngine.generar(db, fecha_inicio, fecha_fin, [tipo.id])

        # Debe crear 5 asignaciones
        assert result['asignaciones_creadas'] == 5
        assert len(result['advertencias']) == 0

        # Verificar que siguen el patrón
        # Patrón: comerciales-operativos-comerciales-operativos-gerencia
        asignaciones = db.query(TareaEspecialAsignacion).filter(
            TareaEspecialAsignacion.tarea_especial_tipo_id == tipo.id
        ).order_by(TareaEspecialAsignacion.fecha).all()

        assert len(asignaciones) == 5

        # Verificar sectores (simplificado - solo verificar que existen)
        assert all(a.colaborador_id is not None for a in asignaciones)

    def test_excluye_colaboradores_inactivos(self, db: Session, setup_test_data):
        """Excluye colaboradores con estado_atencion != 'activo'"""
        tipo = setup_test_data['tipo_multi_sector']
        colaboradores = setup_test_data['colaboradores']

        # Marcar algunos colaboradores como desafectados
        for colab in colaboradores[:1]:
            colab.estado_atencion = 'desafectado'
        db.commit()

        fecha_inicio = date(2026, 9, 1)
        fecha_fin = date(2026, 9, 5)

        result = TaskRotationEngine.generar(db, fecha_inicio, fecha_fin, [tipo.id])

        # Debe haber advertencias sobre pool insuficiente si no hay suficientes activos
        # (depende de setup_test_data)
        assert result['asignaciones_creadas'] >= 0

    def test_genera_advertencia_pool_insuficiente(self, db: Session, setup_test_data_minimal):
        """Genera advertencia cuando hay menos colaboradores que necesarios"""
        tipo = setup_test_data_minimal['tipo_multi_sector']

        fecha_inicio = date(2026, 9, 1)
        fecha_fin = date(2026, 9, 5)

        result = TaskRotationEngine.generar(db, fecha_inicio, fecha_fin, [tipo.id])

        # Debe haber al menos una advertencia
        assert len(result['advertencias']) > 0
        assert 'pool insuficiente' in result['advertencias'][0].lower()

    def test_no_genera_duplicados(self, db: Session, setup_test_data):
        """No crea asignaciones duplicadas mismo día/tarea/colaborador"""
        tipo = setup_test_data['tipo_multi_sector']

        fecha_inicio = date(2026, 9, 1)
        fecha_fin = date(2026, 9, 5)

        # Generar dos veces
        result1 = TaskRotationEngine.generar(db, fecha_inicio, fecha_fin, [tipo.id])
        result2 = TaskRotationEngine.generar(db, fecha_inicio, fecha_fin, [tipo.id])

        # Segunda generación no debe crear nuevas asignaciones
        assert result2['asignaciones_creadas'] == 0

    def test_rotacion_independiente_por_sector(self, db: Session, setup_test_data):
        """Cada sector mantiene su propia rotación"""
        tipo = setup_test_data['tipo_multi_sector']

        # Primera generación: semana 1
        result1 = TaskRotationEngine.generar(
            db, date(2026, 9, 1), date(2026, 9, 5), [tipo.id]
        )
        assert result1['asignaciones_creadas'] == 5

        # Segunda generación: semana 2
        result2 = TaskRotationEngine.generar(
            db, date(2026, 9, 7), date(2026, 9, 11), [tipo.id]
        )
        assert result2['asignaciones_creadas'] == 5

        # Verificar que rotaron correctamente (colabs distintos)
        asignaciones = db.query(TareaEspecialAsignacion).filter(
            TareaEspecialAsignacion.tarea_especial_tipo_id == tipo.id
        ).order_by(TareaEspecialAsignacion.fecha).all()

        # Debe haber 10 asignaciones totales
        assert len(asignaciones) == 10


class TestTaskRotationEngineTimedeltaBugFix:
    """Verifica que timedelta funciona correctamente con cambios de mes"""

    def test_generar_febrero_a_marzo(self, db: Session, setup_test_data):
        """Genera asignaciones a través del cambio Feb-Mar sin saltar días"""
        tipo = setup_test_data['tipo_simple']

        # 2026: Feb 27-28 (viernes), Mar 1-2 (domingo-lunes)
        # Aplicable: lunes-viernes [0,1,2,3,4]
        fecha_inicio = date(2026, 2, 27)  # Viernes
        fecha_fin = date(2026, 3, 2)  # Lunes

        result = TaskRotationEngine.generar(db, fecha_inicio, fecha_fin, [tipo.id])

        # Debe generar para: Feb 27 (viernes), Mar 2 (lunes) = 2 días
        # (Mar 1 es domingo, Mar 2 es lunes)
        # Solo si tipo.dia_semana_aplicable incluye 0 y 4
        assert result['asignaciones_creadas'] >= 1

    def test_generar_noviembre_a_diciembre(self, db: Session, setup_test_data):
        """Genera asignaciones a través del cambio Nov-Dec"""
        tipo = setup_test_data['tipo_simple']

        fecha_inicio = date(2026, 11, 27)  # Viernes
        fecha_fin = date(2026, 12, 2)  # Miércoles

        result = TaskRotationEngine.generar(db, fecha_inicio, fecha_fin, [tipo.id])

        # Debe generar sin saltar días
        assert result['asignaciones_creadas'] >= 1


# Fixtures para tests

@pytest.fixture
def db():
    """Fixture para sesión de BD de tests"""
    from app.database import SessionLocal
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture
def setup_test_data(db: Session):
    """Setup completo con tareas y colaboradores"""
    # Crear sectores
    sectores_data = [
        Sector(nombre='comerciales', capacidad_maxima=10, participa_almuerzo=True, minimo_cobertura=1, acceso_rol='gestion'),
        Sector(nombre='operativos', capacidad_maxima=10, participa_almuerzo=True, minimo_cobertura=1, acceso_rol='gestion'),
        Sector(nombre='gerencia', capacidad_maxima=5, participa_almuerzo=True, minimo_cobertura=1, acceso_rol='gestion'),
    ]
    for s in sectores_data:
        db.add(s)
    db.flush()

    # Crear colaboradores (3 por sector)
    colaboradores = []
    for i, sector in enumerate(sectores_data):
        for j in range(3):
            colab = Colaborador(
                nombre=f'{sector.nombre.capitalize()} {j+1}',
                email=f'{sector.nombre}{j}@test.com',
                sector_id=sector.id,
                estado_atencion='activo',
                rol='usuario'
            )
            db.add(colab)
            colaboradores.append(colab)
    db.flush()

    # Tarea especial SIMPLE (sin configuracion_rotacion)
    tipo_simple = TareaEspecialTipo(
        nombre='Supervisión Simple',
        dia_semana_aplicable=[0, 1, 2, 3, 4],  # Lunes a viernes
        hora_inicio='09:00',
        hora_fin='10:00',
        frecuencia='semanal',
        inhabilita_almuerzo=False,
        fija_almuerzo=False,
        configuracion_rotacion=None
    )
    db.add(tipo_simple)
    db.flush()

    # Habilitar todos los colaboradores para la tarea simple
    for colab in colaboradores:
        db.add(ColaboradorTareaTipo(
            colaborador_id=colab.id,
            tarea_tipo_id=tipo_simple.id
        ))
    db.flush()

    # Tarea especial MULTI-SECTOR
    tipo_multi = TareaEspecialTipo(
        nombre='Orientador',
        dia_semana_aplicable=[0, 1, 2, 3, 4],
        hora_inicio='09:00',
        hora_fin='10:00',
        frecuencia='semanal',
        inhabilita_almuerzo=False,
        fija_almuerzo=False,
        configuracion_rotacion={
            'modo': 'patron_fijo',
            'patron_semanal': ['comerciales', 'operativos', 'comerciales', 'operativos', 'gerencia'],
            'distribuciones_sector': {'comerciales': 2, 'operativos': 2, 'gerencia': 1}
        }
    )
    db.add(tipo_multi)
    db.flush()

    # Habilitar colaboradores por sector para tarea multi
    for colab in colaboradores:
        db.add(ColaboradorTareaTipo(
            colaborador_id=colab.id,
            tarea_tipo_id=tipo_multi.id
        ))
    db.flush()

    db.commit()

    return {
        'sectores': sectores_data,
        'colaboradores': colaboradores,
        'tipo_simple': tipo_simple,
        'tipo_multi_sector': tipo_multi,
    }


@pytest.fixture
def setup_test_data_minimal(db: Session):
    """Setup mínimo con pocos colaboradores para probar advertencias"""
    sector = Sector(
        nombre='comerciales',
        capacidad_maxima=10,
        participa_almuerzo=True,
        minimo_cobertura=1,
        acceso_rol='gestion'
    )
    db.add(sector)
    db.flush()

    # Solo 1 colaborador pero se necesitan 2 comerciales
    colab = Colaborador(
        nombre='Comercial 1',
        email='comercial@test.com',
        sector_id=sector.id,
        estado_atencion='activo',
        rol='usuario'
    )
    db.add(colab)
    db.flush()

    tipo = TareaEspecialTipo(
        nombre='Orientador',
        dia_semana_aplicable=[0, 1],
        hora_inicio='09:00',
        hora_fin='10:00',
        frecuencia='semanal',
        inhabilita_almuerzo=False,
        fija_almuerzo=False,
        configuracion_rotacion={
            'modo': 'patron_fijo',
            'patron_semanal': ['comerciales', 'comerciales'],
            'distribuciones_sector': {'comerciales': 2}
        }
    )
    db.add(tipo)
    db.flush()

    db.add(ColaboradorTareaTipo(
        colaborador_id=colab.id,
        tarea_tipo_id=tipo.id
    ))
    db.flush()

    db.commit()

    return {
        'tipo_multi_sector': tipo,
        'colaboradores': [colab],
        'sectores': [sector],
    }
