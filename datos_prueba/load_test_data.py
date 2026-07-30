"""
Script para cargar datos de prueba en la base de datos.
Ejecutar desde el directorio raíz del proyecto:
    python datos_prueba/load_test_data.py
"""

import json
import sys
import os
from pathlib import Path
from datetime import datetime, time as dt_time, date as dt_date, timedelta
import random

# Agregar el backend al path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import SessionLocal, engine
from app.models.base import Base
from app.models.sector import Sector
from app.models.franja_horaria import FranjaHoraria
from app.models.colaborador import Colaborador
from app.models.tarea_especial import TareaEspecialTipo, ColaboradorTareaTipo, TareaEspecialAsignacion
from app.models.turno import AsignacionAlmuerzo, TurnoAlmuerzo
from app.models.swap import SwapSolicitud
from app.models.incidencia import IncidenciaCobertura, HistorialReemplazo
from app.models.ausencia import Ausencia
from app.config import DATABASE_URL

def load_json_data():
    """Carga el archivo JSON con los datos de prueba."""
    json_file = Path(__file__).parent / "datos_ejemplo.json"
    with open(json_file, "r", encoding="utf-8") as f:
        return json.load(f)

def clear_database(db: Session):
    """Limpia las tablas de la base de datos (excepto usuarios admin y sectores en uso).

    Preserva los usuarios admin para no interrumpir autenticaciones.
    """
    print("🗑️  Limpiando base de datos...")
    try:
        # Limpiar en orden inverso de dependencias

        # 1. Limpiar ausencias/vacaciones
        db.query(Ausencia).delete()

        # 2. Limpiar historial de reemplazos (depende de incidencias)
        db.query(HistorialReemplazo).delete()

        # 3. Limpiar swaps (depende de asignacion_almuerzo)
        db.query(SwapSolicitud).delete()

        # 4. Limpiar incidencias (depende de asignacion_almuerzo)
        db.query(IncidenciaCobertura).delete()

        # 5. Limpiar asignaciones de almuerzo (depende de colaborador)
        db.query(AsignacionAlmuerzo).delete()

        # 6. Limpiar turnos de almuerzo
        db.query(TurnoAlmuerzo).delete()

        # 7. Limpiar asignaciones de tareas a colaboradores
        db.query(ColaboradorTareaTipo).delete()

        # 8. Limpiar tipos de tareas especiales
        db.query(TareaEspecialTipo).delete()

        # 9. Limpiar colaboradores NO-ADMIN
        db.query(Colaborador).filter(Colaborador.es_admin == False).delete()

        # 10. Limpiar franjas horarias
        db.query(FranjaHoraria).delete()

        # NOTA: No se borran los sectores porque pueden estar en uso por el admin
        # Los sectores se actualizan (upsert) en load_sectores()

        db.commit()
        print("✅ Base de datos limpiada (✓ usuarios admin y sectores preservados)")
    except Exception as e:
        print(f"⚠️  Error al limpiar: {e}")
        db.rollback()
        raise

def load_sectores(db: Session, data: dict):
    """Carga los sectores (upsert - actualiza si existe)."""
    print("\n📦 Cargando sectores...")
    sectores_map = {}

    for sector_data in data["sectores"]:
        # Buscar si el sector ya existe (case-insensitive)
        sector = db.query(Sector).filter(
            func.lower(Sector.nombre) == func.lower(sector_data["nombre"])
        ).first()

        if sector:
            # Actualizar datos del sector existente
            sector.capacidad_maxima = sector_data["capacidad_maxima"]
            sector.minimo_cobertura = sector_data["minimo_cobertura"]
            sector.participa_almuerzo = sector_data["participa_almuerzo"]
            sector.color = sector_data["color"]
            sector.acceso_rol = sector_data["acceso_rol"]
            db.flush()
            print(f"  ✓ {sector.nombre} actualizado (ID: {sector.id})")
        else:
            # Crear nuevo sector
            sector = Sector(
                nombre=sector_data["nombre"],
                capacidad_maxima=sector_data["capacidad_maxima"],
                minimo_cobertura=sector_data["minimo_cobertura"],
                participa_almuerzo=sector_data["participa_almuerzo"],
                color=sector_data["color"],
                acceso_rol=sector_data["acceso_rol"]
            )
            db.add(sector)
            db.flush()
            print(f"  ✓ {sector.nombre} creado (ID: {sector.id})")

        sectores_map[sector.nombre] = sector.id

    db.commit()
    return sectores_map

