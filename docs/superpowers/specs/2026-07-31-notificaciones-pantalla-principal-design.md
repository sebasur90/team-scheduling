# Diseño: Notificaciones y alertas en pantalla principal

**Fecha:** 2026-07-31  
**Estado:** Aprobado

## Contexto

La app de scheduling está pensada para celular. Actualmente las notificaciones están enterradas en la pestaña "Notificaciones" — el usuario tiene que navegar hasta allí para enterarse de un swap pendiente o de la respuesta a uno que inició. El admin ve estadísticas hardcodeadas en ceros. El objetivo es surfacear la información urgente en la pantalla principal de cada rol sin cambiar la arquitectura existente.

## Decisiones de diseño

- **Enfoque elegido:** Extender hooks existentes + nuevo endpoint admin (opción A)
- **Patrón visual:** Banner en el tope de la pantalla principal (calendarView / AdminDashboard inicio), con badge en la pestaña Notificaciones
- **Real-time para usuarios:** Firestore `onSnapshot` ya existe en `useUserNotifications` — se reutiliza
- **Polling para admin:** `useAdminAlerts` consulta cada 60s — aceptable para stats agregadas

## Sección 1: Banners de usuario en CalendarView

### Componentes nuevos

**`SwapPendingBanner`**
- Se renderiza al tope de `CalendarView`, antes del calendario
- Fuente de datos: `useUserNotifications` filtrado por `tipo === 'swap_solicitado'` y `estado === 'pendiente'`
- Si hay más de uno: muestra el más reciente + contador "+ N más"
- Botones Aceptar / Rechazar llaman a `swapsApi.aceptar` / `swapsApi.rechazar`
- Al responder: Firestore actualiza el estado automáticamente, el banner desaparece
- Si no hay swaps pendientes: no renderiza nada (sin espacio vacío)

**`SwapResponseBanner`**
- Se renderiza al tope de `CalendarView`, debajo de `SwapPendingBanner`
- Fuente de datos: `useUserNotifications` filtrado por `tipo === 'swap_aceptado'` o `'swap_rechazado'` y `leida === false`
- Banner verde si aceptado: muestra el nuevo turno asignado
- Banner rojo si rechazado: muestra el motivo si hay uno
- Botón "Entendido" llama a `PATCH /notificaciones/{id}/leer` y cierra el banner
- Si hay múltiples respuestas no leídas, se apilan verticalmente

### Badge en pestaña Notificaciones

- En `Dashboard.tsx`, el botón del tab "Notificaciones" muestra un badge rojo con el conteo de `notificaciones.filter(n => !n.leida).length`
- Dato proviene del mismo `useUserNotifications` — sin llamada adicional

## Sección 2: Endpoint y hook para el admin

### `GET /admin/resumen`

Archivo nuevo: `backend/app/api/admin_resumen.py`  
Requiere `rol === 'admin'`.

Respuesta:
```json
{
  "swaps_pendientes": {
    "count": 3,
    "items": [
      { "swap_id": 12, "solicitante": "Carlos", "receptor": "Ana", "fecha": "2026-08-01", "hace": "2h" }
    ]
  },
  "turnos_sin_confirmar": {
    "count": 2,
    "items": [
      { "fecha": "2026-08-01", "franja": "13:00–14:00", "pendientes": 2 }
    ]
  },
  "cobertura_en_riesgo": {
    "count": 0,
    "items": []
  }
}
```

Consultas:
- `swaps_pendientes`: `SwapSolicitud.estado == 'pendiente'`
- `turnos_sin_confirmar`: `AsignacionAlmuerzo.estado == 'pendiente_confirmacion'` agrupado por franja y fecha
- `cobertura_en_riesgo`: reutilizar lógica existente de `cobertura.py` para detectar franjas bajo mínimo
- `colaboradores_activos`: `Colaborador.activo == True` count

### `useAdminAlerts`

Archivo nuevo: `frontend/src/hooks/useAdminAlerts.ts`

- Llama `GET /admin/resumen` al montar
- Refresca cada 60 segundos con `setInterval`
- Cleanup del interval en el `useEffect` de desmontaje
- Devuelve `{ resumen, loading, error, refetch }`

## Sección 3: Pantalla de inicio del admin

### Tarjetas de stats (reemplazo del hardcoded)

Grilla 2×2 con datos reales de `useAdminAlerts`:

| Tarjeta | Color si > 0 | Color si = 0 | Dato |
|---|---|---|---|
| Swaps pendientes | Rojo | Verde | `resumen.swaps_pendientes.count` |
| Sin confirmar hoy | Amarillo | Verde | `resumen.turnos_sin_confirmar.count` |
| Cobertura en riesgo | Rojo | Verde (✓ OK) | `resumen.cobertura_en_riesgo.count` |
| Colaboradores activos | Siempre verde | — | `resumen.colaboradores_activos` (se suma al endpoint) |

### Feed de alertas "Requieren atención"

- Solo se renderiza si `count > 0` en alguno de los tres bloques
- Orden de prioridad (de mayor a menor urgencia):
  1. Swaps pendientes — borde rojo, ícono ↔️
  2. Cobertura en riesgo — borde rojo, ícono ⚠️
  3. Turnos sin confirmar — borde amarillo, ícono ⏳
- Cada ítem muestra: descripción breve + tiempo/fecha + botón "Ver →"
- "Ver →" navega al tab correspondiente:
  - Swaps → tab `colaboradores`
  - Cobertura / sin confirmar → tab `calendario`
- Si no hay nada: se muestra mensaje "Todo en orden ✓" en verde, sin feed

### Badge en sidebar del admin

- El ítem "Notificaciones" del sidebar muestra badge rojo con `swaps_pendientes.count + cobertura_en_riesgo.count`
- Se actualiza con cada polling de `useAdminAlerts`

## Archivos a crear / modificar

| Archivo | Acción |
|---|---|
| `frontend/src/components/SwapPendingBanner.tsx` | Crear |
| `frontend/src/components/SwapResponseBanner.tsx` | Crear |
| `frontend/src/hooks/useAdminAlerts.ts` | Crear |
| `backend/app/api/admin_resumen.py` | Crear |
| `frontend/src/components/CalendarView.tsx` | Modificar — agregar banners al tope |
| `frontend/src/components/Dashboard.tsx` | Modificar — badge en tab Notificaciones |
| `frontend/src/components/AdminDashboard.tsx` | Modificar — stats reales + feed |
| `backend/app/main.py` | Modificar — registrar router admin_resumen |

## Lo que NO cambia

- Arquitectura de Firestore para notificaciones de usuario
- `useUserNotifications` hook — solo se consume desde más lugares
- `NotificationCenter` — sigue existiendo como vista completa en el tab Notificaciones
- Flujo de creación/aceptación/rechazo de swaps en el backend
