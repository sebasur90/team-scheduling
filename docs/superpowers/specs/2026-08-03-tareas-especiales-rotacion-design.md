# Diseño: Módulo de Tareas Especiales con Rotación

**Fecha:** 2026-08-03
**Estado:** Aprobado por el usuario

---

## Contexto

El sistema ya cuenta con:
- `TareaEspecialTipo` / `TareaEspecialAsignacion` / `ColaboradorTareaTipo` como modelos base.
- `AssignmentEngine` con exclusión hardcodeada del orientador por nombre.
- `CascadeEngine` para liberar franjas de almuerzo ante rechazos o cambios.
- Servicio de notificaciones (`Notificacion` model + `notificador.py` + `_should_send_push`).

Este diseño extiende ese módulo para soportar rotación automática de responsables, frecuencia quincenal, inhibición del almuerzo y cronograma visible para admins y usuarios.

---

## 1. Modelo de datos

### 1.1 Cambios en `TareaEspecialTipo`

Una sola migración Alembic agrega tres columnas:

| Columna | Tipo SQL | Default | Notas |
|---|---|---|---|
| `frecuencia` | `VARCHAR(10)` con check `IN ('semanal','quincenal')` | `'semanal'` | Controla si la tarea corre cada semana o semana por medio |
| `inhabilita_almuerzo` | `BOOLEAN` | `False` | Si `True`, el responsable queda excluido del pool de almuerzos ese día |
| `fecha_inicio_ciclo` | `DATE`, nullable | `NULL` | Punto de referencia para calcular semanas par/impar en tareas quincenales |

**Lógica quincenal:**
```
activa = (iso_week(fecha) - iso_week(fecha_inicio_ciclo)) % 2 == 0
```
Si `fecha_inicio_ciclo` es `NULL` y la frecuencia es quincenal, el engine usa el primer lunes del año ISO como fallback.

### 1.2 Sin tablas nuevas

`TareaEspecialAsignacion(fecha, tarea_especial_tipo_id, colaborador_id)` continúa siendo la única fuente de verdad. El historial de rotación queda implícito en las filas existentes.

---

## 2. TaskRotationEngine

**Ubicación:** `backend/app/core/task_rotation_engine.py`

**Responsabilidad:** dada una lista de `tarea_tipo_id` y un rango de fechas, generar los registros en `TareaEspecialAsignacion` correspondientes.

### 2.1 Algoritmo

```
Para cada fecha en [fecha_inicio, fecha_fin]:
  Para cada TareaEspecialTipo activo:
    1. Si fecha.weekday() no está en dia_semana_aplicable → saltar
    2. Si frecuencia == 'quincenal':
         calcular activa usando fecha_inicio_ciclo
         Si no activa → saltar
    3. Si ya existe TareaEspecialAsignacion(fecha, tipo_id) → saltar (no pisar)
    4. Obtener pool = [ColaboradorTareaTipo where tarea_tipo_id == tipo_id]
       Si pool vacío → agregar advertencia y saltar
    5. Buscar último TareaEspecialAsignacion del tipo (ORDER BY fecha DESC)
       - Si existe → el siguiente en la lista circular del pool
       - Si no existe → colaborador con menor ID del pool
    6. INSERT TareaEspecialAsignacion(fecha, tipo_id, colaborador_id)
```

**Comportamiento ante ausencias:** el engine ignora las ausencias al pre-generar. Si el día llega y el responsable está ausente, el admin gestiona manualmente (carga la ausencia y re-corre el `AssignmentEngine` o reasigna la tarea).

### 2.2 Respuesta del endpoint

```json
{
  "asignaciones_creadas": 18,
  "asignaciones_saltadas": 3,
  "advertencias": ["Tarea 'Municipalidad' no tiene colaboradores en el pool"]
}
```

---

## 3. Integración con AssignmentEngine

### 3.1 ContextData (`backend/app/core/tipos.py`)

Se agrega:
```python
usuarios_con_tarea_excluyente: Set[int] = field(default_factory=set)
```

### 3.2 `_phase_0_build_context` (`backend/app/core/engine.py`)

Se reemplaza la consulta hardcodeada por nombre `"orientador"` con una genérica:

```python
tareas_excluyentes = (
    db.query(TareaEspecialAsignacion)
    .join(TareaEspecialTipo)
    .filter(
        TareaEspecialAsignacion.fecha == self.fecha,
        TareaEspecialTipo.inhabilita_almuerzo == True,
    ).all()
)
usuarios_con_tarea_excluyente = {t.colaborador_id for t in tareas_excluyentes}
```

Estos colaboradores se excluyen del `pool_disponible` igual que los ausentes. El campo `orientador_id` en `ContextData` queda como legacy (no se elimina en este ciclo).

