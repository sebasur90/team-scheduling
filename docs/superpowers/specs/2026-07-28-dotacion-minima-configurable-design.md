# Dotación Mínima Configurable por Sector — Diseño

**Fecha:** 2026-07-28
**Estado:** Aprobado para pasar a plan de implementación

## 1. Objetivo

El admin debe poder configurar la dotación mínima por sector requerida en
cada franja horaria, en vez del valor fijo actual (≥1 tipo_a y ≥1 tipo_b).
Además, un día con muchas ausencias que no llegue ni siquiera a ese mínimo no
debe impedir la generación de turnos — hoy eso rompe la generación del día
completo.

Es uno de tres specs independientes derivados de un mismo pedido; los otros
dos ("Vacaciones" y "Preferencia general de franja") se documentan por
separado.

## 2. Contexto encontrado en el código existente

`CoberturaValidator.satisfies_minimum_coverage` (`cobertura.py` líneas
39-46) tiene hardcodeado `tipo_a >= 1 and tipo_b >= 1`, igual para las 5
franjas del día. Se usa en tres puntos de `engine.py`: Fase 1 (resolución de
preferencias, para saber cuántos cupos hay disponibles por sector antes de
otorgar) y Fase 3 (validación final, que hoy hace `raise Exception` si
alguna franja no cumple el mínimo — esa excepción propaga hasta
`AssignmentEngine.run()`, que devuelve `success=False`, y el día completo no
se persiste).

También encontré que `barometro.py` (semáforo tri-color del panel admin,
del spec de notificaciones-cascada) usa la misma idea de mínimo por sector,
pero quedó **roto** por un rename anterior: referencia `Sector.COMERCIAL`,
`Sector.OPERATIVO` (hoy `Sector.TIPO_A`/`Sector.TIPO_B` en `enums.py`) y
`Colaborador.habilitado_orientador` (campo que ya no existe en el modelo
actual). Hoy tiraría `AttributeError` si se invoca. Se corrige como parte de
este spec, ya que toca el mismo umbral.

## 3. Alcance

**Cambia:**
- Nueva tabla `ConfiguracionCobertura` (fila única) con el mínimo por
  sector configurado.
- `CoberturaValidator` deja de usar `>=1` hardcodeado y recibe los mínimos
  configurados.
- Fase 3 de `AssignmentEngine`: en vez de fallar el día completo cuando no
  se alcanza el mínimo, genera igual con la mejor cobertura posible y
  reporta advertencia.
- `barometro.py`: se corrigen las referencias rotas y pasa a usar el mismo
  mínimo configurado en vez de `>=1` hardcodeado.
- Nuevos endpoints de configuración y sección nueva en `AdminPanel.tsx`.
- La respuesta de `generar-semana` gana `dias_con_advertencia`, separado de
  `dias_con_error`.

**No cambia:**
- La lógica de `getChipState`/override en `AdminPanel.tsx` (tab
  Asignación): es un heurístico distinto, ya existente, que evita dejar sin
  cobertura la franja puntual que se está editando manualmente — no lee
  `CoberturaValidator` ni este mínimo configurado, y no hace falta que lo
  haga para este pedido.
- Fase 1 y Fase 2 del motor en su lógica de asignación — solo cambia qué
  número usan para el chequeo de cobertura, no el algoritmo.
- El resto del panel admin, calendario y demás specs.

## 4. Modelo de datos

`ConfiguracionCobertura`: `id`, `minimo_tipo_a` (int, default 1),
`minimo_tipo_b` (int, default 1). Tabla de fila única — se siembra con
`(1, 1)` en la migración inicial, igual al comportamiento hardcodeado
actual, para que nada cambie hasta que el admin lo edite explícitamente.

## 5. Backend

### 5.1 `CoberturaValidator`
`__init__` pasa a recibir además `minimos: Dict[str, int]` (ej.
`{"tipo_a": 1, "tipo_b": 2}`). `satisfies_minimum_coverage` compara contra
`minimos[sector]` en vez de `>= 1` fijo. Los tres sitios de instanciación en
`engine.py` (Fase 1 y Fase 3) leen la fila de `ConfiguracionCobertura` una
sola vez en `_phase_0_build_context` y la propagan vía `ContextData`.

