# ⚡ Quick Reference — Fase 2 Comandos Útiles

## 🚀 Iniciar Todo

```bash
# Terminal 1: Infraestructura
make up

# Terminal 2: Aplicar migración (esperar ~10s)
make db-migrate

# Terminal 3: Frontend dev
make frontend-dev

# Verificar:
make health              # API check
make firestore-ui        # Abre UI de Firestore
make frontend-ui         # Abre frontend
```

## 🧪 Correr Tests

```bash
make test                # Todos los tests
make test-backend        # Solo backend
```

## 🔍 Debugging & Explorando

```bash
# Ver logs del backend en vivo
make logs

# Conectar a PostgreSQL
make db-psql

# Ver colaboradores disponibles
make list-colabs

# Ver franjas horarias
make list-franjas

# Ver incidencias activas
make list-admin-incidencias
```

## 🎮 Simular Eventos (Flujo Completo)

```bash
# 1. Notificación T-5min para turno 1
make sim-t5
# Resultado: notificación creada, estado: "pendiente"

# 2. Colaborador rechaza
make sim-reject
# Resultado: cascada iniciada, incidencia creada (ventana_admin)

# 3. Simular fin de ventana admin (auto-broadcast)
make sim-admin-window-end
# Resultado: incidencia → broadcast_activo

# 4. Verificar en Firestore UI (http://localhost:4000)
```

## 📡 API Endpoints (curl examples)

### Notificaciones
```bash
# Responder a una notificación
curl -X POST http://localhost:8000/api/notificaciones/1/responder \
  -H "Content-Type: application/json" \
  -d '{"respuesta": "si"}'
```

### Incidencias
```bash
# Aceptar reemplazo (FCFS)
curl -X POST http://localhost:8000/api/incidencias/1/aceptar

# Listar incidencias activas
curl http://localhost:8000/api/admin/incidencias

# Admin: disparar broadcast
curl -X POST http://localhost:8000/api/admin/incidencias/1/broadcast

# Admin: resolver presencialmente
curl -X POST http://localhost:8000/api/admin/incidencias/1/presencial
```

### Desarrollo
```bash
# Simular evento genérico
curl -X POST http://localhost:8000/api/dev/simular-evento \
  -H "Content-Type: application/json" \
  -d '{"tipo": "t_minus_5", "id": 1}'
```

## 🗂️ Estructura de Directorios (Lo que Cambió)

```
backend/
  app/
    services/         ← NEW (3 archivos)
    api/
      notificaciones.py  ← NEW
      incidencias.py     ← NEW
      admin_incidencias.py  ← NEW
      dev.py          ← NEW
      colaboradores.py  ← MODIFIED (fcm-token endpoint)
    core/
      cascade_engine.py  ← NEW
      barometro.py    ← NEW
    models/
      incidencia.py   ← NEW
      colaborador.py  ← MODIFIED (fcm_token field)
      notificacion.py ← MODIFIED (canal, incidencia_id)
    enums.py          ← MODIFIED (nuevos enums)
    config.py         ← MODIFIED (nuevas env vars)
    main.py           ← MODIFIED (routers + scheduler)

frontend/
  src/
    lib/
      firebase.ts     ← NEW
    hooks/
      useBarometro.ts ← NEW
      useIncidencias.ts  ← NEW
      useUserNotifications.ts  ← NEW
    components/
      Barometro.tsx   ← NEW
      AdminPanel.tsx  ← NEW
      Dashboard.tsx   ← MODIFIED (integración)
    contexts/
      AuthContext.tsx ← MODIFIED (export useAuthContext)
    App.tsx           ← MODIFIED (SW registration)
  public/
    sw.js             ← NEW
  vite.config.ts      ← NEW (nuevo archivo)
```

## 📊 Base de Datos

### Nuevas Tablas
```sql
incidencia_cobertura
  id, asignacion_id, motivo, estado, colaborador_reemplazante_id,
  created_at, resolved_at, updated_at

historial_reemplazos
  id, colaborador_id, incidencia_id, fecha, semana_iso, created_at
```

### Campos Nuevos
```sql
colaborador.fcm_token VARCHAR(512)
notificacion.canal VARCHAR(20) DEFAULT 'in_app'
notificacion.incidencia_id INTEGER FK
asignacion_almuerzo.estado VARCHAR CHECK in ('firme', 'pendiente_swap', 'notificada', 'confirmada')
```

## 🔗 Firestore Collections (Real-time)

```
sucursal/
  default/
    data/
      barometro: {estado, franjas[], incidencias_activas}

notificaciones/{uid}/
  items/{notif_id}: {tipo, franja, fecha, estado, expires_at}

incidencias/{id}
  {estado, franja, fecha, colaborador_afectado, candidatos[], motivo, admin_window_ends_at}
```

## 📖 Documentación por Tema

| Tema | Archivo |
|------|---------|
| **Empezar** | IMPLEMENTACION_FINAL.md |
| **Testing paso a paso** | TEST_GUIDE.md |
| **Arquitectura general** | FASE2_README.md |
| **Tareas completadas** | IMPLEMENTACION_CHECKLIST.md |
| **Resumen ejecutivo** | RESUMEN_IMPLEMENTACION.md |
| **Este archivo** | QUICK_REFERENCE.md |

## 🛠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| "Firestore no se conecta" | Verificar `FIRESTORE_EMULATOR_HOST` en `.env.docker` |
| "PostgreSQL connection refused" | Esperar 10s más, `docker-compose logs postgres` |
| "Port 5173 en uso" | `kill $(lsof -t -i:5173)` o cambiar port en `vite.config.ts` |
| "firebase-admin not found" | `pip install -r backend/requirements.txt` |
| "npm: command not found" | Instalar Node.js 16+ |

## ⌨️ Keyboard Shortcuts (en http://localhost:5173)

- Ctrl+K → Buscar (próximamente)
- F12 → DevTools (verificar Firestore conexión)
- Esc → Cerrar AdminPanel details

## 💾 Guardar Cambios

```bash
# Después de editar código backend
docker-compose restart backend

# Después de editar código frontend
# Vite hot-reload automático (npm run dev)

# Después de editar esquema DB
# Crear nueva migración 003_*.sql
```

## 🔐 Tokens & Auth (Dev)

```bash
# Mock token para requests
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Usar en requests
curl http://localhost:8000/api/colaboradores?token=$TOKEN
```

## 📈 Performance Tips

```bash
# Verificar que Firestore Emulator no ocupa mucha RAM
docker stats firebase-emulator

# Limpiar volúmenes si hay problemas
make clean
docker-compose up --build
```

## 🚀 One-Liners Útiles

```bash
# Setup completo (5s)
make down && make up && sleep 10 && make db-migrate

# Correr todo en paralelo
make up & make frontend-dev & make test

# Ver cambios en tiempo real en DB
watch -n 1 'psql -h localhost -U almuerzos_user -d almuerzos_db -c "SELECT COUNT(*) FROM incidencia_cobertura;"'
```

## 📞 Contacto / Ayuda

- 📚 Lee: IMPLEMENTACION_FINAL.md
- 🧪 Sigue: TEST_GUIDE.md
- 💬 Usa: `make help`

---

**Pro Tip**: Abre 4 terminales lado a lado:
1. `make up`
2. `make logs`
3. `make frontend-dev`
4. `make test` (periódicamente)

Así ves todo lo que pasa en tiempo real. 🎯
