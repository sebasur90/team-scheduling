# Vacaciones (carga propia, gestión admin y visualización en calendario) — Diseño

**Fecha:** 2026-07-28
**Estado:** Aprobado para pasar a plan de implementación

## 1. Objetivo

Colaboradores y admins deben poder cargar sus propias vacaciones desde la app.
El admin debe poder ver y gestionar las vacaciones de todo el equipo (incluida
la carga en nombre de otro colaborador), y el calendario debe reflejar
visualmente quién está de vacaciones cada día.

Este es uno de tres specs independientes derivados de un mismo pedido; los
otros dos ("visibilidad de preferencias en Admin Panel" y "dotación mínima
configurable") se documentan por separado.

## 2. Contexto encontrado en el código existente

El modelo `Ausencia` (`colaborador_id`, `fecha`, `motivo`) ya existe y el
motor de generación de turnos (`AssignmentEngine` en `engine.py`) ya lo lee y
excluye automáticamente a cualquiera con una `Ausencia` ese día de la
asignación de turnos (`engine.py` líneas 60-62, 119, 165, 323). Sin embargo:

- No existe ningún endpoint (`app/api/`) que exponga `Ausencia`.
- No existe ninguna pantalla en el frontend que la use.
- `motivo` acepta hoy `'licencia'`, `'enfermedad'` u `'otro'` (`MotivosAusencia`
  en `constants.py`), sin `'vacaciones'`.
- `Ausencia` es de un día por fila; no hay concepto de rango de fechas.

Esto significa que la pieza de motor/exclusión de turnos ya está resuelta —
este spec es enteramente sobre exponer `Ausencia` (con el nuevo motivo
`vacaciones`) a través de API y UI.

## 3. Alcance

**Cambia:**
- `MotivosAusencia` gana el valor `VACACIONES = "vacaciones"`.
- Nuevo router `app/api/ausencias.py` con endpoints de creación por rango,
  listado y borrado por bloque.
- Nuevo componente `Vacaciones.tsx`, con dos vistas según el contexto desde
  el que se monte: personal (propia) y admin (equipo completo).
- Nueva pestaña "Vacaciones" en `Dashboard.tsx` (colaborador y admin) y nueva
  pestaña "Vacaciones" en `AdminPanel.tsx`.
- `CalendarView.tsx`: las celdas de turno pasan de texto plano a píldoras
  coloreadas por sector, y se agrega una fila fija de "De vacaciones" arriba
  de las franjas.

**No cambia:**
- `AssignmentEngine` — ya excluye por `Ausencia` sin importar el `motivo`, no
  requiere ningún cambio.
- Los motivos `'licencia'` y `'enfermedad'` no se exponen en esta UI; quedan
  para un eventual spec futuro de "ausencias" más general. Este spec cubre
  únicamente el flujo de vacaciones.
- El resto de las pestañas del panel admin y del dashboard.

## 4. Modelo de datos y reglas de negocio

Se reutiliza `Ausencia` tal cual está — sin migración de esquema, solo el
nuevo valor de enum `vacaciones`. Un rango de vacaciones se representa como
**una fila `Ausencia` por cada día hábil (lunes a viernes) del rango**,
todas con `motivo='vacaciones'`. Sábados y domingos dentro del rango se
ignoran y no generan fila.

No existe un "id de rango" en la base. La UI agrupa visualmente, para cada
colaborador, las filas con `motivo='vacaciones'` en bloques de fechas
hábiles contiguas (ej. filas del lunes 3 al viernes 7 más el lunes 10 al
miércoles 12 se muestran como dos bloques: 3–7 y 10–12, porque el fin de
semana rompe la contigüidad de días hábiles). Un bloque se borra borrando
todas las filas `Ausencia` que lo componen.

Reglas:
- **Sin aprobación**: se guarda al instante, igual que "Preferencias" hoy.
  No hay `estado_concesion` ni flujo de revisión.
- **Liberación automática**: si algún día del rango ya tiene una
  `AsignacionAlmuerzo` para ese colaborador, se borra esa asignación al crear
  la vacación. No se notifica ni se re-asigna a nadie más automáticamente —
  el turno queda con un lugar menos, visible para el admin en la pestaña
  "Asignación de Turnos" existente.
- **Sin edición**: solo crear y borrar bloques completos, igual que el
  patrón ya usado en `DiaNoLaborable`. Modificar un rango es borrar y
  volver a cargar.
- **Idempotencia por día**: si una fecha específica ya tiene una `Ausencia`
  con `motivo='vacaciones'` para ese colaborador, no se duplica la fila.
- **Permisos**: un colaborador solo puede crear/borrar vacaciones propias
  (`colaborador_id` debe ser el suyo). Un admin puede crear/borrar vacaciones
  de cualquier colaborador. Mismo endpoint para ambos casos — la validación
  de permiso ocurre adentro, no hay endpoints separados.

## 5. API

Nuevo router, montado en `/ausencias`:

- `POST /ausencias`
  Body: `{ colaborador_id: int, fecha_inicio: date, fecha_fin: date }`
  - 400 si `fecha_fin < fecha_inicio`.
  - 400 si el rango no contiene ningún día hábil.
  - 403 si el usuario autenticado no es admin y `colaborador_id` no es el
    suyo.
  - Crea las filas `Ausencia` (saltando fines de semana y días ya
    cargados), borra las `AsignacionAlmuerzo` existentes de ese colaborador
    en esos días, y devuelve el bloque creado:
    `{ colaborador_id, fecha_inicio, fecha_fin, motivo: "vacaciones", dias: [...] }`.

- `GET /ausencias?colaborador_id=&mes=`
  - `colaborador_id` opcional (si se omite y el usuario es admin, devuelve
    todo el equipo; si se omite y el usuario no es admin, devuelve solo las
    propias).
  - `mes` opcional en formato `YYYY-MM`, mismo patrón que
    `GET /dias-no-laborables`, para acotar la vista de calendario/panel.
  - Devuelve las filas `Ausencia` crudas (no agrupadas); el agrupamiento en
    bloques ocurre en el frontend, igual que otras vistas ya derivan datos
    de listas planas.

- `DELETE /ausencias/bloque`
  Body: `{ colaborador_id: int, fecha_inicio: date, fecha_fin: date }`
  - 403 con la misma regla de permisos que el POST.
  - 404 si no hay ninguna fila `Ausencia` con `motivo='vacaciones'` para ese
    colaborador en ese rango.
  - Borra todas las filas `Ausencia` (`motivo='vacaciones'`) de ese
    colaborador cuya fecha caiga dentro del rango.

## 6. Frontend

### 6.1 `frontend/src/api/ausencias.ts`

Cliente nuevo siguiendo el patrón de `diasNolaborablesApi.ts`: `create`,
`list`, `deleteBloque`.

### 6.2 `Vacaciones.tsx` — vista personal

Se monta como pestaña nueva en `Dashboard.tsx` (junto a Calendario,
Preferencias, Notificaciones), visible para cualquier usuario autenticado
(colaborador o admin, ya que ambos cargan las suyas).

- Formulario: fecha desde / fecha hasta + botón "Cargar vacaciones".
- Debajo, lista de los propios bloques (pasados y futuros), con fecha
  desde–hasta y botón de borrar por bloque.
- Mismo estilo de mensajes de éxito/error que `Preferences.tsx`.

### 6.3 Gestión de equipo — vista admin

Nueva pestaña "Vacaciones" dentro de `AdminPanel.tsx`, junto a Colaboradores,
Franjas, etc. Es un bloque separado del componente personal de §6.2 (el
admin ya carga las suyas propias desde la pestaña "Vacaciones" del
Dashboard, igual que cualquier usuario) — esta pestaña de `AdminPanel` es
exclusivamente para gestionar al equipo:

- Selector de colaborador + mismo formulario de fecha desde/hasta, para
  cargar en nombre de otro (ej. avisó por teléfono).
- Tabla con todos los bloques de vacaciones de todo el equipo (colaborador,
  desde, hasta), ordenada por fecha, con acción de borrar por fila.

### 6.4 `CalendarView.tsx` — píldoras por sector y fila de vacaciones

- `turno-content` deja de renderizar texto plano (`getAsignados`) y pasa a
  renderizar una píldora por colaborador asignado en esa celda, coloreada
  según `colaborador.sector` (`tipo_a` / `tipo_b`), dos colores nuevos y
  consistentes con la paleta ya usada en `chip--*` de `AdminPanel.css`.
- Se agrega una fila fija con encabezado "De vacaciones" **antes** de las
  filas de franjas. Por cada columna de día, muestra las píldoras de quienes
  tienen `Ausencia` (`motivo='vacaciones'`) ese día — aplica tanto a
  colaboradores como a admins, sin filtrar por rol. Color distinto (neutro)
  al de las píldoras de sector, para diferenciarlas.
- `CalendarView` pasa a pedir también `ausenciasApi.list()` para el rango de
  la semana visible, en paralelo con la carga de turnos y franjas ya
  existente.
- Se actualiza `calendar-legend` para explicar los colores de sector y el de
  vacaciones.

## 7. Casos límite

- Rango que no contiene ningún día hábil (ej. solo sábado y domingo) → 400
  con mensaje claro.
- `fecha_fin < fecha_inicio` → 400.
- Vacación que se solapa parcialmente con un bloque ya cargado → no falla;
  los días ya existentes simplemente no se duplican (idempotencia por día).
- Colaborador intentando cargar/borrar vacaciones de otro `colaborador_id`
  → 403.
- Borrado de un bloque que no existe (fechas sin ninguna fila
  `motivo='vacaciones'`) → 404.

## 8. Testing

- Backend (`backend/tests/test_ausencias.py`, nuevo):
  - Creación de rango que incluye un fin de semana intermedio → verifica que
    no se crean filas de sábado/domingo.
  - Creación sobre un día con `AsignacionAlmuerzo` existente → verifica que
    la asignación se borra.
  - Idempotencia: crear un rango que se solapa con uno ya cargado no
    duplica filas.
  - Permisos: colaborador no puede crear/borrar a nombre de otro (403);
    admin sí puede.
  - Borrado de bloque: borra exactamente las filas del rango indicado, dejar
    intactas las de otros colaboradores o fuera de rango.
- Frontend: verificación manual en el navegador (dev server) del flujo
  completo — cargar vacación propia, verla como píldora en el calendario,
  cargarla desde el panel admin a nombre de otro colaborador, y borrar un
  bloque desde ambas vistas.
