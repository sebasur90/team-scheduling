# Guía Completa de Testing — Fase 2

## Pre-requisitos

- Docker & Docker Compose
- Node.js 16+ (para frontend dev)
- Python 3.11+ (para tests)
- curl o Postman (para probar endpoints)

## Paso 1: Levantar la infraestructura

```bash
cd /home/mlrsrv/SEBA/organizacion_almuerzos

# Construir y levantar contenedores
docker-compose up --build

# En otra terminal, esperar a que PostgreSQL esté listo
# Luego aplicar la migración (opcional si usas init-db.sh)
sleep 10
docker-compose exec backend python -c \
  "import psycopg2; psycopg2.connect('dbname=almuerzos_db user=almuerzos_user password=almuerzos_password host=localhost')" \
  && echo "✓ PostgreSQL listo"

psql -h localhost -U almuerzos_user -d almuerzos_db \
  -f backend/migrations/002_phase2_cascade.sql
```

### Verificar que todo está corriendo

```bash
# API: http://localhost:8000/docs
curl http://localhost:8000/health
# {"status":"ok"}

# Firestore Emulator UI: http://localhost:4000
# PostgreSQL: localhost:5432
```

## Paso 2: Seed de datos (crear turnos, asignaciones)

Por ahora, crearemos datos vía API. En una versión completa, habría un seed.sql.

```bash
# 1. Listar colaboradores
curl http://localhost:8000/api/colaboradores?token=dummy

# 2. Listar franjas
curl http://localhost:8000/api/franjas?token=dummy

# 3. [Próximamente] POST /api/admin/generar-turnos para crear turnos/asignaciones
```

## Paso 3: Flujo de prueba end-to-end (manual)

### 3.1 Simular notificación T-5min

Un turno que existe debe ser notificado 5 minutos antes. Asumimos `turno_id=1`.

```bash
curl -X POST http://localhost:8000/api/dev/simular-evento \
  -H "Content-Type: application/json" \
  -d '{"tipo": "t_minus_5", "id": 1}'

# Respuesta:
# {"status": "notificacion_t5_simulada", "turno_id": 1}

# La notificación debe estar en Firestore:
# colección: notificaciones/{colaborador_id}/items/{notif_id}
```

**Verificar en Firestore Emulator UI (localhost:4000)**:
- Ir a `notificaciones` collection
- Buscar notificaciones por `colaborador_id`

### 3.2 Colaborador rechaza la notificación

```bash
# Asumir que se creó notificación con id=1
curl -X POST http://localhost:8000/api/notificaciones/1/responder \
  -H "Content-Type: application/json" \
  -d '{"respuesta": "no"}'

# Respuesta:
# {"status": "cascada_iniciada", "asignacion_id": 1}

# En Firestore, debe aparecer:
# - documento en incidencias/{incidencia_id}
# - estado: "ventana_admin"
# - candidatos: [...]
# - barometro actualizado (estado: "amarillo" si hay incidencia activa)
```

**Verificar en Firestore UI**:
- Colección `incidencias` → debe haber 1 doc
- Documento `sucursal/default/data/barometro` → estado debe ser "amarillo" o "rojo"

### 3.3 Simular fin de ventana admin (auto-broadcast)

La ventana admin dura 1 minuto. El scheduler debería auto-disparar, pero aquí lo simulamos:

```bash
# Asumir incidencia_id=1
curl -X POST http://localhost:8000/api/dev/simular-evento \
  -H "Content-Type: application/json" \
  -d '{"tipo": "admin_window_end", "id": 1}'

# Respuesta:
# {"status": "admin_window_end_simulado", "incidencia_id": 1}

# En Firestore:
# - incidencias/{1}/estado → "broadcast_activo"
# - Push FCM enviados a todos los candidatos (en dev, solo loggeados)
```

**Verificar en Firestore UI**:
- Documento `incidencias/1` → `estado: "broadcast_activo"`

### 3.4 Un candidato acepta el reemplazo (FCFS)

Asumir que hay candidatos en la incidencia. El candidato con auth_token del candidato acepta:

```bash
# Admin o candidato 1 intenta aceptar
curl -X POST http://localhost:8000/api/incidencias/1/aceptar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_del_candidato_1>"

# Si falla, es probable porque la auth no está implementada completamente.
# Para dev, asumir que se pasa user_id vía header.

# Respuesta esperada:
# {"status": "aceptado", "incidencia_id": 1, "colaborador_reemplazante_id": 3}

# En Firestore:
# - incidencias/1 → estado: "resuelta", colaborador_reemplazante: {id, nombre}
# - barometro → estado vuelve a "verde" (si no hay más incidencias)
# - historial_reemplazos → nuevo registro
```

