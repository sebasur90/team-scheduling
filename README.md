# Gestión de Turnos de Almuerzo

Sistema para organizar turnos de almuerzo y tareas externas de equipos de trabajo.

## Descripción

Este es un sistema de asignación de turnos de almuerzo que garantiza la cobertura continua del equipo. Implementa:

- **Motor de asignación inteligente** con cobertura mínima de 1 Tipo-A y 1 Tipo-B por franja
- **Sistema de prioridad por equidad** para resolver conflictos de cobertura
- **Tareas especiales** (Orientador, Municipalidad, Gandulfo) con restricciones horarias
- **Mercado de swaps** para intercambios de turnos entre colaboradores
- **Gestión de ausencias** con alertas automáticas

## Stack Tecnológico

### Backend
- **Python 3.10+** con FastAPI
- **PostgreSQL** para persistencia
- **SQLAlchemy** para ORM
- **pytest** para tests

### Frontend
- React 18 + Vite + TypeScript
- PWA con manifest y service worker ready
- Responsive design (mobile-first)
- Deployable a Firebase Hosting

## Setup Local

### Opción 1: Con Docker (Recomendado)

**Requisitos:**
- Docker
- Docker Compose

**Comando:**
```bash
docker-compose up
```

Accede a:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PgAdmin: http://localhost:5050

Ver [DOCKER.md](DOCKER.md) para más detalles.

### Opción 2: Setup Local Manual

**Requisitos:**
- Python 3.10 o superior
- PostgreSQL 15
- Node.js 18+
- uv (opcional, para manejo más rápido de dependencias)

### Instalación

1. **Clonar el repositorio**
```bash
git clone <repo-url>
cd organizacion_almuerzos
```

2. **Iniciar la base de datos con Docker**
```bash
docker-compose up -d
```

Esto levanta:
- PostgreSQL en puerto 5432
- PgAdmin en puerto 5050 (usuario: admin@example.com, password: admin)

3. **Instalar dependencias del backend**

Con uv (recomendado):
```bash
cd backend
uv venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
```

O con pip:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -e ".[dev]"
```

4. **Crear archivo .env local**
```bash
cd backend
cp .env.example .env.local
# Editar .env.local si es necesario
```

5. **Crear la base de datos**
```bash
psql -h localhost -U almuerzos_user -d almuerzos_db < migrations/001_initial_schema.sql
```

6. **Correr tests**
```bash
pytest tests/ -v
```

7. **Iniciar servidor de desarrollo (Backend)**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

El API estará disponible en: http://localhost:8000
Documentación interactiva: http://localhost:8000/docs

8. **Setup Frontend (en otra terminal)**
```bash
cd frontend
npm install
npm run dev
```

El frontend estará disponible en: http://localhost:3000

## Estructura del Proyecto

```
organizacion_almuerzos/
├── backend/
│   ├── app/
│   │   ├── api/              # Routers de FastAPI
│   │   ├── auth/             # Autenticación (local y future OAuth)
│   │   ├── core/             # Motor de asignación puro
│   │   ├── models/           # Modelos SQLAlchemy
│   │   ├── schemas/          # Esquemas Pydantic (validación)
│   │   ├── config.py         # Configuración
│   │   ├── database.py       # Setup de SQLAlchemy
│   │   ├── enums.py          # Enumeraciones
│   │   ├── constants.py      # Constantes (franjas, tareas)
│   │   └── main.py           # Aplicación FastAPI
│   ├── tests/                # Tests unitarios e integración
│   ├── migrations/           # Scripts SQL de migración
│   ├── requirements.txt      # Dependencias pip
│   ├── pyproject.toml        # Configuración del proyecto
│   └── .env.example          # Template de variables de entorno
├── frontend/                 # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/              # Clientes API (axios)
│   │   ├── components/       # Componentes React
│   │   ├── contexts/         # React Context (auth)
│   │   ├── App.tsx           # Componente principal
│   │   └── main.tsx          # Punto de entrada
│   ├── public/               # Assets públicos y manifest.json
│   ├── package.json          # Dependencias npm
│   └── vite.config.ts        # Configuración de Vite
├── docs/                     # Documentación
└── docker-compose.yml        # Configuración de servicios
```

## Fases de Implementación

### ✅ Fase 1: Foundation & Database (Completado)
- Estructura del proyecto
- Modelos SQLAlchemy
- Schema PostgreSQL
- Configuración de entorno

### ✅ Fase 2: Core Algorithm (Completado)
- Motor de asignación con 4 fases
- Validación de cobertura
- Resolución de prioridades
- Tests unitarios

### ⏳ Fase 3: Backend API Foundation (En progreso)
- Routers básicos (auth, franjas, colaboradores)
- Esquemas Pydantic
- Autenticación local

### ⏳ Fases 4-10: Completar Features + Frontend

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Login simulado con colaborador_id
- `GET /api/auth/me` - Obtener usuario actual

### Franjas
- `GET /api/franjas` - Listar todas las franjas horarias

### Colaboradores
- `GET /api/colaboradores` - Listar colaboradores
- `GET /api/colaboradores/{id}` - Obtener colaborador
- `POST /api/colaboradores` - Crear colaborador
- `PATCH /api/colaboradores/{id}` - Actualizar colaborador

## Desarrollo

### Flujo de desarrollo con Docker

```bash
# 1. Levantar todo
docker-compose up

# 2. Los cambios en código se aplican automáticamente (hot reload)

# 3. En otra terminal, ejecutar tests
docker-compose exec backend pytest tests/ -v

# 4. Ver logs
docker-compose logs -f

# 5. Parar servicios
docker-compose stop
```

### Agregar una nueva característica
1. Escribir tests en `backend/tests/`
2. Implementar en `backend/app/`
3. Actualizar documentación

### Ejecutar tests
```bash
# Con Docker
docker-compose exec backend pytest tests/ -v

# O localmente
pytest tests/ --cov=app --cov-report=html
```

## Roadmap

- [x] Especificación de diseño completada
- [x] Database schema definido
- [x] Core algorithm implementado
- [x] Frontend: React + Vite setup completado
- [x] Frontend: Login screen implementado
- [x] Frontend: Calendar view (5 time slots como columnas)
- [x] Frontend: Preferences UI implementado
- [x] Frontend: Notification Center implementado
- [ ] API endpoints completados (preferences, swaps, admin)
- [ ] Conectar frontend con API (preferences, turnos, swaps)
- [ ] Mercado de swaps (cambio de turnos)
- [ ] Admin panel con generación de cronogramas
- [ ] Tests de integración E2E
- [ ] Service Worker completamente funcional
- [ ] Deployment a GCP (futuro)

## Notas de Diseño

**Algoritmo de Asignación (4 fases):**
1. **Phase 0**: Construir contexto del día (ausencias, tareas especiales, excluidos)
2. **Phase 1**: Resolver preferencias por franja, aplicar prioridad en conflictos
3. **Phase 2**: Rellenar personas sin franja asignada
4. **Phase 3**: Validar cobertura mínima en todas las franjas

**Cobertura Mínima**: Cada franja debe tener al menos 1 Tipo-A y 1 Tipo-B.

**Prioridad**: Los colaboradores denegados en sus preferencias incrementan `puntaje_prioridad`. Empates exactos requieren resolución manual del admin.

## Contacto & Licencia

(Información local - ajustar según proyecto)
