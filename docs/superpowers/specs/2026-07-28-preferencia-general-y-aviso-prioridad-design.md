# Preferencia General de Franja y Aviso de Prioridad al Liberarse un Cupo — Diseño

**Fecha:** 2026-07-28
**Estado:** Aprobado para pasar a plan de implementación
**Relacionado:** `2026-07-28-vacaciones-design.md` (dispara este mecanismo al liberar
asignaciones), `2026-07-28-notificaciones-cascada-design.md` (el `CascadeEngine`
existente incorpora un nuevo criterio de orden)

## 1. Objetivo

Este spec nació como "agregar una pestaña de solo consulta en el panel admin
para ver quién cargó su preferencia de almuerzo y quién falta". Al conversarlo
quedó claro que el pedido real cambia el modelo de preferencias: en vez de
cargarse por día, cada colaborador tiene **una preferencia general y
editable** de franja horaria. Cuando se libera un cupo en la franja preferida
de alguien que ese día está asignado a otra franja distinta, se le avisa con
prioridad para que pueda cambiarse. La visibilidad en el panel admin sigue
existiendo, pero ahora es mucho más simple (ver §5).

Es uno de tres specs independientes derivados de un mismo pedido; los otros
dos ("Vacaciones" y "dotación mínima configurable") se documentan por
separado.

## 2. Contexto encontrado en el código existente

`PreferenciaDiaria` (`colaborador_id`, `fecha`, `franja_horaria_id_deseada`,
`estado_concesion`) es hoy por día. Se carga desde `Preferences.tsx`
(selector de fecha + franja), se lee vía `GET/POST /preferencias`, y
`AssignmentEngine._phase_0_build_context` (`engine.py` líneas 108-116) la
consulta por fecha para construir `context.preferencias` — un dict
`{colaborador_id: franja_idx}` que alimenta la Fase 1 del motor (resolución
de preferencias por franja, con lógica de cobertura y desempate por
prioridad ya implementada y sin relación con *cómo* se originó la
preferencia).

`CascadeEngine` (`cascade_engine.py`, del spec de notificaciones-cascada) ya
ordena candidatos de reemplazo por `reemplazos_semana ASC` (equidad) cuando
alguien rechaza o no responde un turno confirmado.

## 3. Alcance

**Cambia:**
- `PreferenciaDiaria` (modelo, tabla, schema, router `preferencias.py`) se
  elimina por completo.
- `Colaborador` gana `franja_preferida_id` (FK nullable a `FranjaHoraria`).
- `_phase_0_build_context` pasa a leer `franja_preferida_id` directamente de
  cada colaborador, en vez de consultar `PreferenciaDiaria` por fecha.
- `Preferences.tsx` se simplifica: sin fecha, un único selector de franja
  preferida.
- Nueva pestaña "Preferencias" en `AdminPanel.tsx` (visibilidad, solo
  consulta).
- Nuevo mecanismo `notificar_franja_liberada`, con tres disparadores
  (borrado manual de asignación, auto-liberación por vacaciones, cascada de
  rechazo/timeout) y un nuevo endpoint de aceptación.
- `CascadeEngine` incorpora `franja_preferida_id` como primer criterio de
  orden de candidatos, antes de `reemplazos_semana`.
- El auto-borrado de asignaciones al cargar vacaciones (spec de Vacaciones
  §4) pasa a invocar `notificar_franja_liberada` además de borrar la
  asignación.

**No cambia:**
- Fases 1, 2 y 3 de `AssignmentEngine` — operan sobre `context.preferencias`
  como dict, sin importar su origen; ningún cambio de lógica ahí.
- La infraestructura de push/Firestore del spec de cascada — el nuevo
  mecanismo de aviso de prioridad usa exclusivamente el modelo `Notificacion`
  in-app existente, sin tocar esa infraestructura.
- El resto del panel admin y del dashboard.

## 4. Modelo de datos y motor

- `Colaborador.franja_preferida_id`: FK nullable a `FranjaHoraria`. Sin
  historial — se sobrescribe al editar, igual que cualquier otro campo de
  perfil.
- `PATCH /colaboradores/me/preferencia` — body `{ franja_horaria_id: int }`.
  Cualquier colaborador autenticado edita la suya. Sin restricción de
  ventana de tiempo (a diferencia de la preferencia por día anterior, que
  solo se podía cambiar hasta la generación de turnos): al ser general,
  aplica a partir de la próxima vez que el motor corra para cualquier
  fecha futura.
- `_phase_0_build_context`: reemplaza la consulta a `PreferenciaDiaria` por
  iterar `context.pool_disponible` y leer `colab.franja_preferida_id` de
  cada uno (si no es `None`). El resto del método no cambia.

## 5. Panel admin — visibilidad (pestaña "Preferencias")

Ya no es una grilla semanal (no tiene sentido con preferencia general): una
tabla simple con los colaboradores activos (`estado_atencion='activo'`), su
franja preferida actual (hora de inicio–fin) o "Sin configurar", y un
contador arriba ("X de Y sin configurar"). Solo lectura, sin acciones desde
esta vista — igual que se había acordado para la versión anterior del spec.

## 6. Aviso de prioridad al liberarse un cupo

### 6.1 Disparadores

Función compartida `notificar_franja_liberada(db: Session, fecha: date,
franja_horaria_id: int)`, invocada desde:

1. **Borrado manual de asignación** — `AdminPanel.tsx` tab Asignación:
   desasignar un chip (`handleChipClick` estado `assigned`) o borrar el
   turno completo (`handleConfirmDeleteTurno`). Se llama después de
   confirmar el borrado en base.