**Verificar en Firestore UI**:
- Documento `incidencias/1` → `estado: "resuelta"`

### 3.5 Admin resuelve presencialmente (sin app)

```bash
# Crear otra incidencia simulando (o simplemente usar una diferente)
# Admin lo resuelve presencialmente
curl -X POST http://localhost:8000/api/admin/incidencias/2/presencial \
  -H "Content-Type: application/json"

# Respuesta:
# {"status": "resuelto_presencial", "incidencia_id": 2}

# En Firestore:
# - incidencias/2 → estado: "resuelta", resolved_at: timestamp
```

## Paso 4: Tests automáticos

```bash
# Backend tests
cd backend
pytest tests/test_cascade_engine.py tests/test_barometro.py -v

# Salida esperada:
# test_cascade_engine.py::test_cascade_engine_basic PASSED
# test_cascade_engine.py::test_cascade_engine_multiple_candidates PASSED
# test_barometro.py::test_barometro_verde PASSED
# test_barometro.py::test_barometro_amarillo_with_incidencia PASSED
```

## Paso 5: Frontend (dev server)

```bash
cd frontend
npm install  # Si no lo has hecho
npm run dev

# Abre http://localhost:5173 en tu navegador
# - Deberías ver Login
# - Ingresa como un colaborador (id=1)
# - En el Dashboard, verás:
#   - Barometro arriba (verde/amarillo/rojo)
#   - AdminPanel si eres admin (rol=admin)
#   - Tabs: Calendario, Preferencias, Notificaciones
```

### Flujo en el navegador

1. **Login**: Selecciona colaborador, clickea "Ingresar"
2. **Dashboard**:
   - Barometro muestra estado actual en tiempo real (via `onSnapshot`)
   - Si eres admin, ves AdminPanel con incidencias activas
3. **Notificaciones**:
   - Si hay notificaciones push pendientes, las ves aquí
   - Puedes responder desde la app o desde la notificación del SO
4. **Calendario**: Muestra turnos (próxima fase más completitud)

## Paso 6: Verificación end-to-end

Flujo completo sin interrupciones:

```bash
# Terminal 1: Contenedores
docker-compose up

# Terminal 2: Aplicar migración
sleep 10 && psql ... -f backend/migrations/002_phase2_cascade.sql

# Terminal 3: Frontend dev
cd frontend && npm run dev

# Terminal 4: Pruebas manuales
# Abre http://localhost:5173 y http://localhost:4000 (Firestore UI)
# Ejecuta los pasos 3.1-3.5 arriba

# Terminal 5: Monitorear logs
docker-compose logs -f backend
```

## Solución de problemas

### "Firestore Emulator no se conecta"

- Verificar `FIRESTORE_EMULATOR_HOST=firebase-emulator:8080` en `.env.docker`
- Verificar que `firebase-emulator` está corriendo: `docker-compose ps`
- Desde el frontend, verificar que env vars en `.env.local` son correctos

### "ModuleNotFoundError: firebase_admin"

```bash
# En contenedor backend
docker-compose exec backend pip install -r requirements.txt
```

### "PostgreSQL connection refused"

```bash
# Esperar más y verificar logs
docker-compose logs postgres
# Si dice "server started", intentar conexión otra vez
psql -h localhost -U almuerzos_user -d almuerzos_db -c "SELECT 1;"
```

### "Notificación no aparece en Firestore"

- Verificar logs del backend: `docker-compose logs backend | grep -i notif`
- Verificar que `POST /dev/simular-evento` retornó 200
- En Firestore UI, ir a `notificaciones` y expandir subcollecciones

## Checklist de éxito

- [ ] `docker-compose up` sin errores
- [ ] `curl http://localhost:8000/health` retorna `{"status":"ok"}`
- [ ] `curl http://localhost:8000/api/colaboradores` lista colaboradores
- [ ] Firestore Emulator UI abre en localhost:4000
- [ ] `pytest tests/test_cascade_engine.py` pasa (4 tests)
- [ ] Frontend `npm run dev` abre en localhost:5173
- [ ] Login funciona y ves Dashboard
- [ ] Barometro muestra estado en Dashboard
- [ ] Flujo T-5min → Rechazo → Cascada funciona
- [ ] Incidencias aparecen en Firestore UI en tiempo real
- [ ] Admin ve AdminPanel con incidencias

## Próximas fases

1. **Crear turno/asignación API** — POST /admin/generar-turnos
2. **Autenticación real** — JWT con roles, no mock
3. **Push FCM real** — cuando hagas deploy a GCP
4. **Tests e2e** — Cypress o Playwright
5. **CI/CD** — GitHub Actions o Cloud Build
6. **Deploy a GCP** — Cloud Run + Firestore real + Cloud Tasks
