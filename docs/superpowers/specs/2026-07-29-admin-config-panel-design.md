# Panel de Configuración del Admin — Diseño

**Fecha:** 2026-07-29
**Estado:** Aprobado para pasar a plan de implementación
**Extiende:** `2026-07-28-notificaciones-cascada-design.md`

---

## 1. Objetivo y alcance

Convertir el panel de admin en un centro de configuración completo del equipo. Tres sub-objetivos:

1. **Config de notificaciones + Dashboard + Rol viewer (Fase 1)** — los tiempos hardcodeados en `APSchedulerService` se hacen configurables por el admin; nuevo layout móvil tipo dashboard; nuevo rol de solo lectura para gerentes.
2. **Tareas especiales dinámicas (Fase 2)** — reemplazar `habilitado_tarea_especial_1/2` (booleans fijos en `Colaborador`) por una relación muchos-a-muchos contra `TareaEspecialTipo`, gestionable desde el panel.
3. **Sectores dinámicos (Fase 3)** — reemplazar el constraint hardcodeado `CHECK (sector IN ('tipo_a','tipo_b'))` por una tabla `sector` configurable, con capacidad máxima, mínimo de cobertura y color por sector.

Cada fase es independiente, desplegable por separado y no bloquea a las otras.

---

## 2. Decisiones de diseño globales

| Decisión | Elección | Motivo |
|---|---|---|
| Layout admin | Dashboard con cards apiladas (móvil-first) | Incidencias críticas visibles al abrir; cards son tap targets naturales |
| Navegación sectores | Lista con tap-to-edit | Muestra estado de todos los sectores de un vistazo |
| Asignación tareas especiales | Checkboxes en el form de creación | Máximo 3 tipos → caben sin scroll; sin pasos extra |
| Rol viewer | Nuevo valor en `colaborador.rol` | Ortogonal al sector; sencillo de chequear en `dependencies.py` |

---

## 3. Fase 1 — Config de notificaciones + Dashboard + Rol viewer

### 3.1 DB: nueva tabla `configuracion_notificaciones`

Singleton (siempre existe exactamente un registro). Reemplaza los valores hardcodeados en `APSchedulerService`.

```sql
-- Migration: 006_add_configuracion_notificaciones.sql
CREATE TABLE configuracion_notificaciones (
    id SERIAL PRIMARY KEY,
    aviso_previo_minutos         INTEGER NOT NULL DEFAULT 5,
    tiempo_respuesta_colab_min   INTEGER NOT NULL DEFAULT 3,
    tiempo_aceptacion_admin_min  INTEGER NOT NULL DEFAULT 1,
    notificaciones_pausadas      BOOLEAN NOT NULL DEFAULT false,
    pausa_hasta                  TIMESTAMP WITH TIME ZONE,
    hora_inicio_envio            TIME    NOT NULL DEFAULT '08:00',
    hora_fin_envio               TIME    NOT NULL DEFAULT '18:00',
    intervalo_recordatorio_min   INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO configuracion_notificaciones DEFAULT VALUES;
```

Los valores por defecto replican el comportamiento actual (5, 3, 1 minutos).

### 3.2 DB: rol viewer en `colaborador`

```sql
-- En la misma migration 006
ALTER TABLE colaborador
  DROP CONSTRAINT IF EXISTS colaborador_rol_check;
ALTER TABLE colaborador
  ADD CONSTRAINT colaborador_rol_check
  CHECK (rol IN ('admin', 'usuario', 'viewer'));
```

### 3.3 Backend

**Nuevo modelo:** `app/models/configuracion_notificaciones.py`

```python
class ConfiguracionNotificaciones(BaseModel):
    __tablename__ = "configuracion_notificaciones"
    aviso_previo_minutos        = Column(Integer, nullable=False, default=5)
    tiempo_respuesta_colab_min  = Column(Integer, nullable=False, default=3)
    tiempo_aceptacion_admin_min = Column(Integer, nullable=False, default=1)
    notificaciones_pausadas     = Column(Boolean, nullable=False, default=False)
    pausa_hasta                 = Column(DateTime(timezone=True), nullable=True)
    hora_inicio_envio           = Column(Time, nullable=False, default=time(8, 0))
    hora_fin_envio              = Column(Time, nullable=False, default=time(18, 0))
    intervalo_recordatorio_min  = Column(Integer, nullable=False, default=30)
```

**Nuevos endpoints** en `app/api/configuracion.py`:

```
GET  /configuracion/notificaciones   → cualquier usuario autenticado
PUT  /configuracion/notificaciones   → solo admin
```

