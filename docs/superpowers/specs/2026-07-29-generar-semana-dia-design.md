# Diseño: Botones de Generación de Semana/Día en CalendarView

**Fecha:** 2026-07-29  
**Estado:** Aprobado

---

## Objetivo

Consolidar toda la funcionalidad de generación de turnos en CalendarView, que pasa a ser el workspace único del admin. Eliminar la duplicación con el botón "Generar Turnos de la Semana" del tab Asignación de Turnos en AdminPanel.

**Motivación principal:** cuando colaboradores cambian preferencias en el medio de la semana, el admin necesita regenerar desde ese día en adelante sin salir de la vista del calendario.

---

## Controles en CalendarView

### Botón existente: "Generar Semana"

Ya existe en la barra `week-info`. Sin cambios de ubicación. Genera lunes a viernes de la semana visible.

### Nuevo: botón ↻ por columna de día

- Aparece en el header de cada columna de día (Lun, Mar, Mié, Jue, Vie).
- Visible **solo para rol `admin`**.
- Ícono pequeño sin texto (↻ o similar), sin interrumpir el layout del calendario.
- Al hacer clic en el día X, regenera X y todos los días siguientes hasta el viernes de esa semana.

---

## Comportamiento de generación

| Acción | Días generados | Llamadas al backend |
|---|---|---|
| "Generar Semana" | Lun → Vie | 1 × `generateWeek(lunes)` |
| ↻ del lunes | Lun → Vie | igual que Generar Semana |
| ↻ del miércoles | Mié → Vie | 3 × `generateDay(fecha)` en secuencia |
| ↻ del viernes | Vie | 1 × `generateDay(fecha)` |

Las llamadas son **secuenciales** (no paralelas) porque el algoritmo de cada día puede depender de las asignaciones del día anterior.

Tras la generación, el calendario recarga los datos de todos los días afectados.

---

## Modal de resultado

El CalendarView reemplaza los `alert()` actuales por el mismo modal rico que usa AdminPanel (`GenerationResult`). Campos:

- `status`: `"ok"` | `"warning"` | `"error"`
- `message`: resumen general
- `dias_con_advertencia`: lista de días con advertencias
- `dias_con_error`: lista de días con errores
- `dias_salteados`: días omitidos (no laborables, etc.)

Para el caso multi-día (ej. ↻ del miércoles), los resultados de las 3 llamadas se **agregan** en un solo modal antes de mostrarlo.

Estado a agregar en CalendarView:
```ts
const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null)
```

---

## Backend: nuevo endpoint `generate_day`

Se agrega `POST /turnos/generate-day` con body `{ fecha: "YYYY-MM-DD" }`.

Respuesta: misma estructura que `generateWeek` pero para un solo día:
```json
{
  "status": "ok" | "warning" | "error",
  "mensaje": "...",
  "turnos_generados": [...],
  "dias_con_advertencia": [...],
  "dias_con_error": [...],
  "dias_salteados": [...]
}
```

En el frontend, `turnosApi.generateDay(fecha)` se agrega al archivo de API.

---

## Cambios a AdminPanel

- Se elimina el botón "Generar Turnos de la Semana" del tab Asignación de Turnos.
- El date picker y la lista de turnos del tab Asignación de Turnos **no se tocan** en este spec (son independientes del botón de generación).

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `frontend/src/components/CalendarView.tsx` | Agregar estado `generationResult`, handler `handleGenerarDesdeElDia(date)`, botones ↻ en headers de columna, modal de resultado |
| `frontend/src/components/CalendarView.css` | Estilos para botón ↻ y modal |
| `frontend/src/api/turnos.ts` | Agregar función `generateDay(fecha)` |
| `frontend/src/components/AdminPanel.tsx` | Eliminar botón "Generar Turnos de la Semana" |
| `backend/routers/turnos.py` (o similar) | Agregar endpoint `POST /turnos/generate-day` |

---

## Fuera de scope

- Agregar/quitar colaboradores desde CalendarView (feature separada).
- Cambios al layout general de CalendarView más allá de los botones ↻.
- Modificar la lógica del algoritmo de generación.
