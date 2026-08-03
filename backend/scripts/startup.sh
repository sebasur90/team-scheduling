#!/bin/bash
set -e

echo "Initializing admin user..."
python /app/scripts/init_admin.py

echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
