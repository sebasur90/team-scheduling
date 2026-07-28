#!/bin/bash
set -e

echo "🚀 Inicializando Fase 2..."

# Esperar a que PostgreSQL esté disponible
echo "⏳ Esperando a PostgreSQL..."
for i in {1..30}; do
  if pg_isready -h postgres -U almuerzos_user -d almuerzos_db 2>/dev/null; then
    echo "✓ PostgreSQL disponible"
    break
  fi
  echo "  Intento $i/30..."
  sleep 2
done

# Aplicar migración
echo "📝 Aplicando migración Phase 2..."
psql -h postgres -U almuerzos_user -d almuerzos_db -f /app/migrations/002_phase2_cascade.sql

echo "✓ Base de datos inicializada"