def load_franjas_horarias(db: Session, data: dict):
    """Carga las franjas horarias."""
    print("\n⏰ Cargando franjas horarias...")
    franjas_map = {}

    for franja_data in data["franjas_horarias"]:
        capacidad = franja_data.get("capacidad_maxima", 2)
        franja = FranjaHoraria(
            orden=franja_data["orden"],
            hora_inicio=datetime.strptime(franja_data["hora_inicio"], "%H:%M").time(),
            hora_fin=datetime.strptime(franja_data["hora_fin"], "%H:%M").time(),
            capacidad_maxima=capacidad
        )
        db.add(franja)
        db.flush()
        franjas_map[franja.orden] = franja.id
        print(f"  ✓ Franja {franja.orden}: {franja.hora_inicio}-{franja.hora_fin} (cap. {capacidad}) (ID: {franja.id})")

    db.commit()
    return franjas_map

def load_colaboradores(db: Session, data: dict, sectores_map: dict, franjas_map: dict):
    """Carga los colaboradores."""
    print("\n👥 Cargando colaboradores...")
    colaboradores_map = {}

    # Lista de IDs de franjas disponibles para asignar aleatoriamente
    franjas_ids = list(franjas_map.values())

    for colab_data in data["colaboradores"]:
        sector_id = sectores_map[colab_data["sector"]]
        # Asignar franja preferida aleatoria
        franja_id = random.choice(franjas_ids)

        colab = Colaborador(
            nombre=colab_data["nombre"],
            email=colab_data["email"],
            sector_id=sector_id,
            rol=colab_data["rol"],
            estado_atencion=colab_data["estado_atencion"],
            puntaje_prioridad=colab_data["puntaje_prioridad"],
            franja_preferida_id=franja_id
        )
        db.add(colab)
        db.flush()
        colaboradores_map[colab.email] = colab.id
        franja_orden = [orden for orden, fid in franjas_map.items() if fid == franja_id][0]
        print(f"  ✓ {colab.nombre} ({colab_data['sector']}) - Franja pref: {franja_orden} (aleatoria)")

    db.commit()
    print(f"\n✅ Total colaboradores cargados: {len(colaboradores_map)}")
    return colaboradores_map

def load_tareas_especiales(db: Session, data: dict):
    """Carga las tareas especiales."""
    print("\n🎯 Cargando tareas especiales...")
    tareas_map = {}

    for tarea_data in data["tareas_especiales"]:
        dias_semana = tarea_data["dias_semana"]
        dias_nombres = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
        dias_str = ", ".join([dias_nombres[d] for d in dias_semana])

        tarea = TareaEspecialTipo(
            nombre=tarea_data["nombre"],
            dia_semana_aplicable=dias_semana,
            hora_inicio=datetime.strptime(tarea_data["hora_inicio"], "%H:%M").time(),
            hora_fin=datetime.strptime(tarea_data["hora_fin"], "%H:%M").time()
        )
        db.add(tarea)
        db.flush()
        tareas_map[tarea.nombre] = tarea.id
        print(f"  ✓ {tarea.nombre}: {dias_str} ({tarea.hora_inicio}-{tarea.hora_fin}) (ID: {tarea.id})")

    db.commit()
    return tareas_map

def assign_special_tasks(db: Session):
    """Asigna tareas especiales a 4 usuarios totales (2 por tarea)."""
    print("\n🎯 Asignando tareas especiales a colaboradores...")

    # Obtener lista de colaboradores
    colaboradores = db.query(Colaborador).filter(Colaborador.es_admin == False).all()

    if not colaboradores:
        print("  ⚠️  No hay colaboradores para asignar tareas")
        return

    # Obtener tareas
    tareas_especiales = db.query(TareaEspecialTipo).all()

    if not tareas_especiales:
        print("  ⚠️  No hay tareas especiales para asignar")
        return

    try:
        # Seleccionar 4 colaboradores aleatorios totales
        num_total = 4
        colaboradores_seleccionados = random.sample(colaboradores, min(num_total, len(colaboradores)))

        # Distribuir entre las tareas (2 por tarea)
        colaboradores_por_tarea = 2
        indice = 0

        for tarea in tareas_especiales:
            # Tomar 2 colaboradores para esta tarea
            inicio = indice
            fin = min(indice + colaboradores_por_tarea, len(colaboradores_seleccionados))
            colabs_tarea = colaboradores_seleccionados[inicio:fin]

            for colab in colabs_tarea:
                # Habilitar colaborador para esta tarea
                habilitacion = ColaboradorTareaTipo(
                    colaborador_id=colab.id,
                    tarea_tipo_id=tarea.id
                )
                db.add(habilitacion)

            indice = fin
            print(f"  ✓ {tarea.nombre}: {len(colabs_tarea)} colaboradores habilitados")

        db.commit()
        print(f"  ✅ Total 4 colaboradores con tareas especiales asignadas")

    except Exception as e:
        print(f"  ⚠️  Error al asignar tareas: {e}")
        db.rollback()

