# Notificaciones Push, Cascada de Cobertura y Panel Admin en Tiempo Real — Diseño

**Fecha:** 2026-07-28
**Estado:** Aprobado para pasar a plan de implementación
**Extiende:** `2026-07-27-turnos-almuerzo-design.md` (Fase 1 — local, sin push)

---

## 1. Objetivo y alcance

Esta fase agrega al sistema existente (FastAPI + PostgreSQL + React PWA) tres capacidades nuevas:

1. **Notificaciones push interactivas** — 5 minutos antes de cada turno, el colaborador recibe un push FCM para confirmar o rechazar su salida. Responde desde la pantalla de bloqueo.
2. **Cascada de cobertura automática** — ante un rechazo o timeout, el sistema reasigna al postergado, identifica candidatos de reemplazo y hace broadcast FCFS con ventana de control para el admin.
3. **Panel admin en tiempo real** — barométro tri-color (Verde/Amarillo/Rojo) y lista de incidencias activas actualizadas vía Firestore `onSnapshot`, sin recargar la app.

El sistema se construye y valida en local primero; el camino a GCP es solo cambio de variables de entorno (sin ramas de código separadas).

---

## 2. Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                    CELULARES (PWA)                       │
│  onSnapshot(barometro) · onSnapshot(notificaciones)      │
│  FCM push (lock screen) · respuesta desde notificación  │
└────────────┬────────────────────────┬────────────────────┘
             │ HTTP/REST              │ Firestore SDK
             ▼                        ▼
┌────────────────────┐    ┌──────────────────────────┐
│  Cloud Run         │    │  Firestore               │
│  FastAPI (Python)  │───►│  barometro (doc)         │
│  + módulos nuevos: │    │  notificaciones/{uid}/   │
│    CascadeEngine   │    │  incidencias/{id}/       │
│    BarometroSvc    │    └──────────────────────────┘
│    NotifService    │
│    TaskScheduler   │
└────────┬───────────┘
         │ SQL
         ▼
┌─────────────────────┐    ┌──────────────────────────────┐
│  PostgreSQL         │    │  APScheduler (local)         │
│  (fuente de verdad) │    │  Cloud Tasks  (GCP)          │
│  + 2 tablas nuevas  │    │  ├─ notify_t_minus_5         │
└─────────────────────┘    │  ├─ timeout_check (3 min)    │
                           │  └─ admin_window_end (1 min) │
                           └──────────────────────────────┘
```

**Principios de diseño:**
- PostgreSQL es la única fuente de verdad. Firestore almacena estado transiente de lectura rápida y puede regenerarse desde PostgreSQL en cualquier momento.
- El frontend nunca escribe directamente en PostgreSQL; toda acción va por REST al backend, que actualiza PostgreSQL y luego Firestore como efecto secundario.
- La única excepción es la transacción atómica FCFS: el backend ejecuta una transacción Firestore y, solo si hace commit, persiste en PostgreSQL.
- No hay ramas de código para local vs GCP. La diferencia es 100% configuración (variables de entorno + implementaciones inyectadas vía Protocol).

---

## 3. Modelo de datos

### 3.1 PostgreSQL — tablas nuevas

| Tabla | Campos | Propósito |
|---|---|---|
| `incidencia_cobertura` | `id`, `asignacion_id` FK, `motivo` (rechazo/timeout), `estado` (ventana_admin/broadcast_activo/resuelta/sin_candidatos), `colaborador_reemplazante_id` FK nullable, `created_at`, `resolved_at` | Fuente de verdad de cada evento de cascada, de inicio a resolución |
| `historial_reemplazos` | `id`, `colaborador_id` FK, `incidencia_id` FK, `fecha`, `semana_iso` | Registro de reemplazos absorbidos. La suma por `semana_iso` es el score de equidad para la cascada |

### 3.2 PostgreSQL — modificaciones a tablas existentes

- `colaborador` → agregar `fcm_token VARCHAR nullable` para poder enviar push.
- `notificacion` → agregar `canal VARCHAR default 'in_app'` (in_app/push) y `incidencia_id FK nullable` para vincular notificaciones al evento de cascada.

### 3.3 Firestore — documentos en tiempo real

```
sucursal/default/barometro
  estado:               "verde" | "amarillo" | "rojo"
  franjas: [
    { orden, hora, estado: "ok"|"riesgo"|"critico",
      comercial_libre, operativo_libre }
  ]
  incidencias_activas:  int
  updated_at:           timestamp

