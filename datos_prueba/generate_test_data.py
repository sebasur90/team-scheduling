"""
Script para generar datos de prueba para la aplicación de planificación de almuerzos.
Genera:
- 3 sectores (Operativo, Comercial, Gerencial)
- 4 franjas horarias de almuerzo
- 21 colaboradores (7 por sector)
- Tareas especiales (Gandulfo, Municipalidad)
"""

import json
import random
from datetime import time, datetime, timedelta

# Colores hexadecimales
COLORES = {
    "verde": "#22c55e",
    "naranja": "#f97316",
    "azul": "#3b82f6"
}

# Nombres de ejemplo
NOMBRES_OPERATIVO = [
    "Juan García", "María López", "Carlos Rodríguez", "Ana Martínez",
    "Pedro Fernández", "Laura Sánchez", "Roberto Díaz"
]

NOMBRES_COMERCIAL = [
    "Andrea Gutiérrez", "Diego Morales", "Sofia Reyes", "Alejandro Peña",
    "Catalina Torres", "Miguel Castro", "Valentina Ruiz"
]

NOMBRES_GERENCIAL = [
    "Fernando Molina", "Isabel Navarro", "Gonzalo Flores", "Roxana Acosta",
    "Eduardo Rojas", "Marcela Vargas", "Cristian Bravo"
]

def generate_sectors():
    """Genera los 3 sectores con su configuración."""
    return [
        {
            "nombre": "Operativo",
            "capacidad_maxima": 10,
            "minimo_cobertura": 2,
            "participa_almuerzo": True,
            "color": COLORES["verde"],
            "acceso_rol": "gestion"
        },
        {
            "nombre": "Comercial",
            "capacidad_maxima": 10,
            "minimo_cobertura": 3,
            "participa_almuerzo": True,
            "color": COLORES["naranja"],
            "acceso_rol": "gestion"
        },
        {
            "nombre": "Gerencial",
            "capacidad_maxima": 10,
            "minimo_cobertura": 1,
            "participa_almuerzo": False,
            "color": COLORES["azul"],
            "acceso_rol": "viewer"
        }
    ]

def generate_franjas_horarias():
    """Genera las 5 franjas horarias de almuerzo."""
    return [
        {
            "orden": 1,
            "hora_inicio": "12:00",
            "hora_fin": "12:45",
            "capacidad_maxima": 3
        },
        {
            "orden": 2,
            "hora_inicio": "12:30",
            "hora_fin": "13:15",
            "capacidad_maxima": 3
        },
        {
            "orden": 3,
            "hora_inicio": "13:00",
            "hora_fin": "13:45",
            "capacidad_maxima": 3
        },
        {
            "orden": 4,
            "hora_inicio": "13:30",
            "hora_fin": "14:15",
            "capacidad_maxima": 3
        },
        {
            "orden": 5,
            "hora_inicio": "14:00",
            "hora_fin": "14:45",
            "capacidad_maxima": 3
        }
    ]

def generate_colaboradores():
    """Genera 21 colaboradores (7 por sector) con preferencias aleatorias."""
    colaboradores = []

    # Operativo
    for i, nombre in enumerate(NOMBRES_OPERATIVO, 1):
        franja_pref = random.randint(1, 4)
        colaboradores.append({
            "nombre": nombre,
            "email": f"operativo.colaborador{i}@company.com",
            "sector": "Operativo",
            "rol": "usuario",
            "estado_atencion": "activo",
            "puntaje_prioridad": 0,
            "franja_preferida": franja_pref
        })

    # Comercial
    for i, nombre in enumerate(NOMBRES_COMERCIAL, 1):
        franja_pref = random.randint(1, 4)
        colaboradores.append({
            "nombre": nombre,
            "email": f"comercial.colaborador{i}@company.com",
            "sector": "Comercial",
            "rol": "usuario",
            "estado_atencion": "activo",
            "puntaje_prioridad": 0,
            "franja_preferida": franja_pref
        })

    # Gerencial
    for i, nombre in enumerate(NOMBRES_GERENCIAL, 1):
        franja_pref = random.randint(1, 4)
        colaboradores.append({
            "nombre": nombre,
            "email": f"gerencial.colaborador{i}@company.com",
            "sector": "Gerencial",
            "rol": "usuario",
            "estado_atencion": "activo",
            "puntaje_prioridad": 0,
            "franja_preferida": franja_pref
        })

    return colaboradores

def generate_tareas_especiales():
    """Genera los tipos de tareas especiales."""
    return [
        {
            "nombre": "Gandulfo",
            "dias_semana": [0, 2],  # Lunes (0) y Miércoles (2)
            "hora_inicio": "09:00",
            "hora_fin": "13:00",
            "descripcion": "Tarea especial de Gandulfo"
        },
        {
            "nombre": "Municipalidad",
            "dias_semana": [1],  # Martes (1)
            "hora_inicio": "10:00",
            "hora_fin": "14:00",
            "descripcion": "Tarea especial de Municipalidad"
        }
    ]

def generate_test_data():
    """Genera todos los datos de prueba."""
    data = {
        "sectores": generate_sectors(),
        "franjas_horarias": generate_franjas_horarias(),
        "colaboradores": generate_colaboradores(),
        "tareas_especiales": generate_tareas_especiales(),
        "metadata": {
            "fecha_generacion": datetime.now().isoformat(),
            "descripcion": "Datos de prueba generados automáticamente para el sistema de planificación de almuerzos",
            "total_colaboradores": 21,
            "total_sectores": 3,
            "franjas_por_dia": 4
        }
    }
    return data

if __name__ == "__main__":
    import sys
    import os

    # Generar datos
    data = generate_test_data()

    # Guardar en archivo JSON
    output_file = os.path.join(os.path.dirname(__file__), "datos_ejemplo.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Datos de prueba generados en: {output_file}")
    print(f"\nResumen:")
    print(f"  - Sectores: {len(data['sectores'])}")
    print(f"  - Franjas horarias: {len(data['franjas_horarias'])}")
    print(f"  - Colaboradores: {len(data['colaboradores'])}")
    print(f"  - Tareas especiales: {len(data['tareas_especiales'])}")

    # Mostrar distribución de colaboradores
    print(f"\nDistribución de colaboradores por sector:")
    sectores_count = {}
    for colab in data['colaboradores']:
        sector = colab['sector']
        sectores_count[sector] = sectores_count.get(sector, 0) + 1

    for sector, count in sectores_count.items():
        print(f"  - {sector}: {count}")

    print(f"\nTareas especiales:")
    for tarea in data['tareas_especiales']:
        dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
        dias_str = ", ".join([dias[d] for d in tarea['dias_semana']])
        print(f"  - {tarea['nombre']}: {dias_str} ({tarea['hora_inicio']}-{tarea['hora_fin']})")
