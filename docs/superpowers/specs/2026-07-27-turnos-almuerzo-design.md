# Gestión de Turnos de Almuerzo y Tareas Externas — Diseño

**Fecha:** 2026-07-27
**Estado:** Aprobado para pasar a plan de implementación

## 1. Objetivo

Sistema para organizar los turnos de almuerzo y tareas externas de un equipo de 13
colaboradores en una sucursal bancaria (préstamos personales y tarjetas de crédito),
garantizando que la línea de atención al público nunca quede descubierta.

El sistema se construye primero como aplicación local (comportamiento y visual), con
un camino explícito documentado hacia despliegue en Google Cloud como PWA con login
de Gmail. Esta fase de diseño cubre solo la primera etapa (local); el despliegue en
GCP es trabajo futuro fuera de alcance de este spec.

## 2. Entidades y modelo de datos (PostgreSQL)

| Tabla | Campos clave | Notas |
|---|---|---|
| `colaborador` | nombre, email, sector (comercial/operativo), estado_atencion (activo/desafectado), habilitado_orientador, habilitado_gestion_externa, rol (admin/usuario), puntaje_prioridad (default 0) | |
| `franja_horaria` | hora_inicio, hora_fin, orden | Catálogo estático, 5 filas fijas (ver §3.1) |
| `turno_almuerzo` | fecha, franja_horaria_id, capacidad_maxima | Una fila por franja por día; capacidad calculada al generar |
| `asignacion_almuerzo` | turno_almuerzo_id, colaborador_id, estado (firme/pendiente_swap) | Puente turno↔colaborador; el estado de swap vive acá porque afecta a una persona puntual, no a toda la franja |
| `preferencia_diaria` | colaborador_id, fecha, franja_horaria_id deseada, estado_concesion (pendiente/otorgado/denegado), created_at | |
| `tarea_especial_tipo` | nombre (orientador/municipalidad/gandulfo), dia_semana aplicable, hora_inicio, hora_fin | Catálogo/configuración, no cambia por día |
| `tarea_especial_asignacion` | fecha, tarea_especial_tipo_id, colaborador_id | Instancia diaria; permite reasignar por ausencia sin tocar el catálogo |
| `ausencia` | colaborador_id, fecha, motivo (licencia/enfermedad) | |
| `swap_solicitud` | asignacion_origen_id, colaborador_solicitante_id, colaborador_receptor_id, asignacion_receptor_id, estado (pendiente/aceptado/rechazado/cancelado) | |
| `notificacion` | colaborador_id destinatario, tipo, mensaje, leida, referencia_id | Centro de notificaciones in-app, sin push |

### 2.1 Justificación de diseño

Separar `turno_almuerzo` (la franja-día) de `asignacion_almuerzo` (quién va) permite
calcular cobertura y capacidad a nivel de franja, mientras el estado de swap se
trackea a nivel de persona.

## 3. Reglas de negocio

### 3.1 Franjas horarias (fijas)

Franja horaria total: lunes a viernes, 12:00–14:45. Turnos de 45 min con
solapamiento de 15 min entre grupos (stride de 30 min). Esto da exactamente 5
franjas fijas, sembradas una vez como catálogo:

1. 12:00–12:45
2. 12:30–13:15
3. 13:00–13:45
4. 13:30–14:15
5. 14:00–14:45

### 3.2 Cobertura obligatoria

En cada franja debe quedar en la línea al menos 1 colaborador **Comercial-activo**
y 1 colaborador **Operativo-activo**. Los colaboradores con estado "Desafectado"
participan del cronograma de almuerzo pero **no cuentan** como cobertura activa.

### 3.3 Sistema de prioridad por equidad

- Si a un colaborador se le deniega el horario preferido por restricción de
  cobertura, su `puntaje_prioridad` aumenta en 1.
- Cuando dos colaboradores del mismo sector compiten por la misma franja y la
  cobertura solo permite que vaya uno, gana el de mayor `puntaje_prioridad`.
- **Empate exacto de puntaje:** el sistema no autoresuelve — marca el conflicto
  como pendiente para que el admin decida manualmente antes de confirmar el
  cronograma.
- Al otorgarse el horario deseado, el `puntaje_prioridad` se reinicia a 0.

### 3.4 Tareas especiales y excepciones

