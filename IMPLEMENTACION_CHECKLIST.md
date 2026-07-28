# Fase 2 — Checklist de Implementación

## ✅ Infraestructura (completado)

- [x] `docker-compose.yml` — postgres + firebase-emulator + backend
- [x] `firebase.json` — emulator config
- [x] `firestore.rules` — reglas permisivas
- [x] `requirements.txt` — firebase-admin, apscheduler
- [x] `.env.example`, `.env.docker` — nuevas config vars

## ✅ Backend — Configuración (completado)

- [x] `app/enums.py` — EstadoIncidencia, MotivoIncidencia, CanalNotificacion, nuevos EstadoAsignacion
- [x] `app/config.py` — APP_ENV, FIRESTORE_EMULATOR_HOST, ADMIN_WINDOW_SECONDS, TIMEOUT_SECONDS
- [x] `migrations/002_phase2_cascade.sql` — nuevas tablas + campos

## ✅ Backend — Modelos (completado)

- [x] `app/models/incidencia.py` — IncidenciaCobertura, HistorialReemplazo
- [x] `app/models/colaborador.py` — fcm_token field
- [x] `app/models/notificacion.py` — canal, incidencia_id
- [x] `app/models/__init__.py` — exportar nuevos modelos

## ✅ Backend — Servicios (completado)

- [x] `app/services/__init__.py` — directorio de servicios
- [x] `app/services/firestore_client.py` — init firebase, db, helpers
- [x] `app/services/task_scheduler.py` — TaskScheduler protocol + APSchedulerService
- [x] `app/services/notif_service.py` — NotifService protocol + DevNotifService/FCMNotifService

## ✅ Backend — Core Logic (completado)

- [x] `app/core/barometro.py` — BarometroService.calculate_barometro()
- [x] `app/core/cascade_engine.py` — CascadeEngine.iniciar() + helpers

## ✅ Backend — API Endpoints (completado)

- [x] `app/api/notificaciones.py` — POST /notificaciones/{id}/responder
- [x] `app/api/incidencias.py` — POST /incidencias/{id}/aceptar
- [x] `app/api/admin_incidencias.py` — GET/POST endpoints admin
- [x] `app/api/dev.py` — POST /dev/simular-evento (local only)
- [x] `app/api/colaboradores.py` — PATCH /colaboradores/{id}/fcm-token
- [x] `app/main.py` — registrar routers, scheduler startup/shutdown

## ✅ Backend — Tests (completado)

- [x] `tests/test_cascade_engine.py` — test básico + múltiples candidatos
- [x] `tests/test_barometro.py` — test verde + amarillo

## ⏳ Frontend (no implementado — próxima fase)

- [ ] Instalar firebase SDK
- [ ] `src/lib/firebase.ts` — init + emulator detection
- [ ] `src/hooks/useBarometro.ts` — onSnapshot barometro
- [ ] `src/hooks/useIncidencias.ts` — onSnapshot incidencias
- [ ] `src/hooks/useUserNotifications.ts` — onSnapshot notificaciones
- [ ] `src/components/Barometro.tsx` — tri-color display
- [ ] `src/components/AdminPanel.tsx` — incidencias list + actions
- [ ] `public/sw.js` — service worker para push
- [ ] `src/App.tsx` — registrar service worker

## 📋 Verificación End-to-End

### Antes de correr

```bash
# 1. Verificar estructura
docker-compose config  # valida sintaxis

# 2. Instalar dependencies
pip install -r backend/requirements.txt

# 3. Correr tests locales
cd backend && pytest tests/test_cascade_engine.py tests/test_barometro.py -v
```

### Con docker-compose

```bash
# 1. Levantar infraestructura
docker-compose up --build

# 2. En otra terminal, aplicar migración
psql -h localhost -U almuerzos_user -d almuerzos_db \
  -f backend/migrations/002_phase2_cascade.sql

# 3. Verificar API
curl http://localhost:8000/health  # {status: ok}

# 4. Firestore Emulator UI
open http://localhost:4000

# 5. Flujo de prueba (ver FASE2_README.md para detalles)
```

## ⚠️ Notas y supuestos

1. **Firestore initialization** — Detecta `FIRESTORE_EMULATOR_HOST` automáticamente
2. **APScheduler** — Solo para local; no necesita workers separados
3. **FCFS transacción** — Simulada en current code; en prod requiere Firestore transactions
4. **Auth** — Endpoints de admin aún usan mock; requiere verificar usuario real
5. **Service Worker** — Aún no registrado en frontend; necesario para push notifications
6. **Email validation** — Pydantic ya valida; no hay confirmación por correo

## 🚀 Siguientes pasos ordenados

1. Completar frontend (hooks + componentes)
2. Integrar service worker para push real
3. Agregar tests e2e
4. CI/CD pipeline
5. Deploy a GCP (Cloud Run + Firestore + Cloud Tasks + FCM)
