# Fase 2: Notificaciones Push, Cascada de Cobertura, Panel Admin en Tiempo Real

## Estado de la Implementación

Esta rama implementa la Fase 2 completa del sistema de gestión de turnos de almuerzo:

1. **Notificaciones push FCM** — 5 minutos antes del turno
2. **Cascada de cobertura automática** — reasignación FCFS ante rechazo/timeout
3. **Panel admin en tiempo real** — barometro tri-color + Firestore `onSnapshot`

### Archivos nuevos/modificados

**Backend:**
- `docker-compose.yml` — agregado firebase-emulator
- `firebase.json`, `firestore.rules` — config de emulador
- `requirements.txt` — agregado firebase-admin, apscheduler
- `app/enums.py` — nuevos enums para cascada
- `app/config.py` — nuevas config vars
- `app/models/incidencia.py` — nuevos modelos
- `app/models/colaborador.py` — fcm_token
- `app/models/notificacion.py` — canal, incidencia_id
- `app/services/` — firestore_client, task_scheduler, notif_service
- `app/core/barometro.py`, `cascade_engine.py` — lógica de cascada
- `app/api/notificaciones.py`, `incidencias.py`, `admin_incidencias.py`, `dev.py` — endpoints
- `migrations/002_phase2_cascade.sql` — nuevas tablas
- `tests/test_cascade_engine.py`, `test_barometro.py` — tests

## Cómo ejecutar

### 1. Instalación local (desarrollo)

```bash
# En la raíz del proyecto
docker-compose up --build

# En otra terminal, aplicar migración
psql -h localhost -U almuerzos_user -d almuerzos_db \
  -f backend/migrations/002_phase2_cascade.sql
```

### 2. Verificar que está corriendo

```bash
# API: http://localhost:8000/docs
# Firestore Emulator UI: http://localhost:4000
```

### 3. Correr tests

```bash
cd backend
pytest tests/test_cascade_engine.py tests/test_barometro.py -v
```

### 4. Flujo de prueba completo (sin esperar timers reales)

```bash
# 1. Crear turno y asignación (via admin o seed)
# 2. Simular notificación T-5min
POST /dev/simular-evento
{
  "tipo": "t_minus_5",
  "id": 1  # turno_id
}

# 3. Colaborador rechaza
POST /api/notificaciones/1/responder
{
  "respuesta": "no"
}

# 4. Ver incidencia en Firestore UI: localhost:4000
# 5. Simular fin de ventana admin (auto-broadcast)
POST /dev/simular-evento
{
  "tipo": "admin_window_end",
  "id": 1  # incidencia_id
}

# 6. Un candidato acepta
POST /api/incidencias/1/aceptar  # Con auth del candidato

# 7. Verificar barometro actualizado
GET  /api/admin/incidencias
```

## Arquitectura

### Local-first design

```
LOCAL                              GCP (future)
─────────────────────────────────────────────────
APScheduler         ─────────→     Cloud Tasks
DevNotifService     ─────────→     FCMNotifService
Firestore Emulator  ─────────→     Firestore real
PostgreSQL (Docker) ─────────→     Cloud SQL
```

La única diferencia es variables de entorno. Cero cambios de código.

### Modelo de datos

**PostgreSQL** (fuente de verdad):
- `incidencia_cobertura` — cada evento de cascada
- `historial_reemplazos` — score de equidad
- `colaborador.fcm_token` — token para push
- `notificacion.canal`, `incidencia_id` — metadata

**Firestore** (real-time sync):
- `sucursal/default/barometro` — tri-color + franjas
- `notificaciones/{uid}/{notif_id}` — pendiente/aceptada/rechazada
- `incidencias/{id}` — estado, candidatos, timing

### Flujo de turno — máquina de estados

```
TURNO
  pendiente
    ├─ (T-5min) → notificada
    │             ├─ (sí) → confirmada [OK]
    │             └─ (no | timeout) ↓
    │               CASCADA ACTIVA (ventana_admin 1min)
    │                 ├─ (admin broadcast | auto-broadcast)
    │                 │   ├─ candidato acepta → resuelta
    │                 │   └─ nadie acepta → sin_candidatos
    │                 └─ (admin presencial) → resuelta
```

## Endpoints nuevos

### Colaborador

```
PATCH /api/colaboradores/{id}/fcm-token
  {"fcm_token": "..."}  → registra token para push
```

### Notificaciones

```
POST /api/notificaciones/{id}/responder
  {"respuesta": "si" | "no"}
  → confirmada o cascada
```

### Incidencias

```
POST /api/incidencias/{id}/aceptar           → candidato toma reemplazo (FCFS)
GET  /api/admin/incidencias                  → lista activas
POST /api/admin/incidencias/{id}/broadcast   → dispara manual
POST /api/admin/incidencias/{id}/presencial  → resuelve sin app
```

### Desarrollo (local only)

```
POST /dev/simular-evento
  {
    "tipo": "t_minus_5" | "timeout" | "rechazo" | "admin_window_end",
    "id": int
  }
```

## Próximos pasos

1. **Frontend** — implementar hooks de Firestore + componentes (Barometro, AdminPanel)
2. **Service Worker** — push notifications en PWA
3. **Tests e2e** — flujo completo con docker-compose
4. **Deploy a GCP** — cambiar env vars, usar Cloud Tasks + FCM real

## Supuestos de diseño

- PostgreSQL = única fuente de verdad
- Firestore = transient real-time layer (se regenera desde PG)
- FCFS transacción atómica en Firestore; PostgreSQL update solo si commit OK
- Equidad = reemplazos esta semana ISO (score dinámico)
- No hay ramas de código para local vs GCP