2. **Vacación cargada** — el auto-borrado de `AsignacionAlmuerzo` descrito en
   el spec de Vacaciones §4 pasa a invocar esta misma función para cada
   `(fecha, franja_horaria_id)` liberado, además de borrar la asignación.
3. **Rechazo/timeout de turno confirmado** — no dispara esta función
   directamente; en cambio, `CascadeEngine` (§6.3) incorpora el criterio de
   preferencia general en su propio orden de candidatos existente.

### 6.2 Elegibilidad y notificación (disparadores 1 y 2)

Para la franja y fecha liberadas:
- Candidatos: colaboradores con `franja_preferida_id == franja_horaria_id`,
  que tengan una `AsignacionAlmuerzo` en **otra** franja ese mismo día
  (si su franja preferida coincide con la que ya tienen, no son
  candidatos), que no estén ausentes ese día, y para quienes salir de su
  franja actual no rompa la cobertura mínima de esa franja (reutiliza
  `CoberturaValidator.can_remove_person_safely`, ya existente en
  `cobertura.py`).
- Si hay candidatos elegibles: se crea una `Notificacion` in-app (canal
  `in_app`, tipo nuevo `franja_preferida_disponible`) para cada uno, todas
  al mismo tiempo (broadcast, no secuencial).
- Si no hay candidatos elegibles, no pasa nada — el cupo queda simplemente
  disponible para asignación manual normal.

### 6.3 Aceptación — FCFS con guard atómico en Postgres

`POST /notificaciones/{id}/aceptar-cambio-franja`:
- Dentro de una transacción, verifica que la notificación siga `pendiente` y
  que el cupo en la franja destino siga disponible (`capacidad_maxima` no
  alcanzada) — si cualquiera de las dos condiciones falló mientras tanto
  (otro candidato ya aceptó), responde 409 y marca la notificación propia
  como `expirada`.
- Si ambas condiciones se cumplen: borra la `AsignacionAlmuerzo` actual del
  colaborador, crea una nueva en la franja preferida, marca su notificación
  como `aceptada`, y marca como `expirada` las notificaciones del mismo
  evento (mismo `fecha` + `franja_horaria_id` liberados) para los demás
  candidatos.
- No hay efecto cadena: la franja que el colaborador deja libre al
  cambiarse no dispara una nueva ronda de `notificar_franja_liberada`. Queda
  como cupo abierto normal, visible en la pestaña Asignación del admin.

### 6.4 Cascada existente — nuevo criterio de orden

`CascadeEngine`, al construir la lista de candidatos de reemplazo tras un
rechazo o timeout, ordena primero por `franja_preferida_id == franja
vacante` (quienes la tienen configurada van primero) y, dentro de ese grupo
y del resto, por `reemplazos_semana ASC` como hasta ahora. No cambia nada
más de la máquina de estados de incidencias (ventana admin, broadcast FCFS,
push) descripta en el spec de notificaciones-cascada.

## 7. Frontend

- `Preferences.tsx`: se elimina el selector de fecha y la lógica de "cargar
  para mañana por defecto". Queda un único grupo de radios (franjas
  disponibles) reflejando `franja_preferida_id` actual, con botón "Guardar
  preferencia". Mismo patrón de mensajes de éxito/error que hoy.
- `AdminPanel.tsx`: nueva pestaña "Preferencias" (tabla de §5).
- `NotificationCenter.tsx`: nuevo tipo de notificación
  `franja_preferida_disponible`, con texto ("Se liberó tu franja preferida
  hoy — ¿querés cambiarte?") y botón "Aceptar cambio" que llama al nuevo
  endpoint. Mismo estilo visual que las notificaciones existentes.

## 8. Casos límite

- Colaborador sin `franja_preferida_id` configurado: nunca participa de la
  Fase 1 del motor ni es candidato de aviso.
- Colaborador ya asignado exactamente a su franja preferida: no es
  candidato al liberarse esa misma franja (no hay "cambio" que ofrecer).
- Dos candidatos aceptan casi simultáneamente: el guard atómico en la
  transacción de Postgres asegura que solo uno persiste el cambio.
- Franja liberada que ya no tiene capacidad disponible al momento de
  aceptar (otro la ocupó mientras tanto por otra vía, ej. asignación manual
  del admin): mismo 409 + notificación expirada.
- Colaborador que cambia su `franja_preferida_id` mientras tiene
  notificaciones pendientes de una franja preferida anterior: esas
  notificaciones siguen válidas hasta que se acepten o expiren por FCFS;
  cambiar la preferencia no las cancela retroactivamente (son eventos ya
  disparados, no una suscripción viva).

## 9. Testing

- Backend (`test_core_engine.py`, actualizado): Fase 0 construye
  `context.preferencias` desde `franja_preferida_id` en vez de
  `PreferenciaDiaria`.
- Backend (`test_notificar_franja_liberada.py`, nuevo): elegibilidad
  (coincidencia de preferencia, exclusión por ausencia, exclusión por
  ruptura de cobertura mínima al salir de la franja actual), broadcast a
  múltiples candidatos, FCFS con guard atómico (dos aceptaciones
  concurrentes, solo una persiste), sin efecto cadena.
- Backend (`test_cascade_engine.py`, actualizado): nuevo caso de orden de
  candidatos con preferencia general coincidente antes que equidad.
- Frontend: verificación manual — cambiar preferencia general y confirmar
  que se refleja en la próxima generación semanal; provocar liberación de
  cupo (borrar asignación desde el admin) y verificar que llega la
  notificación in-app y que aceptar hace el swap correctamente.