def load_vacaciones(db: Session, data: dict):
    """Carga las vacaciones de los colaboradores."""
    print("\n🏖️  Cargando vacaciones...")

    if "vacaciones" not in data:
        print("  ⚠️  No hay datos de vacaciones en el archivo JSON")
        return

    vacaciones_cargadas = 0
    try:
        # Obtener lista de colaboradores
        colaboradores = db.query(Colaborador).filter(Colaborador.es_admin == False).all()
        colab_map = {i: colab for i, colab in enumerate(colaboradores, 1)}

        for vac_data in data["vacaciones"]:
            colab_index = vac_data["colaborador_index"]
            if colab_index not in colab_map:
                continue

            colab = colab_map[colab_index]
            fecha = datetime.strptime(vac_data["fecha"], "%Y-%m-%d").date()

            ausencia = Ausencia(
                colaborador_id=colab.id,
                fecha=fecha,
                motivo=vac_data["motivo"]
            )
            db.add(ausencia)
            vacaciones_cargadas += 1

        db.commit()
        print(f"  ✅ Total vacaciones cargadas: {vacaciones_cargadas}")

    except Exception as e:
        print(f"  ⚠️  Error al cargar vacaciones: {e}")
        db.rollback()

def ensure_admin(db: Session):
    """Asegura que exista el usuario admin."""
    print("\n🔐 Verificando usuario admin...")
    ADMIN_EMAIL = "sebassur90@gmail.com"

    try:
        admin = db.query(Colaborador).filter(Colaborador.email == ADMIN_EMAIL).first()

        if admin:
            if not admin.es_admin:
                admin.es_admin = True
                admin.rol = "admin"
                db.commit()
                print(f"  ✓ Admin user actualizado: {ADMIN_EMAIL}")
            else:
                print(f"  ✓ Admin user ya existe: {ADMIN_EMAIL}")
        else:
            # Obtener o crear sector operativo (case-insensitive)
            sector = db.query(Sector).filter(
                func.lower(Sector.nombre) == "operativo"
            ).first()

            if not sector:
                sector = Sector(nombre="Operativo", capacidad_maxima=10, minimo_cobertura=2, color="#22c55e")
                db.add(sector)
                db.flush()
                print(f"  ✓ Created 'Operativo' sector for admin")

            # Crear admin
            admin = Colaborador(
                nombre="Administrador",
                email=ADMIN_EMAIL,
                sector_id=sector.id,
                estado_atencion="activo",
                es_admin=True,
                rol="admin"
            )
            db.add(admin)
            db.commit()
            print(f"  ✓ Admin user creado: {ADMIN_EMAIL}")

    except Exception as e:
        print(f"  ⚠️  Error al verificar admin: {e}")
        db.rollback()

def main():
    """Función principal."""
    print("=" * 60)
    print("🚀 Cargador de Datos de Prueba")
    print("=" * 60)

    # Verificar conexión a BD
    print(f"\n📊 Base de datos: {DATABASE_URL}")

    # Crear tablas si no existen
    print("\n📋 Creando tablas si no existen...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas verificadas/creadas")

    # Cargar datos
    db = SessionLocal()
    try:
        # Limpiar BD
        clear_database(db)

        # Cargar datos desde JSON
        data = load_json_data()
        print(f"\n📂 Datos cargados desde: datos_ejemplo.json")

        # Cargar en orden de dependencias
        sectores_map = load_sectores(db, data)
        franjas_map = load_franjas_horarias(db, data)
        colaboradores_map = load_colaboradores(db, data, sectores_map, franjas_map)
        tareas_map = load_tareas_especiales(db, data)

        # Asignar tareas especiales a colaboradores
        assign_special_tasks(db)

        # Cargar vacaciones
        load_vacaciones(db, data)

        # Asegurar que existe el admin
        ensure_admin(db)

        # Resumen
        print("\n" + "=" * 60)
        print("✅ DATOS CARGADOS EXITOSAMENTE")
        print("=" * 60)
        print(f"\n📊 Resumen:")
        print(f"  • Sectores: {len(sectores_map)}")
        print(f"  • Franjas horarias: {len(franjas_map)}")
        print(f"  • Colaboradores: {len(colaboradores_map)}")
        print(f"  • Tareas especiales: {len(tareas_map)}")
        vacaciones_count = len(data.get("vacaciones", []))
        print(f"  • Vacaciones: {vacaciones_count}")

        print(f"\n🎯 Tareas especiales disponibles:")
        for tarea_name in tareas_map.keys():
            print(f"  • {tarea_name}")

        print(f"\n📋 Sectores cargados:")
        for sector_name, sector_id in sectores_map.items():
            print(f"  • {sector_name} (ID: {sector_id})")

        print("\n💡 Próximos pasos:")
        print("  1. Iniciar el backend: cd backend && python -m uvicorn app.main:app --reload")
        print("  2. Iniciar el frontend: cd frontend && npm run dev")
        print("  3. Acceder a: http://localhost:5173")
        print("\n" + "=" * 60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
