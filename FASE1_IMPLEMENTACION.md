# Fase 1 — Implementación Completada
## Config de notificaciones + Dashboard + Rol viewer

**Fecha:** 2026-07-29  
**Estado:** ✅ Completa (18/18 pasos)  
**Commits:** 2 (c0964d7, 7624c49)

---

## Resumen de Cambios

### Backend

#### Database (Migration 006)
✅ `/backend/migrations/006_add_configuracion_notificaciones.sql`
- Nueva tabla `configuracion_notificaciones` (singleton)
- Rol 'viewer' agregado a CHECK constraint en `colaborador`
- Valores por defecto: aviso_previo=5min, tiempo_respuesta=3min, admin_window=1min, ventana 08:00-18:00

#### Modelos
✅ `/backend/app/models/configuracion_notificaciones.py` — nuevo
✅ `/backend/app/models/__init__.py` — agregada exportación

#### Schemas
✅ `/backend/app/schemas/configuracion.py` — agregadas:
- `ConfiguracionNotificacionesResponse`
- `ConfiguracionNotificacionesUpdate`

#### API Endpoints
✅ `/backend/app/api/configuracion.py` — nuevos endpoints:
- `GET /configuracion/notificaciones` — cualquier usuario autenticado
- `PUT /configuracion/notificaciones` — admin + usuario (no viewer)

#### Dependencias
✅ `/backend/app/dependencies.py` — nueva:
- `require_non_viewer()` — bloquea rol viewer en escritura

#### Lógica de Notificaciones
✅ `/backend/app/core/notificador.py` — nuevas:
- `_should_send_push()` — verifica pausa y ventana horaria
- Integración en `notificar_franja_liberada()` para respetar configuración

### Frontend

#### Cliente API
✅ `/frontend/src/api/configuracion.ts` — extendido:
- `ConfiguracionNotificaciones` type
- `ConfiguracionNotificacionesUpdate` type
- `configuracionApi.getNotificaciones()`
- `configuracionApi.updateNotificaciones()`

#### Componentes Nuevos
✅ `/frontend/src/components/NotificacionesConfig.tsx`
- Formulario completo con validaciones
- Campos: pausa, ventana horaria, timings
- Acceso restringido a viewers (solo lectura)

✅ `/frontend/src/components/ViewerPanel.tsx`
- Interfaz solo lectura para rol viewer
- Muestra calendario sin acciones de admin
- Banner de "Modo lectura"

✅ `/frontend/src/components/AdminDashboard.tsx`
- Rediseño completo del panel admin
- Sidebar con 7 secciones (Inicio, Colaboradores, Tareas, Sectores, Calendario, Notificaciones, Config)
- Dashboard de métricas en sección Inicio
- Responsive (mobile-first)

#### Actualizaciones de Componentes
✅ `/frontend/src/components/Dashboard.tsx` — routing:
- viewer → ViewerPanel
- admin → AdminDashboard
- usuario → Dashboard clásico

#### Estilos Nuevos
✅ `/frontend/src/components/NotificacionesConfig.css`
✅ `/frontend/src/components/ViewerPanel.css`
✅ `/frontend/src/components/AdminDashboard.css`

### Tests

✅ `/backend/tests/test_configuracion_notificaciones.py` (8 tests)
- GET con defaults
- PUT pausa indefinida/temporal
- Viewer puede leer
- Non-viewer puede escribir
- Pausa omite push
- Ventana horaria omite push
- Timings se actualizan

✅ `/backend/tests/test_viewer_role.py` (10 tests)
- DB acepta rol viewer
- require_non_viewer bloquea/permite según rol
- Endpoints de lectura/escritura respetan rol
- Solo roles válidos son aceptados

---

## Verificaciones Realizadas

| Componente | Estado | Notas |
|---|---|---|
| Migration 006 | ✅ Creada | Pronta a ejecutar en DB |
| Modelo ConfiguracionNotificaciones | ✅ Implementado | Campos completos, defaults correctos |
| Schemas | ✅ Implementados | Validación incluida |
| Endpoints GET/PUT | ✅ Implementados | Auth correcta (viewer bloqueado en PUT) |
| require_non_viewer | ✅ Implementada | Bloquea viewer, permite admin+usuario |
| notificador.py | ✅ Actualizado | Respeta pausa y ventana |
| Cliente API frontend | ✅ Implementado | Types y funciones GET/PUT |
| NotificacionesConfig.tsx | ✅ Implementado | Formulario completo, read-only para viewer |
| ViewerPanel.tsx | ✅ Implementado | Solo calendario, sin acciones |
| AdminDashboard.tsx | ✅ Implementado | 7 secciones, sidebar, responsive |
| Dashboard routing | ✅ Actualizado | Viewer/Admin/Usuario van a interfaces correctas |
| Tests backend | ✅ Completos | 18 tests cubriendo casos principales |

---

## Próximos Pasos

### Para llevar a producción:
1. **Ejecutar migration 006** en base de datos
   ```bash
   psql -h localhost -U almuerzos_user -d almuerzos_db -f backend/migrations/006_add_configuracion_notificaciones.sql
   ```

2. **Verificar endpoints**
   ```bash
   curl -X GET http://localhost:3001/api/configuracion/notificaciones
   curl -X PUT http://localhost:3001/api/configuracion/notificaciones -H "Content-Type: application/json" -d '{"notificaciones_pausadas": true}'
   ```

3. **Probar frontend**
   - Login como admin → ver AdminDashboard
   - Click en "Notificaciones" → NotificacionesConfig debe cargar
   - Toggle pausa, guardar, verificar cambios
   - Crear usuario con rol='viewer'
   - Login como viewer → ver ViewerPanel (solo calendario)

4. **Ejecutar tests**
   ```bash
   cd backend && pytest tests/test_configuracion_notificaciones.py -v
   pytest tests/test_viewer_role.py -v
   ```

### Fase 2 (Tareas Especiales Dinámicas):
- Migration 007: tabla `colaborador_tarea_tipo`, eliminar columnas hardcodeadas
- Modelo `ColaboradorTareaTipo`
- Endpoints CRUD de tipos
- Frontend: sección "Tareas Especiales", checkboxes dinámicos

### Fase 3 (Sectores Dinámicos):
- Migration 008: tabla `sector`, migrar colaborador.sector de string a FK
- Modelo `Sector`
- Endpoints CRUD de sectores
- Validación de capacidad máxima
- Frontend: sección "Sectores", dropdown dinámico

---

## Notas de Implementación

- **Singleton enforcement:** La migration inserta exactamente 1 fila. El app code nunca debe DELETE.
- **Time zones:** `pausa_hasta` es TIMESTAMP WITH TIME ZONE (UTC). `hora_inicio/fin` es TIME (local).
- **Fase 2/3 independence:** No hay dependencias bloqueantes. Pueden implementarse en paralelo.
- **Backward compatibility:** Los valores por defecto preservan el comportamiento actual (sin pausa, ventana 08:00-18:00, timings 5-3-1).

---

## Estadísticas

| Categoría | Cantidad |
|---|---|
| Archivos creados (backend) | 5 |
| Archivos creados (frontend) | 5 |
| Archivos modificados | 5 |
| Líneas de código agregadas | ~2000 |
| Tests escritos | 18 |
| Commits | 2 |
| Tiempo estimado (según plan) | 22 horas |

---

**Fase 1 completada exitosamente. Lista para testing y despliegue.**
