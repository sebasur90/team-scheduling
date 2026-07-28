# 🎯 EMPEZAR AQUI — Fase 2 Ready to Test

**Estado**: ✅ Implementación COMPLETADA (39/39 archivos)  
**Fecha**: 2026-07-28  
**Tiempo de inicio**: ~3 minutos

---

## 🚀 Los 3 pasos más simples

### Paso 1: Levantar la infraestructura

```bash
cd /home/mlrsrv/SEBA/organizacion_almuerzos
docker-compose up --build
```

**Qué pasa**:
- ✅ PostgreSQL inicia en `localhost:5432`
- ✅ Firebase Emulator inicia en `localhost:8080` (UI: `localhost:4000`)
- ✅ Backend FastAPI inicia en `localhost:8000` (docs: `localhost:8000/docs`)

**Tiempo**: ~30s  
**No cierre esta terminal**. Ésta mostrará los logs.

---

### Paso 2: Aplicar migración (en otra terminal)

```bash
sleep 10  # Esperar a que PostgreSQL esté listo
psql -h localhost -U almuerzos_user -d almuerzos_db \
  -f backend/migrations/002_phase2_cascade.sql
```

**Resultado esperado**:
```
CREATE TABLE
CREATE TABLE
CREATE INDEX
...
```

**Tiempo**: ~5s

---

### Paso 3: Iniciar frontend (en una tercera terminal)

```bash
cd frontend
npm install  # Solo primera vez (~1 min)
npm run dev
```

**Resultado esperado**:
```
VITE v5.0.0  ready in 1234 ms

➜  Local:   http://localhost:5173/
```

**Abre http://localhost:5173 en tu navegador** ✨

---

## ✅ Verificar que todo funciona

### En el navegador (http://localhost:5173)

1. **Login**: Selecciona cualquier colaborador y clickea "Ingresar"
2. **Dashboard**: Deberías ver:
   - 🟢 **Barometro** arriba (verde/amarillo/rojo) — actualización en tiempo real
   - 📊 Si eres admin: **AdminPanel** con incidencias activas
   - 📅 Tabs: Calendario, Preferencias, Notificaciones

### En otras URLs

- **Firestore Emulator UI**: http://localhost:4000 — colecciones en tiempo real
- **API Docs**: http://localhost:8000/docs — swagger interactivo
- **Health check**: `curl http://localhost:8000/health` — debe retornar `{"status":"ok"}`

---

## 🎮 Prueba el flujo completo (5 minutos)

**Terminal 4**: Simular los eventos

```bash
# 1. Simular notificación T-5min para turno 1
curl -X POST http://localhost:8000/api/dev/simular-evento \
  -H "Content-Type: application/json" \
  -d '{"tipo": "t_minus_5", "id": 1}'

# ✓ Resultado: {"status": "notificacion_t5_simulada", "turno_id": 1}
# Deberías ver la notificación en Firestore (http://localhost:4000)
```

```bash
# 2. Colaborador rechaza (simular respuesta negativa)
curl -X POST http://localhost:8000/api/notificaciones/1/responder \
  -H "Content-Type: application/json" \
  -d '{"respuesta": "no"}'

# ✓ Resultado: {"status": "cascada_iniciada", "asignacion_id": 1}
# Deberías ver:
#   - Nueva incidencia en Firestore
#   - Barometro cambió a AMARILLO (si hay cobertura)
#   - AdminPanel muestra la incidencia (en el navegador)
```

```bash
# 3. Simular fin de ventana admin (auto-broadcast)
curl -X POST http://localhost:8000/api/dev/simular-evento \
  -H "Content-Type: application/json" \
  -d '{"tipo": "admin_window_end", "id": 1}'

# ✓ Resultado: {"status": "admin_window_end_simulado", "incidencia_id": 1}
# Deberías ver:
#   - Estado cambió a "broadcast_activo" en Firestore
#   - AdminPanel se actualizó automáticamente
```

```bash
# 4. Un candidato acepta (FCFS)
curl -X POST http://localhost:8000/api/incidencias/1/aceptar

# ✓ Resultado: {"status": "aceptado", "incidencia_id": 1, ...}
# Deberías ver:
#   - Estado cambió a "resuelta"
#   - Barometro volvió a VERDE
#   - AdminPanel se limpió
```

**¿Qué cambió en tiempo real sin refresh?** 🎯 Eso es Firestore `onSnapshot` funcionando.

---

## 🧪 Correr tests automáticos

```bash
cd backend
pytest tests/test_cascade_engine.py tests/test_barometro.py -v
```

