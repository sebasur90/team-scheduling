#!/bin/bash
# Script para cargar datos usando uv

set -e

echo "============================================================"
echo "🚀 Cargador de Datos de Prueba (con uv)"
echo "============================================================"

# Directorio del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "📁 Directorio del proyecto: $PROJECT_DIR"

# Verificar si uv está instalado
if ! command -v uv &> /dev/null; then
    echo "❌ Error: 'uv' no está instalado"
    echo "   Instálalo con: pip install uv"
    exit 1
fi

echo ""
echo "📦 Usando uv para instalar dependencias..."

# Ejecutar el script con uv sync y luego python
uv run --no-project --with sqlalchemy==2.0.23 --with psycopg2-binary==2.9.9 --with python-dotenv==1.0.0 python datos_prueba/load_test_data.py

echo ""
echo "✅ Script completado"
