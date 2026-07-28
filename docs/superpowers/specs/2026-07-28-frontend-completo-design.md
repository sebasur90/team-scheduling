# Frontend Completo y Llamadas API — Diseño

**Fecha:** 2026-07-28
**Estado:** Aprobado para plan de implementación

## 1. Objetivo

Completar el frontend de la app de organización de almuerzos cerrando los gaps entre UI y backend:
- Formulario de colaborador mejorado con lista de colaboradores existentes
- Gestión de franjas horarias por el admin (CRUD completo)
- Calendario que muestra la semana aunque no haya turnos generados
- Preferencias conectadas a la API real
- Generación de turnos semanal (Lun-Vie) en lugar de por día

## 2. Gaps detectados en el estado actual

### Backend — endpoints faltantes
| Endpoint | Estado actual | Problema |
|---|---|---|
| `GET /api/turnos?fecha=` | No registrado | CalendarView nunca obtiene datos reales |
| `POST /api/preferencias` | No registrado | Preferences.handleSubmit es un stub vacío |
| `GET /api/preferencias?fecha=&colaborador_id=` | No existe | No hay forma de precargar preferencia del día |
| `POST /api/franjas` | No existe | Admin no puede crear franjas |
| `PATCH /api/franjas/{id}` | No existe | Admin no puede modificar horarios de franjas |
| `DELETE /api/franjas/{id}` | No existe | Admin no puede eliminar franjas |
| `POST /api/admin/generar-turnos-semana` | No existe | Solo existe generación por día |

### Frontend — comportamiento roto
| Componente | Problema |
|---|---|
| `Preferences.tsx` | `handleSubmit` no llama ninguna API |
| `CalendarView.tsx` | `assigned` siempre `[]`; nunca llama a `/turnos` |
| `AdminPanel.tsx` | Sin listado de colaboradores; sin gestión de franjas; form de crear es colapsable sin contexto visual |

## 3. Decisiones de diseño (UI)

- **Panel Admin:** 3 tabs — **Colaboradores** | **Franjas** | **Incidencias**
- **Tab Colaboradores:** tabla compacta con columnas (Nombre, Sector, Rol, Estado, Orientador, Gest.Externa) + botones ✏ / desactivar por fila + botón "+ Nuevo" arriba
- **Tab Franjas:** misma estructura (Orden, Inicio, Fin) + ✏ / 🗑 + "+ Nueva franja"
- **Calendario:** vista semanal (Lun-Vie), muestra las franjas vacías aunque no haya turnos generados
- **Generación de turnos:** semanal (Lun-Vie de una semana), con edición posterior día a día

## 4. Cambios de backend

### 4.1 `backend/app/schemas/franja.py`

Agregar dos schemas nuevos:

```python
class FranjaCreate(BaseModel):
    hora_inicio: time
    hora_fin: time
    orden: int

class FranjaUpdate(BaseModel):
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    orden: Optional[int] = None
```

### 4.2 `backend/app/api/franjas.py`

Agregar 3 endpoints (admin only):

- `POST /franjas` — crea franja nueva
- `PATCH /franjas/{id}` — edita hora_inicio, hora_fin u orden
- `DELETE /franjas/{id}` — elimina franja; rechaza con 409 si tiene turnos asociados

### 4.3 `backend/app/api/preferencias.py` (nuevo archivo)

- `POST /preferencias` — recibe `{ fecha, franja_horaria_id_deseada }` + colaborador del JWT. Si ya existe una preferencia para esa fecha, la reemplaza. Solo se acepta si el admin no generó turnos para ese día aún.
- `GET /preferencias?fecha=YYYY-MM-DD&colaborador_id=X` — devuelve la preferencia del colaborador para esa fecha, o `null` si no existe.

### 4.4 `backend/app/api/turnos.py` (nuevo archivo)

- `GET /turnos?fecha=YYYY-MM-DD` — devuelve las franjas horarias del día con sus asignaciones. Si no hay `TurnoAlmuerzo` generado para esa fecha, devuelve igual las franjas con `asignaciones: []`.