notificaciones/{colaborador_id}/{notif_id}
  tipo:         "confirmar_turno" | "reemplazo_disponible" | "turno_cubierto"
  franja:       "12:00-12:45"
  fecha:        "2026-07-28"
  estado:       "pendiente" | "aceptada" | "rechazada" | "expirada"
  expires_at:   timestamp
  incidencia_id: string | null

incidencias/{incidencia_id}
  estado:                 "ventana_admin" | "broadcast_activo" | "resuelta" | "sin_candidatos"
  franja:                 "12:00-12:45"
  fecha:                  "2026-07-28"
  colaborador_afectado:   { id, nombre }
  colaborador_reemplazante: { id, nombre } | null
  candidatos:             [ { id, nombre, reemplazos_semana } ]
  motivo:                 "rechazo" | "timeout"
  admin_window_ends_at:   timestamp
  created_at:             timestamp
```

---

## 4. Ciclo de vida del turno — máquina de estados

```
TURNO
  pendiente
     │
     │ T-5min (Cloud Tasks / APScheduler)
     ▼
  notificada ──────────────────────────────────────────────────┐
     │                                                         │ timeout 3 min
     │ usuario responde "Sí"                                   │ (o responde "No")
     ▼                                                         ▼
  confirmada                                            CASCADA ACTIVA
                                                              │
                                            ┌─────────────────┴──────────────────┐
                                            │  CascadeEngine:                    │
                                            │  • próx. franja viable postergado  │
                                            │  • candidatos sorted por           │
                                            │    reemplazos_semana ASC           │
                                            │  • barometro → amarillo            │
                                            └─────────────────┬──────────────────┘
                                                              │
                                                   ventana_admin (1 min)
                                                              │
                                          ┌───────────────────┼──────────────────┐
                                          │                   │                  │
                                    admin notifica      admin confirma     nadie actúa
                                     (broadcast)         presencial      → auto-broadcast
                                          │                   │                  │
                                          └─────────── broadcast ────────────────┘
                                                              │
                                              FCM push a todos los candidatos
                                              Firestore tx atómica (FCFS)
                                                              │
                                          ┌───────────────────┴──────────────────┐
                                          │                                      │
                                    alguien acepta                        nadie acepta
                                          │                                      │
                                   resuelta_con_reemplazo              sin_candidatos
                                   barometro → verde                   barometro → rojo
                                                                       alerta crítica admin
```

### 4.1 Pasos detallados

**T-5min:**
1. `TaskScheduler` dispara `notify_t_minus_5(turno_id)`.
2. Backend verifica que el turno sigue activo (no cancelado, persona no ausente).
3. Envía FCM push: _"Tu almuerzo es en 5 min (12:00–12:45). ¿Salís? [Sí] [No]"_.
4. Escribe `notificaciones/{colab_id}/{notif_id}` en Firestore (estado=pendiente, expires_at=now+3min).
5. Persiste en PostgreSQL tabla `notificacion` (canal=push).
6. Agenda tarea `timeout_check` en 3 min.

**Respuesta "Sí":**
1. `POST /api/notificaciones/{id}/responder` con `{"respuesta": "si"}`.
2. Backend actualiza notificacion en PostgreSQL, asignacion → confirmada.
3. Actualiza Firestore notificacion → aceptada.
4. Recalcula y escribe barometro.

**Rechazo o timeout (mismo path):**
1. Backend marca notificacion como rechazada/timeout en PostgreSQL.
2. Llama a `CascadeEngine.iniciar(asignacion_id, motivo)`.

**CascadeEngine:**
1. Calcula próxima franja viable para el postergado (debe terminar antes de las 14:45). Si no existe ninguna franja viable (por ejemplo, el rechazo ocurrió en la franja 14:00–14:45), el postergado queda sin almuerzo ese día y el sistema emite alerta crítica al admin para que lo resuelva manualmente. La cascada continúa igual buscando reemplazante para la franja original.
2. Identifica candidatos elegibles: colaboradores que pueden adelantar su turno sin romper cobertura mínima de su sector.
3. Ordena candidatos por `reemplazos_semana ASC` (equidad: quien menos absorbió, primero).
4. Crea `incidencia_cobertura` en PostgreSQL (estado=ventana_admin).
5. Escribe `incidencias/{id}` en Firestore.
6. Recalcula barometro → amarillo.
7. Agenda tarea `admin_window_end` en 1 min.

**Ventana admin (1 min):**
- Admin puede: `[Broadcast]` → dispara inmediato, `[Confirmar Presencial]` → resuelve sin candidatos.
- Si no actúa: `admin_window_end` dispara auto-broadcast.

**Broadcast (auto o admin-triggered):**
1. Actualiza incidencia → broadcast_activo en PostgreSQL + Firestore.
2. FCM push a todos los candidatos: _"Turno libre 12:00–12:45. ¿Lo tomás? [Sí]"_.

**Atomic claim (FCFS):**
1. `POST /api/incidencias/{id}/aceptar` de cualquier candidato.
2. Backend ejecuta Firestore transaction: solo escribe si `estado == "broadcast_activo"` y `colaborador_reemplazante == null`.
3. Si commit exitoso: actualiza PostgreSQL (swap asignacion, agrega registro en `historial_reemplazos`), barometro → verde, FCM "ya cubierto" a los demás.
4. Si transaction falla (otro ganó primero): devuelve 409, frontend muestra "ya cubierto".

---

## 5. Lógica del barométro

`BarometroService` vive en `app/core/`, testeable sin FastAPI.

```python
# Para cada franja activa o que empieza en los próximos 30 min:
en_linea = presentes - ausentes - orientador - asignados_a_esta_franja
comercial_ok = count(en_linea, sector=comercial, estado_atencion=activo) >= 1
operativo_ok = count(en_linea, sector=operativo, estado_atencion=activo) >= 1