- **Orientador** (diario, 10:00–15:00): 1 persona habilitada por día. Su tarea
  cubre las 5 franjas de almuerzo por completo, por lo que queda **excluida del
  todo** del cronograma de almuerzos compartidos ese día (no recibe ninguna de
  las 5 franjas mediante el motor).
- **Municipalidad** (miércoles, 11:00–13:00): 1 perfil Comercial habilitado.
  Su turno de almuerzo debe caer **obligatoriamente en una franja que empiece a
  las 13:00 o después** (franjas 3, 4 o 5).
- **Hospital Gandulfo** (jueves, 10:00–13:00): 1 perfil Comercial habilitado.
  Misma restricción: turno de almuerzo en franja 3, 4 o 5.
- Estas dos personas sí participan del pool de almuerzo, solo con la ventana
  restringida indicada.

## 4. Algoritmo de asignación (motor)

Vive como módulo Python puro (`app/core/`), sin dependencias de FastAPI, para
poder testearse con casos directos sin levantar un servidor.

**Fase 0 — Contexto del día:**
- Colaboradores con `ausencia` ese día → fuera del pool de almuerzo por completo.
- El Orientador del día → fuera del pool por completo.
- La persona de Municipalidad/Gandulfo (según día) → en el pool, restringida a
  franjas 3, 4 o 5.
- El resto → pool normal, elegible para cualquiera de las 5 franjas.

**Fase 1 — Resolución de preferencias (por franja):**
1. Agrupar preferencias cargadas por franja deseada.
2. Para cada franja: simular si otorgar todas las preferencias de esa franja deja
   ≥1 Comercial-activo y ≥1 Operativo-activo en línea (considerando quién está en
   tarea especial/ausente en ese horario puntual).
3. Si sí → se otorgan todas, `puntaje_prioridad` se resetea a 0 en cada uno.
4. Si no → conflicto de cobertura:
   - Ordenar solicitantes del sector que sobra por `puntaje_prioridad` descendente.
   - Otorgar tantos como la cobertura permita, empezando por mayor puntaje.
   - Empate exacto en el puntaje decisivo → conflicto pendiente para el admin.
   - Denegados: `estado_concesion = denegado`, `puntaje_prioridad += 1`, vuelven
     al pool sin franja asignada.

**Fase 2 — Relleno de quienes quedaron sin franja** (sin preferencia, o denegados):
Se distribuyen en las franjas con cupo restante, respetando siempre la cobertura
mínima y balanceando la carga entre franjas.

**Fase 3 — Validación final:**
Recorre las 5 franjas y confirma que en cada una, entre quienes NO están en esa
franja (y están presentes en la sucursal en ese horario), hay ≥1 Comercial-activo
y ≥1 Operativo-activo. Si algún caso límite no cumple, el sistema **no persiste**
el cronograma y devuelve un error claro al admin en vez de guardar algo inválido.

## 5. Flujos de usuario

- **Carga de preferencias:** el usuario indica su franja deseada para el día
  siguiente antes de que el admin corra el motor.
- **Visualización:** calendario del día con las 5 franjas, quién sale en cada una,
  quién es orientador y quién tiene tarea externa (ver §7.1, layout elegido).
- **Mercado de swap:** un usuario solicita el turno de otro; el cambio solo
  impacta la base si el receptor acepta. El sistema rechaza el swap si deja a un
  sector sin cobertura.

## 6. Flujo de administración

- **Ausencias:** el admin marca a un usuario ausente → se libera su cupo de
  almuerzo automáticamente.
- **Alertas críticas:** si el ausente tenía una tarea especial asignada, el
  sistema emite una alerta exigiendo reasignación.
- **Override total:** el admin puede forzar, eliminar o editar turnos sin pasar
  por aprobación de los usuarios.
- **Generación de turnos:** manual — el admin dispara el motor con un botón
  (`POST /admin/generar-turnos?fecha=`), revisa una vista previa y resuelve a
  mano los conflictos de empate antes de confirmar.

## 7. Backend

**Stack:** Python + FastAPI + PostgreSQL (SQLAlchemy), corrido localmente con
Docker Compose. Se elige Postgres desde el día uno (no SQLite) porque Cloud SQL en
GCP es Postgres-compatible, evitando reescrituras de queries/migraciones al
desplegar, y porque el dominio es intrínsecamente relacional.