### 4.5 `backend/app/api/admin_turnos.py` (nuevo archivo)

- `POST /admin/turnos/generar-semana?semana=YYYY-MM-DD` — toma el lunes de la semana indicada y corre el motor para los 5 días laborales (Lun-Vie). Devuelve preview con los turnos generados y conflictos de empate pendientes. El admin confirma con un segundo request.
- `POST /admin/turnos/confirmar-semana?semana=YYYY-MM-DD` — persiste el preview ya generado.
- `PATCH /admin/turnos/asignaciones/{id}` — override puntual de una asignación (cambiar colaborador asignado a una franja en un día específico).

### 4.6 `backend/app/api/dias_no_laborables.py` (nuevo archivo)

- `GET /dias-no-laborables?mes=YYYY-MM` — devuelve lista de fechas marcadas como no laborables en ese mes.
- `POST /dias-no-laborables` — marca una fecha como no laborable: `{ fecha: "YYYY-MM-DD", motivo: string }`. Solo admin.
- `DELETE /dias-no-laborables/{fecha}` — revierte un día no laborable a laborable. Solo admin.

El motor de generación semanal consulta este endpoint antes de generar: omite los días marcados. El scheduler de notificaciones también consulta la lista antes de disparar cualquier notificación automática.

### 4.7 `backend/app/main.py`

Registrar los 4 nuevos routers: `preferencias`, `turnos`, `admin_turnos`, y `dias_no_laborables`.

## 5. Cambios de frontend

### 5.1 `frontend/src/api/franjas.ts`

Agregar:
```typescript
create: (data: FranjaCreate) => client.post<FranjaHoraria>('/franjas', data)
update: (id: number, data: Partial<FranjaCreate>) => client.patch<FranjaHoraria>(`/franjas/${id}`, data)
delete: (id: number) => client.delete(`/franjas/${id}`)
```

### 5.2 `frontend/src/api/preferencias.ts` (nuevo)

```typescript
interface PreferenciaCreate { fecha: string; franja_horaria_id_deseada: number }
interface PreferenciaResponse { id: number; colaborador_id: number; fecha: string; franja_horaria_id_deseada: number; estado_concesion: string }

export const preferenciasApi = {
  create: (data: PreferenciaCreate) => client.post<PreferenciaResponse>('/preferencias', data),
  get: (fecha: string, colaboradorId: number) =>
    client.get<PreferenciaResponse | null>(`/preferencias?fecha=${fecha}&colaborador_id=${colaboradorId}`),
}
```

### 5.3 `frontend/src/api/turnos.ts` (nuevo)

```typescript
export const turnosApi = {
  list: (fecha: string) => client.get<TurnoListResponse>(`/turnos?fecha=${fecha}`),
}
```

Donde `TurnoListResponse` refleja el schema existente en `backend/app/schemas/turno.py`.

### 5.4 `frontend/src/components/AdminPanel.tsx` — reestructuración completa

**Estructura:**
```
AdminPanel
├── Tab: Colaboradores
│   ├── Tabla de colaboradores (tabla compacta)
│   │   └── Fila: Nombre | Sector | Rol | Estado | Orientador | Gest.Externa | [✏] [off]
│   └── Botón "+ Nuevo" → abre ColaboradorForm (inline abajo de la tabla)
├── Tab: Franjas
│   ├── Tabla de franjas
│   │   └── Fila: Orden | Inicio | Fin | [✏] [🗑]
│   └── Botón "+ Nueva" → abre FranjaForm (inline)
└── Tab: Incidencias
    └── (contenido actual sin cambios)
```

**Form mejorado de colaborador:**
- Layout 2 columnas (Nombre/Email en col 1; Sector/Rol en col 2)
- Checkboxes de habilitaciones con etiquetas claras
- Feedback inline en el form (no `alert()`)
- Botón de guardar con estado loading

**Form de franja:**
- Campos: Orden (número), Hora inicio (time input), Hora fin (time input)
- Validación: hora_fin > hora_inicio

**Edición inline:** click en ✏ convierte la fila en inputs editables directamente en la tabla; guardar con Enter o botón ✓; cancelar con Escape o ✗.

