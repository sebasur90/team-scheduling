"""
Script para visualizar los datos de prueba en formato legible.
Uso: python datos_prueba/view_test_data.py
"""

import json
from pathlib import Path
from datetime import datetime

def print_header(title, char="="):
    """Imprime un encabezado formateado."""
    print(f"\n{char * 70}")
    print(f"  {title}")
    print(f"{char * 70}\n")

def view_test_data():
    """Visualiza los datos de prueba."""
    json_file = Path(__file__).parent / "datos_ejemplo.json"

    if not json_file.exists():
        print("❌ Archivo datos_ejemplo.json no encontrado.")
        print("   Ejecuta primero: python datos_prueba/generate_test_data.py")
        return

    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Metadatos
    metadata = data.get("metadata", {})
    print_header("📊 DATOS DE PRUEBA DEL SISTEMA DE PLANIFICACIÓN DE ALMUERZOS")
    print(f"  Generados: {metadata.get('fecha_generacion', 'N/A')}")
    print(f"  Descripción: {metadata.get('descripcion', 'N/A')}")

    # Sectores
    print_header("🏢 SECTORES", "-")
    print(f"  Total: {len(data['sectores'])}\n")
    for sector in data["sectores"]:
        print(f"  • {sector['nombre']}")
        print(f"    - Capacidad máxima: {sector['capacidad_maxima']}")
        print(f"    - Mínimo de cobertura: {sector['minimo_cobertura']}")
        print(f"    - Participa en almuerzos: {'✅ Sí' if sector['participa_almuerzo'] else '❌ No'}")
        print(f"    - Color: {sector['color']}")
        print()

    # Franjas horarias
    print_header("⏰ FRANJAS HORARIAS", "-")
    print(f"  Total: {len(data['franjas_horarias'])}\n")
    for franja in data["franjas_horarias"]:
        print(f"  • Franja {franja['orden']}: {franja['hora_inicio']} - {franja['hora_fin']}")

    # Colaboradores por sector
    print_header("👥 COLABORADORES", "-")
    colaboradores_por_sector = {}
    for colab in data["colaboradores"]:
        sector = colab["sector"]
        if sector not in colaboradores_por_sector:
            colaboradores_por_sector[sector] = []
        colaboradores_por_sector[sector].append(colab)

    for sector, colabs in colaboradores_por_sector.items():
        print(f"\n  {sector} ({len(colabs)} colaboradores):")
        for colab in colabs:
            print(f"    • {colab['nombre']}")
            print(f"      Email: {colab['email']}")
            print(f"      Franja preferida: {colab['franja_preferida']}")

    # Tareas especiales
    print_header("🎯 TAREAS ESPECIALES", "-")
    print(f"  Total: {len(data['tareas_especiales'])}\n")
    dias_nombres = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    for tarea in data["tareas_especiales"]:
        dias = ", ".join([dias_nombres[d] for d in tarea["dias_semana"] if d < len(dias_nombres)])
        print(f"  • {tarea['nombre']}")
        print(f"    - Días: {dias}")
        print(f"    - Horario: {tarea['hora_inicio']} - {tarea['hora_fin']}")
        print(f"    - Descripción: {tarea.get('descripcion', 'N/A')}\n")

    # Resumen
    print_header("📈 RESUMEN", "-")
    print(f"  Total de sectores: {len(data['sectores'])}")
    print(f"  Total de franjas horarias: {len(data['franjas_horarias'])}")
    print(f"  Total de colaboradores: {len(data['colaboradores'])}")
    print(f"  Total de tareas especiales: {len(data['tareas_especiales'])}")
    print(f"\n  Colaboradores por sector:")
    for sector, count in {s: len(c) for s, c in colaboradores_por_sector.items()}.items():
        print(f"    - {sector}: {count}")

    print_header("✅ LISTO PARA CARGAR", "=")
    print("  Ejecuta: python datos_prueba/load_test_data.py\n")

if __name__ == "__main__":
    view_test_data()
