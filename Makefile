.PHONY: help up down logs db-migrate db-psql test test-backend test-frontend dev frontend-dev docs

help:
	@echo "Disponibles:"
	@echo "  make up              - Levantar docker-compose (postgres + firebase + backend)"
	@echo "  make down            - Detener contenedores"
	@echo "  make logs            - Ver logs del backend"
	@echo "  make db-migrate      - Aplicar migración Phase 2"
	@echo "  make db-psql         - Conectar a PostgreSQL psql"
	@echo "  make test            - Correr tests (backend + frontend)"
	@echo "  make test-backend    - Correr solo tests backend"
	@echo "  make test-frontend   - Correr solo tests frontend (próximo)"
	@echo "  make dev             - Levantar todo (docker + frontend dev)"
	@echo "  make frontend-dev    - Solo frontend dev server"
	@echo "  make clean           - Limpiar contenedores y volumes"
	@echo "  make docs            - Ver documentación"

up:
	docker-compose up --build

down:
	docker-compose down

logs:
	docker-compose logs -f backend

db-migrate:
	@echo "Esperando PostgreSQL..."
	@sleep 5
	psql -h localhost -U almuerzos_user -d almuerzos_db -f backend/migrations/002_phase2_cascade.sql
	@echo "✓ Migración aplicada"

db-psql:
	psql -h localhost -U almuerzos_user -d almuerzos_db

test: test-backend
	@echo "✓ Todos los tests pasaron"

test-backend:
	cd backend && pytest tests/test_cascade_engine.py tests/test_barometro.py -v

test-frontend:
	cd frontend && npm test

dev: up db-migrate frontend-dev

frontend-dev:
	cd frontend && npm install && npm run dev

clean:
	docker-compose down -v
	rm -rf frontend/node_modules frontend/dist
	find backend -type d -name __pycache__ -exec rm -rf {} +
	find backend -type d -name .pytest_cache -exec rm -rf {} +

docs:
	@echo ""
	@echo "📚 Documentación:"
	@echo ""
	@echo "  1. IMPLEMENTACION_FINAL.md      - Resumen completo de implementación"
	@echo "  2. TEST_GUIDE.md                - Guía paso a paso de testing"
	@echo "  3. FASE2_README.md              - Descripción general"
	@echo "  4. IMPLEMENTACION_CHECKLIST.md  - Checklist de tareas"
	@echo ""
	@echo "Plan de implementación:"
	@echo "  /home/mlrsrv/.claude/plans/elegant-roaming-catmull.md"
	@echo ""

# Quick commands
health:
	curl http://localhost:8000/health

api-docs:
	open http://localhost:8000/docs

firestore-ui:
	open http://localhost:4000

frontend-ui:
	open http://localhost:5173

# Simulate eventos
sim-t5:
	curl -X POST http://localhost:8000/api/dev/simular-evento \
	  -H "Content-Type: application/json" \
	  -d '{"tipo": "t_minus_5", "id": 1}'

sim-reject:
	curl -X POST http://localhost:8000/api/notificaciones/1/responder \
	  -H "Content-Type: application/json" \
	  -d '{"respuesta": "no"}'

sim-admin-window-end:
	curl -X POST http://localhost:8000/api/dev/simular-evento \
	  -H "Content-Type: application/json" \
	  -d '{"tipo": "admin_window_end", "id": 1}'

list-colabs:
	curl http://localhost:8000/api/colaboradores?token=dummy

list-franjas:
	curl http://localhost:8000/api/franjas?token=dummy

list-admin-incidencias:
	curl http://localhost:8000/api/admin/incidencias?token=dummy