### 5.5 `frontend/src/components/CalendarView.tsx` — vista semanal

**Cambio de lógica:**
- En lugar de un solo date picker, navegar por semana (← semana anterior / semana actual / semana siguiente →)
- Llamar `turnosApi.list(fecha)` para cada día de la semana (5 llamadas paralelas con `Promise.all`)
- Mostrar una grilla: filas = franjas horarias, columnas = días (Lun-Vie)
- Cada celda muestra los colaboradores asignados, o "–" si no hay turno generado aún
- Si la API devuelve franjas vacías (sin `TurnoAlmuerzo`), mostrar la celda con fondo gris claro y texto "Sin turno"

**Estructura de la grilla:**
```
           | Lun 28 | Mar 29 | Mié 30 | Jue 31 | Vie 01 |
12:00–12:45| Ana G. | Luis M.| —      | María L| Ana G. |
12:30–13:15| ...    | ...    | Sin    | ...    | ...    |
...
```

**Botón "Generar semana" (solo admin):** aparece en el header del CalendarView cuando la semana seleccionada no tiene turnos generados. Al presionarlo llama a `POST /admin/turnos/generar-semana`, muestra el preview en un panel debajo del calendario y habilita el botón "Confirmar". Si hay conflictos de empate, se muestran como filas resaltadas en el preview para que el admin los resuelva antes de confirmar.

**Días no laborables:** el admin puede marcar un día de la semana como "no laborable" (feriado, cierre de sucursal) haciendo click en el encabezado del día en el calendario. Un día no laborable se muestra con fondo diferente, no permite cargar ni generar turnos, y el motor lo omite al generar la semana. Esto también bloquea cualquier notificación automática (incidencias, broadcasts) para ese día.

### 5.6 `frontend/src/components/Preferences.tsx` — fix API

**`useEffect` al montar:** llamar `preferenciasApi.get(fecha, user.id)` y precargar la franja seleccionada si ya existe preferencia para esa fecha.

**`handleSubmit`:** llamar `preferenciasApi.create({ fecha, franja_horaria_id_deseada: selectedFranja })`. Mostrar error inline si falla (ej: turnos ya generados para ese día).

**Nota sobre franjas vacías:** si la lista de franjas llega vacía (DB sin datos), mostrar mensaje "El administrador aún no cargó los horarios de almuerzo disponibles." en lugar del selector vacío.

## 6. Flujo operativo completo (estado objetivo)

```
Admin entra por primera vez
  → Tab Franjas → carga las 5 franjas fijas
  → Tab Colaboradores → revisa/edita la lista de 13 personas

Inicio de semana (ej: lunes a las 8:00)
  → Admin va al calendario → selecciona la semana
  → Presiona "Generar semana" → preview + posibles conflictos de empate
  → Admin resuelve conflictos → confirma → turnos persistidos para Lun-Vie

Antes del cierre de cada día (hasta que el admin genere los turnos)
  → Usuarios van a Preferencias → seleccionan franja para el día siguiente → guardan
  → El motor toma en cuenta las preferencias al generar

Durante la semana
  → Admin puede modificar un turno puntual (override día a día desde el calendario)
  → Si alguien rechaza → incidencia en Tab Incidencias → admin hace broadcast o resuelve presencial
```

## 7. Criterios de completitud

- [ ] Admin puede crear, editar y eliminar franjas horarias desde la UI
- [ ] Admin ve la lista completa de colaboradores con todos sus atributos
- [ ] El formulario de colaborador da feedback inline sin `alert()`
- [ ] El calendario muestra la semana completa con celdas vacías cuando no hay turnos
- [ ] Guardar preferencia llama la API y muestra confirmación/error inline
- [ ] La generación de turnos cubre la semana completa (Lun-Vie), omitiendo días no laborables
- [ ] El admin puede editar turnos individuales después de generados
- [ ] El admin puede marcar/desmarcar días no laborables desde el calendario
- [ ] Los días no laborables no generan notificaciones automáticas
- [ ] El calendario distingue visualmente los días no laborables