**Cambios en `APSchedulerService`** — cada método recibe la config como parámetro en lugar de usar valores literales:

```python
def schedule_notify_t5(self, turno_id, run_at, aviso_previo_min=5): ...
def schedule_timeout(self, notif_id, run_at, respuesta_min=3): ...
def schedule_admin_window_end(self, incidencia_id, run_at, admin_min=1): ...
```

Los callers (en `engine.py` y `cascade_engine.py`) cargan `ConfiguracionNotificaciones` de la DB antes de llamar al scheduler.

**Cambios en `notificador.py`** — antes de enviar push FCM:
1. Cargar `ConfiguracionNotificaciones`.
2. Si `notificaciones_pausadas=True` y (`pausa_hasta` es `None` o `pausa_hasta > now()`): omitir push, guardar solo in_app.
3. Si hora actual < `hora_inicio_envio` o > `hora_fin_envio`: omitir push, guardar solo in_app.
4. Las notificaciones in_app se crean siempre (el usuario las ve al abrir la app).

**Nuevo rol viewer en `dependencies.py`:**

```python
def get_viewer_user(current_user = Depends(get_current_user)):
    """Permite rol viewer, usuario y admin. Solo bloquea si no está autenticado."""
    return current_user

def require_non_viewer(current_user = Depends(get_current_user)):
    """Bloquea rol viewer. Usado en endpoints de escritura."""
    if current_user.rol == 'viewer':
        raise HTTPException(403, "Acceso de solo lectura")
    return current_user
```

Los endpoints de escritura existentes que usan `get_current_user` pasan a usar `require_non_viewer`.

### 3.4 Frontend

**Nuevo layout del `AdminPanel`:** reemplaza el tab-first por un dashboard con cards.

Secciones de navegación:
- **Inicio (Dashboard)** — incidencias activas + estado de hoy + grid de accesos rápidos
- **Colaboradores** — existente
- **Tareas Especiales** — nueva (implementada en Fase 2, acceso rápido ya visible)
- **Sectores** — nueva (implementada en Fase 3)
- **Calendario** — existente `CalendarView`
- **Notificaciones** — nueva (formulario de `ConfiguracionNotificaciones`)
- **Configuración** — existente (franjas, días no laborables, cobertura)

**Nueva ruta viewer:** si `user.rol === 'viewer'`, el router redirige a `<ViewerPanel>` que muestra solo `<CalendarView>` en modo read-only, sin botones de acción ni tabs de admin.

**Nuevo componente `NotificacionesConfig.tsx`:**
- Switch para pausar notificaciones + date-time picker opcional para `pausa_hasta` (`NULL` = pausa indefinida hasta que el admin la levante manualmente)
- Inputs numéricos para `aviso_previo_minutos`, `tiempo_respuesta_colab_min`, `tiempo_aceptacion_admin_min`, `intervalo_recordatorio_min`
- Time pickers para `hora_inicio_envio` / `hora_fin_envio`

**Nuevo `api/configuracionNotificaciones.ts`** con `GET` y `PUT`.

---

## 4. Fase 2 — Tareas especiales dinámicas

### 4.1 DB

```sql
-- Migration: 007_dynamic_special_tasks.sql

-- Tabla junction colaborador ↔ tarea_especial_tipo
CREATE TABLE colaborador_tarea_tipo (
    id              SERIAL PRIMARY KEY,
    colaborador_id  INTEGER NOT NULL REFERENCES colaborador(id) ON DELETE CASCADE,
    tarea_tipo_id   INTEGER NOT NULL REFERENCES tarea_especial_tipo(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(colaborador_id, tarea_tipo_id)
);
CREATE INDEX idx_colab_tarea ON colaborador_tarea_tipo(colaborador_id);

-- Migrar datos existentes (asume tipos con id=1 y id=2; si no existen, no inserta)
INSERT INTO colaborador_tarea_tipo (colaborador_id, tarea_tipo_id)
SELECT id, 1 FROM colaborador
WHERE habilitado_tarea_especial_1 = true
  AND EXISTS (SELECT 1 FROM tarea_especial_tipo WHERE id = 1);

INSERT INTO colaborador_tarea_tipo (colaborador_id, tarea_tipo_id)
SELECT id, 2 FROM colaborador
WHERE habilitado_tarea_especial_2 = true
  AND EXISTS (SELECT 1 FROM tarea_especial_tipo WHERE id = 2);

-- Eliminar columnas obsoletas
ALTER TABLE colaborador
  DROP COLUMN habilitado_tarea_especial_1,
  DROP COLUMN habilitado_tarea_especial_2;
```

### 4.2 Backend

