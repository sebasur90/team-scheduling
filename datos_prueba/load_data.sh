#!/bin/bash
# Script para cargar datos de prueba en la base de datos

set -e

echo "============================================================"
echo "🚀 Cargador de Datos de Prueba - Sistema de Planificación"
echo "============================================================"

# Directorio del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo ""
echo "📁 Directorio del proyecto: $PROJECT_DIR"

# Verificar si el backend existe
if [ ! -d "backend" ]; then
    echo "❌ Error: No se encontró el directorio 'backend'"
    exit 1
fi

echo ""
echo "📦 Instalando/actualizando dependencias del backend..."
pip install -q -r backend/requirements.txt 2>&1 | grep -v "already satisfied" || true

echo ""
echo "✅ Dependencias instaladas"

echo ""
echo "🐍 Ejecutando script de carga de datos..."
python datos_prueba/load_test_data.py

echo ""
echo "✅ Script completado"