# ok:      ambas condiciones cumplidas, sin incidencia activa en esta franja
# riesgo:  hay incidencia activa sin resolver para esta franja
# critico: comercial_ok==False OR operativo_ok==False (cobertura ya rota)

# Color global = peor estado entre las franjas evaluadas
# verde < amarillo < rojo
```

Se recalcula en: confirmación de turno, inicio de cascada, resolución de cascada, ausencia marcada por admin.

---

## 6. Panel del admin — pantallas

### Vista principal
```
┌─────────────────────────────┐
│  [●  AMARILLO]  1 incidencia│  ← onSnapshot barometro
│  12:00 ✓  12:30 ⚠  13:00 ✓ │
├─────────────────────────────┤
│  ⚠ INCIDENCIA ACTIVA        │
│  Lucas M. rechazó 12:30     │
│  Candidatos listos (3)      │
│  Ventana admin: 0:43 ⏱      │
│  [Broadcast]  [Presencial]  │
└─────────────────────────────┘
```

### Vista de incidencia (al tocar)
```
┌─────────────────────────────┐
│  Lucas M. → 12:30 rechazado │
│  Reasignado: Lucas → 13:00  │
│                             │
│  CANDIDATOS (por equidad)   │
│  1. Ana P.   (0 reemplazos) │
│  2. Carlos R.(1 reemplazo)  │
│  3. María G. (1 reemplazo)  │
│                             │
│  [Broadcast a los 3]        │
│  [Confirmar presencial]     │
└─────────────────────────────┘
```

### Listeners Firestore por vista

| Vista | Listener |
|---|---|
| Todos los usuarios | `onSnapshot("notificaciones/{uid}")` |
| Barométro (todos) | `onSnapshot("sucursal/default/barometro")` |
| Panel admin | `onSnapshot("incidencias", where estado != "resuelta")` |

---

## 7. Endpoints nuevos

```
POST /api/notificaciones/{id}/responder        # confirma o rechaza el turno propio
POST /api/incidencias/{id}/aceptar             # candidato toma el reemplazo (tx atómica)
POST /api/admin/incidencias/{id}/broadcast     # admin dispara broadcast manualmente
POST /api/admin/incidencias/{id}/presencial    # admin resuelve sin app
GET  /api/admin/incidencias                    # lista incidencias activas (?fecha=&estado=)
PATCH /api/colaboradores/{id}/fcm-token        # registra/actualiza token FCM del dispositivo

POST /dev/simular-evento                       # solo local
     body: { tipo: "t_minus_5"|"timeout"|"rechazo"|"admin_window_end", id }
```

---

## 8. Abstracciones — implementaciones intercambiables

```python
# app/services/task_scheduler.py
class TaskScheduler(Protocol):
    def schedule_notify_t5(self, turno_id: int, run_at: datetime) -> str: ...
    def schedule_timeout(self, notif_id: int, run_at: datetime) -> str: ...
    def schedule_admin_window_end(self, incidencia_id: int, run_at: datetime) -> str: ...
    def cancel(self, task_id: str) -> None: ...

# Local  → APSchedulerService   (in-process, estado en memoria)
# GCP    → CloudTasksService    (HTTP tasks al endpoint de Cloud Run, firmados con OIDC)

# app/services/notif_service.py
class NotifService(Protocol):
    def send_push(self, fcm_token: str, title: str, body: str, data: dict) -> None: ...