**Modelo `Colaborador`:**
- Eliminar `habilitado_tarea_especial_1` y `habilitado_tarea_especial_2`.
- Agregar relación `tareas_habilitadas` via `ColaboradorTareaTipo`.

**Nuevo modelo `ColaboradorTareaTipo`** en `app/models/tarea_especial.py` (junto a los existentes).

**Schemas:**
- `ColaboradorCreate` / `ColaboradorUpdate`: reemplazar booleans por `tarea_tipo_ids: List[int] = []`.
- `ColaboradorResponse`: agregar `tareas_habilitadas: List[TareaEspecialTipoResponse]`.

**Nuevos endpoints en `app/api/tareas_especiales.py`:**

```
GET    /tareas-especiales/tipos            → autenticado
POST   /tareas-especiales/tipos            → admin
PUT    /tareas-especiales/tipos/{id}       → admin
DELETE /tareas-especiales/tipos/{id}       → admin (solo si sin asignaciones activas)
```

**`tipos.py` — `ColaboradorInfo`:**
- Reemplazar `habilitado_tarea_especial_1: bool` y `habilitado_tarea_especial_2: bool` por `tarea_tipos_ids: List[int] = []`.

**`engine.py` / `cascade_engine.py`:** actualizar carga de colaboradores para usar `tarea_tipos_ids` en lugar de los dos booleans.

### 4.3 Frontend

**Creación de colaborador (`AdminPanel`):**
- Cargar tipos desde `GET /tareas-especiales/tipos` al montar el form.
- Renderizar un checkbox por tipo (máx 3 esperados). Reemplaza los 2 checkboxes hardcodeados.

**Nueva sección "Tareas Especiales"** en el panel:
- Lista de `TareaEspecialTipo` con nombre, días aplicables y horario.
- Form de creación/edición: nombre, días de semana (multi-select L-V), hora inicio/fin.

**Nuevo `api/tareasEspeciales.ts`** para CRUD de tipos.

---

## 5. Fase 3 — Sectores dinámicos

### 5.1 DB

```sql
-- Migration: 008_dynamic_sectors.sql

CREATE TABLE sector (
    id               SERIAL PRIMARY KEY,
    nombre           VARCHAR(100) NOT NULL UNIQUE,
    capacidad_maxima INTEGER      NOT NULL DEFAULT 999,
    participa_almuerzo BOOLEAN    NOT NULL DEFAULT true,
    acceso_rol       VARCHAR(20)  NOT NULL DEFAULT 'gestion'
                       CHECK (acceso_rol IN ('gestion', 'viewer')),
    minimo_cobertura INTEGER      NOT NULL DEFAULT 1,
    color            VARCHAR(7)   NOT NULL DEFAULT '#89b4fa',
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertar sectores actuales conservando config de cobertura
INSERT INTO sector (nombre, capacidad_maxima, participa_almuerzo, acceso_rol, minimo_cobertura, color)
VALUES
  ('tipo_a', 999, true, 'gestion',
   COALESCE((SELECT minimo_tipo_a FROM configuracion_cobertura LIMIT 1), 1),
   '#89b4fa'),
  ('tipo_b', 999, true, 'gestion',
   COALESCE((SELECT minimo_tipo_b FROM configuracion_cobertura LIMIT 1), 1),
   '#a6e3a1');

-- Migrar colaborador.sector de string a FK
ALTER TABLE colaborador ADD COLUMN sector_id INTEGER REFERENCES sector(id);
UPDATE colaborador SET sector_id = (SELECT id FROM sector WHERE nombre = colaborador.sector);
ALTER TABLE colaborador ALTER COLUMN sector_id SET NOT NULL;
ALTER TABLE colaborador DROP COLUMN sector;

-- Deprecar configuracion_cobertura (los mínimos ahora viven en sector.minimo_cobertura)
-- Se mantiene la tabla pero deja de usarse en código.
```

### 5.2 Backend

**Nuevo modelo `Sector`** en `app/models/sector.py`:

```python
class Sector(BaseModel):
    __tablename__ = "sector"
    nombre            = Column(String(100), nullable=False, unique=True)
    capacidad_maxima  = Column(Integer, nullable=False, default=999)
    participa_almuerzo = Column(Boolean, nullable=False, default=True)
    acceso_rol        = Column(String(20), nullable=False, default='gestion')
    minimo_cobertura  = Column(Integer, nullable=False, default=1)
    color             = Column(String(7), nullable=False, default='#89b4fa')
    colaboradores     = relationship("Colaborador", back_populates="sector_obj")
```

**`Colaborador`:** `sector` (Column String) → `sector_id` (FK Integer) + relación `sector_obj`.