```
backend/
  app/
    core/           # motor de asignación puro, reglas de cobertura y prioridad
    models/         # SQLAlchemy: Colaborador, Turno, Asignacion, Preferencia,
                     # TareaEspecial, Ausencia, Swap, Notificacion
    api/            # routers FastAPI (uno por recurso)
    auth/           # capa de auth intercambiable (mock local -> Google OAuth)
    schemas/        # Pydantic (request/response)
  tests/
    test_engine.py  # cobertura, empates, tareas especiales, ausencias
```

**Endpoints principales:**

- `POST /auth/login` — login simulado (elige colaborador), solo en local
- `GET /colaboradores` · `PATCH /colaboradores/{id}` — listado/edición (admin)
- `POST /preferencias` — cargar preferencia diaria (usuario)
- `POST /admin/generar-turnos?fecha=` — dispara el motor (admin)
- `GET /turnos?fecha=` — ver cronograma del día (todos)
- `POST /swaps` · `POST /swaps/{id}/aceptar` · `POST /swaps/{id}/rechazar`
- `POST /ausencias` — marcar ausencia (admin), libera cupo + dispara alerta si
  correspondía tarea especial
- `PATCH /admin/turnos/{id}` · `DELETE /admin/turnos/{id}` — override admin
- `GET /notificaciones` · `PATCH /notificaciones/{id}/leida`
- `GET /tareas-especiales?fecha=` — quién cubre orientador/muni/gandulfo ese día

## 8. Frontend

**Stack:** React + Vite, PWA desde el inicio (manifest + service worker), aunque
en la etapa local no se instale.

**Pantallas (todos los usuarios):**
1. Login (selector simulado de colaborador)
2. **Calendario del día** — pantalla central, layout de **columnas por franja**
   (cada una de las 5 franjas es una columna con la lista de quién sale, badges de
   sector y estado de cobertura). Se adapta a mobile como tabs/acordeón por franja.
3. Cargar preferencia
4. Mercado de swap
5. Notificaciones (badge + lista, in-app únicamente)

**Panel Admin (además):**
6. Gestión de colaboradores
7. Generar turnos (con vista previa y resolución manual de conflictos de empate)
8. Gestión de ausencias
9. Tareas especiales (asignar orientador/muni/gandulfo por día)
10. Override de turnos

## 9. Autenticación

**Local:** interfaz `auth/` con `get_current_user(request) -> Colaborador`.
Implementación local: `POST /auth/login` recibe un `colaborador_id` de una lista
desplegable y arma una sesión (JWT simple o cookie firmada), sin contraseña ni
proveedor externo. El resto del backend depende de la interfaz, no de la
implementación concreta.

**Camino a GCP (futuro, no implementado en esta fase):** reemplazar la
implementación local por Google Identity Services (login con Gmail), verificando
el ID token contra los certificados de Google y mapeando el email a un
`colaborador` pre-cargado por el admin (sin auto-registro abierto).

## 10. Despliegue objetivo (futuro)

- Backend → Cloud Run
- Base de datos → Cloud SQL (PostgreSQL)
- Frontend → Firebase Hosting (sirve la PWA con HTTPS/manifest)

## 11. Testing

- Tests unitarios del motor (`test_engine.py`) cubriendo: cobertura mínima por
  sector, resolución de empates por prioridad, exclusión de Orientador,
  restricción horaria de Municipalidad/Gandulfo, liberación de cupo por
  ausencia, y el caso de validación final fallida (cronograma no persistido).
- Tests de integración de API para los flujos de swap (aprobación mutua,
  rechazo por pérdida de cobertura) y override de admin.

## 12. Decisiones y supuestos registrados durante el diseño

- Franjas: 5 fijas, calculadas a partir de duración 45 min + solapamiento 15 min.
- Equipo: distribución aproximadamente equilibrada (~6-7 Comercial / 6-7 Operativo).
- Generación de turnos: manual por el admin, no automática ni en tiempo real.
- Capacidad por franja: calculada dinámicamente, no es un número fijo configurado.
- Login en fase local: simulado, sin contraseña.
- Notificaciones: solo in-app, sin push ni email en esta fase.
- Desempate de prioridad en empate exacto: resuelto a mano por el admin, no
  automático.
- Layout del calendario del día: columnas por franja (opción A de los mockups
  evaluados).
