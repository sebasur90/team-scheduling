# Diseño: Pantalla de Reportes y Estadísticas para Admin

**Fecha:** 2026-07-31  
**Estado:** Aprobado

---

## Resumen

Pantalla dedicada `/admin/reportes` que permite al admin visualizar y exportar estadísticas operativas del sistema de scheduling de almuerzos. Cubre tres áreas: ausencias de colaboradores, distribución de franjas horarias y actividad de swaps.

---

## Arquitectura

### Nueva ruta frontend
- **Ruta:** `/admin/reportes`
- **Componente:** `ReportesPanel.tsx`
- **Acceso:** desde `AdminBottomNav` (ícono de gráfico) y desde `AdminDashboard`

### Nuevos endpoints backend
Todos bajo `/admin/reportes` con autenticación de admin:

| Endpoint | Descripción |
|---|---|
| `GET /admin/reportes/ausencias` | Ausencias por colaborador y detalle |
| `GET /admin/reportes/franjas` | Distribución, cumplimiento de preferencias y cobertura |
| `GET /admin/reportes/swaps` | Resumen, ranking y detalle de swaps |
| `GET /admin/reportes/export/csv` | Exportar pestaña activa en CSV |
| `GET /admin/reportes/export/pdf` | Exportar pestaña activa en PDF |

**Parámetros comunes a todos los endpoints de datos:**
- `fecha_inicio: date`
- `fecha_fin: date`
- `sector_id?: int` (opcional, filtra por sector)

---

## Layout (mobile-first)

### Mobile
```
┌─────────────────────────┐
│ ← Reportes              │
├─────────────────────────┤
│ FILTROS (apilados)      │
│  [Semanal / Mensual / Personalizado ▾]
│  [fecha_inicio – fecha_fin ▾]
│  [Sector: Todos ▾]      │
│                         │
│ KPIs (scroll horizontal)│
│  [Ausencias][Swaps][Cobertura]→
│                         │
│ TABS (scroll horizontal)│
│  [Ausencias][Franjas][Swaps]
│                         │
│  ... contenido tab ...  │
│                         │
│  [⬇ CSV]  [⬇ PDF]      │
└─────────────────────────┘
```

### Desktop
Los filtros se reorganizan en una fila horizontal. Las KPIs pasan a una grilla de 3 columnas. El resto del layout se mantiene igual.

---

## Filtros globales

| Filtro | Opciones |
|---|---|
| Período preestablecido | `Semanal` (últimos 7 días), `Mensual` (mes en curso) |
| Rango de fechas | Selector de fecha de inicio y fin libre |
| Sector | Dropdown con todos los sectores + opción "Todos" |

Al seleccionar `Semanal` o `Mensual` se autocompletan las fechas. El usuario puede sobreescribirlas libremente con el selector.

---

## KPIs de resumen (siempre visibles)

Tres cards en carrusel horizontal (mobile) / grilla 3 columnas (desktop):

1. **Ausencias** — total de ausencias en el período (excluyendo vacaciones). Subtítulo con cantidad de vacaciones para contexto.
2. **Swaps** — `X✓ Y✗ Z⏳` (aceptados / rechazados / pendientes).
3. **Cobertura** — porcentaje promedio de días donde la cobertura real ≥ mínimo configurado.

---

## Sección: Ausencias

### Datos mostrados
1. **Ranking por persona** — lista de colaboradores ordenada por cantidad de ausencias, con barra de progreso visual y tipo predominante. Tipos según campo `motivo`: `licencia`, `enfermedad`, `otro` (en un color) y `vacaciones` (en color diferente para distinguir planificadas de no planificadas).
2. **Tabla detalle** — columnas: Fecha, Colaborador, Motivo. Ordenable por cualquier columna.

### Fuente de datos
- Tabla `Ausencia` (campo `motivo` con valores: `'licencia'`, `'enfermedad'`, `'otro'`, `'vacaciones'`). Las vacaciones se incluyen en el conteo total pero se resaltan visualmente como planificadas.

---

## Sección: Distribución de Franjas

### Datos mostrados
1. **Distribución por franja** — cantidad de asignaciones que tuvo cada franja horaria en el período. Barra horizontal por franja. Permite detectar franjas sobreusadas o subusadas.
2. **Cumplimiento de preferencias** — porcentaje global y por colaborador de días en que se asignó la franja preferida. Íconos de alerta (`⚠`) para quienes estén por debajo del 70%.
3. **Cobertura real vs. configurada** — tabla con columnas: Franja, Promedio real, Mínimo configurado, Estado (✓/✗). Marca en rojo las franjas que no alcanzan el mínimo.

### Fuente de datos
- `AsignacionAlmuerzo` + `TurnoAlmuerzo` + `FranjaHoraria`
- `ConfiguracionCobertura` para los mínimos
- `Preferencias` de cada colaborador

---

## Sección: Swaps

### Datos mostrados
1. **Resumen** — total, aceptados (con %), rechazados (con %), pendientes.
2. **Más activos** — ranking de colaboradores con más actividad de swap, diferenciando solicitudes enviadas (↑) y recibidas (↓).
3. **Tabla detalle** — columnas: Fecha, Solicitante, Receptor, Estado (✓/✗/⏳). Ordenable.

### Fuente de datos
- Tabla `SwapSolicitud` con sus relaciones a `AsignacionAlmuerzo` y `Colaborador`

---

## Exportación

Los botones de exportación exportan **la sección activa** (no todas a la vez) con los filtros aplicados en ese momento.

| Formato | Implementación |
|---|---|
| **CSV** | Generado en backend con Python `csv` stdlib. Descarga directa. |
| **PDF** | Generado en backend con `WeasyPrint`. Renderiza una plantilla HTML a PDF. Incluye período y tabla de datos. |

El endpoint recibe un parámetro `seccion: "ausencias" | "franjas" | "swaps"` y `formato: "csv" | "pdf"`.

---

## Navegación

- **AdminBottomNav:** agregar ícono de gráfico de barras (ej. `BarChart2` de lucide-react) como nueva entrada.
- **AdminDashboard:** agregar card o botón "Ver Reportes" en el área de accesos rápidos.
- El botón `←` del header vuelve al `AdminDashboard`.

---

## Componentes frontend

| Componente | Responsabilidad |
|---|---|
| `ReportesPanel.tsx` | Página principal, maneja filtros y estado de tab activa |
| `ReportesFiltros.tsx` | Selector de período, rango de fechas y sector |
| `ReportesKPIs.tsx` | Cards de resumen (carrusel mobile / grilla desktop) |
| `ReportesAusencias.tsx` | Contenido de la tab Ausencias |
| `ReportesFranjas.tsx` | Contenido de la tab Distribución de Franjas |
| `ReportesSwaps.tsx` | Contenido de la tab Swaps |
| `ReportesExportBar.tsx` | Botones CSV y PDF con lógica de descarga |

---

## Consideraciones técnicas

- Los endpoints de datos retornan JSON; el frontend los consume con el hook `useReportes` (similar a los hooks existentes).
- El PDF se genera completamente en el backend para no depender de librerías de renderizado en el cliente.
- No se almacenan reportes generados — son siempre bajo demanda.
- El filtro de sector es opcional: si no se envía, se retornan datos de todos los sectores.
- Las ausencias de tipo `Vacaciones` se distinguen visualmente pero se incluyen en los cálculos de cobertura real.