### 5.2 Fase 3 — generar igual con advertencia
`_phase_3_validate_and_build` deja de hacer `raise Exception` por franja
incumplida. En su lugar acumula un mensaje por cada franja que no alcanza
el mínimo (ej. `"Franja 2 (12:30-13:15): cobertura mínima no alcanzada
(tipo_b: 0/1)"`) en una lista `advertencias`, y sigue construyendo el
cronograma igual con lo que Fase 1/Fase 2 ya lograron asignar.
`AssignmentResult` gana el campo `advertencias: List[str]` (vacío si no
hubo problemas). `AssignmentEngine.run()` sigue devolviendo `success=True`
en este caso — ya no es una falla, es información.

La orquestación semanal (`generar-semana`, del spec de generación
equitativa) ya no descarta el día cuando hay advertencias: lo persiste
igual y agrega sus fechas a una lista nueva `dias_con_advertencia` en la
respuesta, separada de `dias_con_error` (que sigue existiendo para fallas
reales de datos, no relacionadas a cobertura).

### 5.3 `barometro.py` — arreglo y reconexión
- `Sector.COMERCIAL` → `Sector.TIPO_A`, `Sector.OPERATIVO` → `Sector.TIPO_B`.
- `Colaborador.habilitado_orientador` → se elimina esa condición del filtro
  (no tiene equivalente directo en el modelo actual; el concepto de
  "orientador" como tarea especial ya se resuelve en `engine.py` vía
  `TareaEspecialAsignacion`, no vía un flag en `Colaborador`).
- `comercial_ok = comercial_libre >= 1` / `operativo_ok = operativo_libre >=
  1` pasan a comparar contra `minimo_tipo_a`/`minimo_tipo_b` de
  `ConfiguracionCobertura`, leída una vez al iniciar `calculate_barometro`.

### 5.4 Endpoints nuevos
- `GET /configuracion/cobertura` — cualquier usuario autenticado (se
  necesita para mostrar el valor actual en cualquier pantalla que lo use).
- `PUT /configuracion/cobertura` — admin only, body
  `{ minimo_tipo_a: int, minimo_tipo_b: int }`. Valida `>= 0` en ambos.

## 6. Frontend

- Nueva sección en `AdminPanel.tsx` con dos inputs numéricos (mínimo
  tipo_a, mínimo tipo_b) y botón guardar, reflejando el valor actual desde
  `GET /configuracion/cobertura`. Ubicación exacta (pestaña nueva vs.
  agregado a una existente) se define en el plan de implementación.
- `handleGenerarTurnos`/`handleGenerarSemana` (`AdminPanel.tsx` y
  `CalendarView.tsx`) muestran también `dias_con_advertencia` en el alert
  de resultado, con estilo distinto (advertencia, no error) al de
  `dias_con_error` ya existente.

## 7. Casos límite

- Mínimo configurado en `0` para un sector: válido — equivale a "sin
  mínimo obligatorio" para ese sector, ninguna franja se marca crítica por
  ese sector.
- Mínimo tan alto que ninguna franja del día lo alcanza nunca: el sistema
  genera igual con la mejor cobertura posible; cada franja que no llega
  queda en `advertencias`. No hay bloqueo ni reintento.
- Configuración no existe todavía (antes de la migración/seed): no debería
  ocurrir en producción (se siembra en la migración), pero si la fila
  faltara, `CoberturaValidator` usa `1` como default de seguridad para
  ambos sectores (mismo valor que el comportamiento hardcodeado actual).

## 8. Testing

- Backend (`test_cobertura.py`, nuevo): `satisfies_minimum_coverage` con
  distintos valores de `minimos`, incluyendo `0` y valores altos
  inalcanzables.
- Backend (`test_core_engine.py`, actualizado): caso de mínimo no
  alcanzable → `AssignmentResult.success == True` con `advertencias` no
  vacío, en vez del `raise Exception` que se testeaba antes.
- Backend (`test_barometro.py`, nuevo o actualizado si ya existía):
  verifica que el archivo corre sin `AttributeError` y que el estado
  crítico usa el mínimo configurado en vez de `1` fijo.
- Frontend: verificación manual — cambiar el mínimo desde el panel admin,
  generar una semana con ausencias forzadas que rompan cobertura bajo el
  mínimo configurado, confirmar que la semana se genera igual y que la
  advertencia se ve en la respuesta.