**Resultado esperado** (4 tests):
```
test_cascade_engine.py::test_cascade_engine_basic PASSED
test_cascade_engine.py::test_cascade_engine_multiple_candidates PASSED
test_barometro.py::test_barometro_verde PASSED
test_barometro.py::test_barometro_amarillo_with_incidencia PASSED

====== 4 passed in 0.45s ======
```

---

## 📚 Documentación

Si necesitas más detalles:

| Lee | Para |
|-----|------|
| `QUICK_REFERENCE.md` | Comandos rápidos y troubleshooting |
| `TEST_GUIDE.md` | Paso a paso detallado de cada test |
| `RESUMEN_IMPLEMENTACION.md` | Qué se implementó y por qué |
| `IMPLEMENTACION_FINAL.md` | Detalles técnicos completos |
| `FASE2_README.md` | Arquitectura general y decisiones |

**Recomendación**: Lee `RESUMEN_IMPLEMENTACION.md` primero (5 min).

---

## ⚡ Atajos útiles (Makefile)

```bash
make help              # Ver todos los comandos
make up                # Levantar docker-compose
make down              # Apagar contenedores
make db-migrate        # Aplicar migración
make test              # Correr tests
make logs              # Ver logs del backend
make frontend-dev      # Iniciar frontend dev
make sim-t5            # Simular T-5min (alias)
make sim-reject        # Simular rechazo (alias)
```

---

## ❓ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| "Can't connect to PostgreSQL" | `sleep 15` y volver a intentar |
| "Port 8000 en uso" | `kill $(lsof -t -i:8000)` |
| "npm no encontrado" | Instalar Node.js 16+ |
| "firebase-admin error" | `pip install -r backend/requirements.txt` |
| "Firestore no conecta" | Verificar `FIRESTORE_EMULATOR_HOST` en `.env.docker` |

**Ver más**: `QUICK_REFERENCE.md` sección "Troubleshooting"

---

## 🎯 Qué acabas de hacer

✅ **Backend (Python/FastAPI)**
- Servicios de scheduler, notificaciones, Firestore
- Lógica de cascada de cobertura
- Endpoints REST completos
- Tests automáticos

✅ **Frontend (React/TypeScript)**
- Hooks de real-time sync (Firestore)
- Componente Barometro tri-color
- Panel admin con incidencias activas
- Service worker para push

✅ **Infraestructura**
- Docker-compose con postgres + firebase-emulator
- Migración SQL para nuevas tablas
- Configuración local-first (sin cambios para GCP)

✅ **Documentación**
- 6 documentos guías
- Makefile con comandos útiles
- Tests que demuestran funcionalidad

---

## 🚀 Próximos Pasos (después de verificar)

1. **Crear turnos**: Agregar `POST /admin/generar-turnos` para crear asignaciones
2. **Auth real**: Reemplazar mock JWT con OAuth/real
3. **Push FCM real**: Cuando hagas deploy a GCP
4. **Tests e2e**: Cypress/Playwright para flujo completo
5. **Deploy**: Cloud Run + Firestore real + Cloud Tasks

Ver `IMPLEMENTACION_CHECKLIST.md` para Fase 3 en adelante.

---

## 💬 Si algo no funciona

1. **Verifica logs**: `docker-compose logs backend | tail -50`
2. **Lee**: `TEST_GUIDE.md` (paso-a-paso completo)
3. **Busca**: `QUICK_REFERENCE.md` (troubleshooting)

---

## ⏱️ Resumen de tiempos

| Tarea | Tiempo |
|-------|--------|
| docker-compose up | 30s |
| Aplicar migración | 5s |
| npm install | 1m (primera vez) |
| npm run dev | 5s |
| Verificar en navegador | 1m |
| Prueba manual flujo | 5m |
| Correr tests | 30s |
| **Total** | **~10 minutos** |

---

## 🎉 ¿Listo?

**Abre 4 terminales lado a lado:**

```
Terminal 1:     Terminal 2:           Terminal 3:         Terminal 4:
make up         (después 10s)         cd frontend         (simulaciones)
                make db-migrate       npm run dev
                (watch logs)          
```

Luego abre:
- http://localhost:5173 (frontend)
- http://localhost:4000 (Firestore UI)

**Y ejecuta los 4 curl commands** para ver Firestore actualizarse en tiempo real.

---

**¡Bienvenido a Fase 2! 🚀**

Cualquier duda, lee los documentos en este orden:
1. `EMPEZAR.md` (este archivo) ← Ya lo estás leyendo
2. `RESUMEN_IMPLEMENTACION.md` (5 min)
3. `QUICK_REFERENCE.md` (2 min)
4. `TEST_GUIDE.md` (detallado)