**Nuevo router `app/api/sectores.py`:**

```
GET    /sectores              → autenticado
POST   /sectores              → admin
GET    /sectores/{id}         → autenticado
PUT    /sectores/{id}         → admin
DELETE /sectores/{id}         → admin (solo si sin colaboradores asignados)
```

**`cobertura.py`:** en lugar de leer `ConfiguracionCobertura`, lee los sectores con `participa_almuerzo=True` y usa `sector.minimo_cobertura` como mínimo. El dict `minimos_cobertura` pasa a ser `{sector_id: minimo}`.

**`tipos.py` — `ColaboradorInfo`:**
```python
sector_id: int               # FK al sector
sector_nombre: str           # Para logs / display
participa_almuerzo: bool     # Copiado desde sector
```

**`engine.py` / `cascade_engine.py`:** agrupar por `sector_id` en lugar de la string `sector`.

**`auth.py`:** al login, el acceso efectivo se determina así:
- `rol='admin'` → siempre acceso completo, sin importar el sector.
- `rol='usuario'` y `sector.acceso_rol='viewer'` → acceso viewer.
- `rol='viewer'` → acceso viewer, sin importar el sector.
El token JWT incluye el `rol` efectivo. El frontend usa esto para redirigir a `ViewerPanel`.

**Capacidad máxima:** tanto `POST /colaboradores` (crear) como `PATCH /colaboradores/{id}` (cambio de sector) verifican que el sector destino no supere su `capacidad_maxima`. Retorna `409 Conflict` si ya está lleno.

### 5.3 Frontend

**Nueva sección "Sectores":**
- Lista de sectores con: nombre, cantidad actual/capacidad, participación almuerzo, acceso_rol, color.
- Form: nombre, capacidad_maxima, toggle participa_almuerzo, select acceso_rol (`gestion`/`viewer`), minimo_cobertura, color picker.

**Colaboradores — form de creación/edición:**
- Campo `sector`: pasa de `<select>` con opciones hardcodeadas `tipo_a`/`tipo_b` a dropdown cargado desde `GET /sectores`.

**Calendario:** cada colaborador/asignación se muestra con el color de su sector.

**Deprecar `ConfiguracionCobertura.tsx`:** la sección de configuración de cobertura se reemplaza por los mínimos definidos en cada sector. El componente se elimina del tab de configuración.

**Nuevo `api/sectores.ts`** con CRUD completo.

---

## 6. Consideraciones de testing

| Fase | Tests clave |
|---|---|
| 1 | `test_configuracion_notificaciones.py`: GET/PUT, pausa activa omite push, fuera de horario omite push, viewer no puede escribir |
| 1 | `test_viewer_role.py`: viewer solo accede a rutas de lectura |
| 2 | `test_tareas_especiales.py`: CRUD de tipos, asignación al crear colaborador, engine carga tarea_tipos_ids correctamente |
| 2 | Migration 007: verificar que los booleans se copian a la junction antes del DROP |
| 3 | `test_sectores.py`: CRUD, capacidad máxima (409 al superar), cobertura usa minimo_cobertura del sector |
| 3 | `test_cobertura_dinamica.py`: algoritmo agrupa por sector_id, no por string |
| 3 | Migration 008: verificar que colaboradores quedan con sector_id correcto |

---

## 7. Orden de implementación sugerido dentro de cada fase

### Fase 1
1. Migration 006
2. Modelo + schemas + endpoints de `configuracion_notificaciones`
3. `APSchedulerService` acepta timings como parámetro
4. Callers en `engine.py` / `cascade_engine.py` cargan config antes de llamar al scheduler
5. `notificador.py` chequea pausa y ventana horaria
6. `dependencies.py`: `require_non_viewer`
7. Frontend: Dashboard + `ViewerPanel` + `NotificacionesConfig`

### Fase 2
1. Migration 007 (con rollback plan: re-agregar columnas si falla)
2. Modelo `ColaboradorTareaTipo` + actualizar `Colaborador`
3. Schemas + endpoints de tipos
4. `tipos.py` + `engine.py` usan `tarea_tipos_ids`
5. Frontend: sección Tareas Especiales + checkboxes dinámicos en form

### Fase 3
1. Migration 008 (testear en staging con datos reales antes de prod)
2. Modelo `Sector` + actualizar `Colaborador`
3. Router sectores + validación de capacidad máxima
4. `cobertura.py` + `tipos.py` + `engine.py`
5. `auth.py` incluye `acceso_rol` del sector en el token
6. Frontend: sección Sectores + dropdown dinámico en colaboradores + colores en calendario