### 3.3 AssignmentResult (`backend/app/core/tipos.py`)

Se agrega:
```python
excluidos_por_tarea: List[int] = field(default_factory=list)
```

El frontend usa esta lista para mostrar *"No asignado por Tarea Especial"* en la vista del día.

---

## 4. API Endpoints

Todos en `backend/app/api/tareas_especiales.py` salvo `/mis-tareas`.

### Admin-only

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/tareas-especiales/generar-cronograma` | Invoca `TaskRotationEngine` para un rango de fechas |
| `GET` | `/tareas-especiales/cronograma` | Lista asignaciones en `?fecha_inicio=&fecha_fin=` con nombre de colaborador y tipo |
| `PUT` | `/tareas-especiales/asignaciones/{asignacion_id}` | Swap manual de responsable con cascada de almuerzo |
| `PUT` | `/tareas-especiales/tipos/{tipo_id}` | Extensión del endpoint existente para los nuevos campos |

### Usuario autenticado

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/tareas-especiales/mis-tareas` | Asignaciones del usuario actual en los próximos N días (default 30) |

### Lógica del swap manual (`PUT /asignaciones/{id}`)

1. Actualizar `colaborador_id` en `TareaEspecialAsignacion`.
2. Si `inhabilita_almuerzo == True`:
   a. Buscar `AsignacionAlmuerzo` del día para el colaborador anterior → liberarla (notificar franja liberada si aplica via `notificar_franja_liberada`).
   b. Buscar `AsignacionAlmuerzo` del día para el nuevo colaborador. Si existe → eliminarla y disparar `CascadeEngine` para mantener cobertura mínima. Si no existe → no hacer nada (el nuevo colaborador simplemente no tendrá turno de almuerzo).
3. Crear `Notificacion` para el nuevo responsable: *"Ahora eres responsable de [Tarea X] el [fecha]"*.
4. Crear `Notificacion` para el responsable anterior: *"Ya no tienes asignada [Tarea X] el [fecha]"*.

---

## 5. Frontend

### 5.1 `CronogramaTareasPanel.tsx` (admin)

- Vive dentro del `AdminPanel` como tab nuevo.
- Vista de lista por semana: filas = fechas, columnas = tipos de tarea, celda = colaborador asignado.
- Botón **"Generar cronograma"**: abre picker de rango de fechas → llama a `POST /generar-cronograma` → muestra resumen de creados/saltados/advertencias.
- Cada celda tiene icono de edición → dropdown con colaboradores del pool → llama a `PUT /asignaciones/{id}` → actualiza la vista sin recargar toda la página.

### 5.2 `MisTareasSection.tsx` (usuario)

- Sección compacta en la pantalla principal, solo visible si el usuario tiene tareas próximas.
- Muestra: nombre de tarea, fecha, horario.
- Si `inhabilita_almuerzo == True`: badge visible *"Sin turno de almuerzo ese día"*.
- Datos de `GET /tareas-especiales/mis-tareas`.

### 5.3 Vista de almuerzos existente

- Los colaboradores en `excluidos_por_tarea` del `AssignmentResult` aparecen con etiqueta **"Tarea Especial"** (diferenciada de "Ausente").

---

## 6. Notificaciones

Usan el model `Notificacion` existente y `_should_send_push()` para elegir canal (`fcm` o `in_app`).

| Evento | Receptor | Mensaje |
|---|---|---|
| Generación de cronograma (solo si `inhabilita_almuerzo=True`) | Colaborador asignado | *"Tienes asignada [Tarea X] el [fecha]. No tendrás turno de almuerzo ese día."* |
| Swap manual — nuevo responsable | Nuevo colaborador | *"Ahora eres responsable de [Tarea X] el [fecha]."* |
| Swap manual — responsable anterior | Colaborador anterior | *"Ya no tienes asignada [Tarea X] el [fecha]."* |

Las notificaciones de generación solo se envían si la fecha asignada está dentro de los próximos 7 días, para evitar spam al generar cronogramas mensuales.

---

## 7. Decisiones de diseño

- **Sin tablas nuevas:** `TareaEspecialAsignacion` es la fuente de verdad. El historial de rotación es implícito.
- **El engine no pisa asignaciones existentes:** genera solo los huecos. Para regenerar desde cero, el admin borra el rango primero.
- **Ausencias ignoradas en pre-generación:** el admin reasigna manualmente si detecta conflicto el día de ejecución.
- **`orientador_id` en `ContextData` queda como legacy:** se depreca pero no se elimina en este ciclo para no romper el código existente.
- **Swap dispara cascada (opción B):** actualiza tarea + libera/elimina turnos de almuerzo afectados, sin re-correr el engine completo automáticamente.
