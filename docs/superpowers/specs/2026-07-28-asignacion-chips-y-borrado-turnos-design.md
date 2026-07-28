# Diseño: Nueva UX de Asignación de Turnos con Chips y Borrado

**Fecha:** 2026-07-28  
**Estado:** Aprobado

---

## Problema

La pantalla de "Asignación de Turnos" usa un dropdown por asignación (slot). Esto tiene tres problemas:

1. No hay feedback visual sobre disponibilidad ni conflictos de sector.
2. No se puede borrar una asignación individual ni un turno entero.
3. No se puede eliminar una franja porque el backend rechaza eliminar franjas con turnos asociados, y no existe forma de borrar esos turnos desde la UI.

---

## Objetivo

Reemplazar los dropdowns de asignación por **chips coloreados** que muestren el estado de cada colaborador para esa franja, agregar borrado de asignaciones individuales y de turnos completos, e implementar detección de conflicto de sector con override de admin.

---

## Regla de negocio clave

Dentro de una franja horaria, no deberían coexistir dos personas del mismo sector (`comercial` o `operativo`). Si ya hay un `comercial` asignado, los demás `comerciales` tienen conflicto de función. La regla aplica igual a `operativo`. El admin puede igualmente asignar con un aviso explícito.

---

## Diseño de la UI

### Estados de chip

Cada colaborador se representa como un chip con uno de cuatro estados:

| Estado | Color | Condición | Clic |
|--------|-------|-----------|------|
| **Asignado** | Azul + ✓ | El colaborador ya está asignado a este turno | Desasignar directamente |
| **Disponible** | Verde + | No asignado, sin conflicto de sector, turno no lleno | Asignar directamente |
| **Conflicto** | Rojo ⚠ | No asignado, su sector ya está representado en el turno | Abre modal de confirmación |
| **Deshabilitado** | Gris | Turno en capacidad máxima y no está asignado | Sin acción |

Los chips muestran nombre + sector en texto pequeño.

### Header del turno card

- Muestra `hora_inicio – hora_fin (Orden N)` y badge `X / capacidad_maxima`.
- Badge azul si hay slots libres, verde si está lleno.
- Botón **"🗑 Borrar turno"** a la derecha, que abre un diálogo de confirmación.

### Modal: Override de sector

Aparece al hacer clic en un chip rojo. Muestra:

```
⚠️ Superposición de funciones

[Nombre] es [Sector] y ya hay un [Sector] asignado en esta franja ([Nombre del conflicto]).
La función [Sector] quedaría sin cobertura durante el almuerzo. ¿Igualmente asignar?

[Cancelar]  [Asignar igualmente]
```

Al confirmar, se hace la asignación normalmente vía API.

### Modal: Borrar turno

Confirmación antes de eliminar el TurnoAlmuerzo completo:

```
🗑 Borrar turno del día

Se eliminarán todas las asignaciones del turno [hora_inicio – hora_fin]
del [fecha]. Esta acción no se puede deshacer.

[Cancelar]  [Confirmar borrado]
```

### Lógica de color en el frontend

```typescript
function getChipState(colab, turno): 'assigned' | 'available' | 'conflict' | 'disabled' {
  const isAssigned = turno.asignaciones.some(a => a.colaborador_id === colab.id)
  if (isAssigned) return 'assigned'

  const isFull = turno.asignaciones.length >= turno.capacidad_maxima
  if (isFull) return 'disabled'

  const sectoresOcupados = new Set(turno.asignaciones.map(a => a.colaborador.sector))
  if (sectoresOcupados.has(colab.sector)) return 'conflict'

  return 'available'
}
```

---

## Cambios en el backend

### Nuevos endpoints

#### `POST /admin/turnos/{turno_id}/asignaciones`
Crea una nueva `AsignacionAlmuerzo`.

- Body: `{ colaborador_id: int }`
- Valida que el turno no supere `capacidad_maxima`. Si se supera, devuelve `409 Conflict`.
- No valida conflicto de sector (la validación y el override están en el frontend).
- Devuelve `AsignacionResponse`.

#### `DELETE /admin/turnos/asignaciones/{asignacion_id}`
Elimina una `AsignacionAlmuerzo` individual.

- Devuelve `204 No Content`.
- Si no existe, devuelve `404`.

#### `DELETE /admin/turnos/{turno_id}`
Elimina un `TurnoAlmuerzo` completo con cascade a sus `AsignacionAlmuerzo`.

- Devuelve `204 No Content`.
- Si no existe, devuelve `404`.

### Endpoint existente a conservar

`PATCH /admin/turnos/asignaciones/{asignacion_id}` — Se mantiene por compatibilidad pero ya no se usará desde el nuevo frontend. Se puede deprecar en el futuro.

---

## Cambios en el frontend

### `src/api/turnos.ts`

Agregar:
```typescript
createAsignacion: (turnoId: number, colaboradorId: number) =>
  client.post(`/admin/turnos/${turnoId}/asignaciones`, { colaborador_id: colaboradorId }),

deleteAsignacion: (asignacionId: number) =>
  client.delete(`/admin/turnos/asignaciones/${asignacionId}`),

deleteTurno: (turnoId: number) =>
  client.delete(`/admin/turnos/${turnoId}`),
```

### `src/components/AdminPanel.tsx` — Tab Asignación

Reemplazar la sección que renderiza `turno-card__asignaciones` (actualmente con `<select>`) por:

1. Función `getChipState(colab, turno)` como se describió arriba.
2. Render de chips con clase CSS según estado.
3. Handler `handleChipClick(colab, turno)`:
   - `assigned` → llama `deleteAsignacion(asignacion.id)` + recarga.
   - `available` → llama `createAsignacion(turno.id, colab.id)` + recarga.
   - `conflict` → setea estado de modal override con los datos del conflicto.
   - `disabled` → no hace nada.
4. Handler `handleDeleteTurno(turnoId)` → abre modal de confirmación → llama `deleteTurno(turnoId)` → recarga.
5. Estado para los modals:
   - `overrideModal: { turnoId, colaborador, conflictingColab } | null`
   - `deleteTurnoModal: { turnoId, turno } | null`

### `src/components/AdminPanel.css`

Agregar estilos para:
- `.chip` con modificadores: `.chip--assigned`, `.chip--available`, `.chip--conflict`, `.chip--disabled`
- `.chips-container`
- `.chip-legend`
- `.modal-overlay`, `.modal` (reutilizable para ambos modals)

---

## Flujo completo

```
Admin abre franja
  ↓
Ve todos los colaboradores como chips coloreados
  ↓
Clic en verde (disponible)
  → POST /admin/turnos/{id}/asignaciones
  → Chip pasa a azul (asignado)
  → Si el nuevo asignado es comercial, otros comerciales pasan a rojo

Clic en azul (asignado)
  → DELETE /admin/turnos/asignaciones/{id}
  → Chip vuelve a verde o rojo según estado

Clic en rojo (conflicto)
  → Modal: "¿Igualmente asignar?"
  → Confirmar → POST → asigna igual

Clic en "🗑 Borrar turno"
  → Modal: "¿Confirmar borrado?"
  → Confirmar → DELETE /admin/turnos/{id}
  → La card desaparece de la lista
```

---

## Lo que no cambia

- Tab de Franjas: CRUD de franjas horarias sin cambios.
- Tab de Colaboradores: sin cambios.
- Tab de Incidencias: sin cambios.
- Generación de semana: sin cambios.
- El endpoint `PATCH /admin/turnos/asignaciones/{id}` se conserva sin tocar.