# Local  → DevNotifService   (loguea el payload, no envía nada)
# GCP    → FCMNotifService   (firebase-admin SDK)
```

Selección vía `APP_ENV`: `local` inyecta implementaciones dev, `production` inyecta las reales. Misma lógica de negocio en ambos entornos.

---

## 9. Desarrollo local

### docker-compose.yml (adiciones)

```yaml
firebase-emulator:
  image: andreysenov/firebase-tools
  command: firebase emulators:start --only firestore
  ports:
    - "8080:8080"   # Firestore emulator
    - "4000:4000"   # Emulator UI (inspeccionar docs en tiempo real)
  volumes:
    - ./firebase.json:/home/node/firebase.json
    - ./firestore.rules:/home/node/firestore.rules

backend:
  depends_on: [postgres, firebase-emulator]
  environment:
    - FIRESTORE_EMULATOR_HOST=firebase-emulator:8080
    - APP_ENV=local
```

### Flujo de testeo completo sin esperar timers reales

```bash
# 1. Levantar infraestructura
docker-compose up

# 2. Simular notificación T-5min
POST /dev/simular-evento {"tipo": "t_minus_5", "turno_id": 42}

# 3. El colaborador rechaza
POST /api/notificaciones/1/responder {"respuesta": "no"}

# 4. Ver incidencia en Firestore Emulator UI: localhost:4000

# 5. Dejar vencer ventana admin (o simular)
POST /dev/simular-evento {"tipo": "admin_window_end", "incidencia_id": 1}

# 6. Un candidato acepta el reemplazo
POST /api/incidencias/1/aceptar  (con auth del candidato ganador)
```

---

## 10. Camino a GCP — solo variables de entorno cambian

| Componente | Local | GCP |
|---|---|---|
| Scheduler | APScheduler (in-process) | Cloud Tasks (HTTP tasks) |
| Notificaciones | DevNotifService (log) | FCMNotifService (firebase-admin) |
| Firestore | Emulator (`FIRESTORE_EMULATOR_HOST`) | Real (`GOOGLE_APPLICATION_CREDENTIALS`) |
| PostgreSQL | Docker (`localhost:5432`) | Compute Engine (IP privada) |
| Frontend | `npm run dev` | Firebase Hosting (`firebase deploy`) |
| Auth Tasks→Run | N/A | OIDC token (firmado por Google) |

El Dockerfile del backend es idéntico en ambos entornos.

---

## 11. Testing

- **`test_cascade_engine.py`** — cobertura del `CascadeEngine` puro: casos sin candidatos, candidato único, múltiples candidatos con empate de equidad, postergado sin franja viable antes de 14:45.
- **`test_barometro.py`** — verde/amarillo/rojo para cada combinación de franjas activas e incidencias.
- **`test_fcfs_atomic.py`** — simular dos requests concurrentes de `aceptar`, verificar que solo uno gana y el otro recibe 409.
- **Tests de integración API** — flujo completo vía `/dev/simular-evento`: t_minus_5 → timeout → cascade → broadcast → accept.

---

## 12. Decisiones y supuestos registrados

| Decisión | Detalle |
|---|---|
| BD principal | PostgreSQL en Compute Engine — fuente de verdad. Firestore solo estado transiente. |
| Rol de Firestore | Real-time sync layer únicamente (barometro, notificaciones activas, incidencias). Se puede regenerar desde PostgreSQL. |
| Local para Firestore | Firebase Emulator Suite (`emulators:start --only firestore`). |
| Local para Cloud Tasks | APScheduler in-process. Misma interfaz `TaskScheduler`. |
| Local para FCM | `DevNotifService` (log). FCM real opcional si se configura Firebase project para testear push en celular. |
| Endpoint de simulación | `POST /dev/simular-evento` solo activo con `APP_ENV=local`. |
| Cascada — modo candidatos | Broadcast puro (todos a la vez). Pool típico en esta sucursal: 3-5 personas. |
| Ventana admin | 1 minuto antes del auto-broadcast. Configurable vía variable de entorno. |
| Equidad en cascada | Score = `reemplazos_semana` (historial_reemplazos agrupado por `semana_iso`). Menor score = primero en la lista de candidatos para el admin. Reset automático: el score se calcula dinámicamente con `COUNT(*) WHERE semana_iso = current_iso_week`, no hay proceso de reset manual. |
| Barometro | Recalculado en cada cambio de estado. Evalúa franja activa + franjas que empiezan en los próximos 30 min. |
| Transacción FCFS | Firestore transaction primero; PostgreSQL se actualiza solo si el commit es exitoso. |
| Auth Cloud Tasks → Cloud Run | OIDC token en producción. En local no aplica (APScheduler llama al método directamente). |
