#!/bin/bash
set -e

echo "Running database migrations..."
psql "$DATABASE_URL" -f /app/migrations/001_initial_schema.sql 2>/dev/null || echo "Schema already exists"
psql "$DATABASE_URL" -f /app/migrations/002_phase2_cascade.sql 2>/dev/null || echo "Phase 2 migration already applied"
psql "$DATABASE_URL" -f /app/migrations/003_add_auth_fields.sql 2>/dev/null || echo "Auth fields migration already applied"

echo "Initializing admin user..."
python /app/scripts/init_admin.py

echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
