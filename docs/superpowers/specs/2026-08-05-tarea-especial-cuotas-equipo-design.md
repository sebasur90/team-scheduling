# Tarea especial con cuotas por equipo

**Fecha:** 2026-08-05  
**Estado:** Aprobado  

## Contexto

El sistema ya soporta tareas especiales con rotación multi-sector (modo `configuracion_rotacion`). El nuevo requerimiento es que una tarea pueda definir reglas de aporte **por equipo con frecuencias distintas**: algunos equipos aportan diariamente, otros solo N veces por semana (con día fijo o rotativo). Todo debe ser configurable desde un formulario admin mobile-first.

Ejemplo concreto que motiva el diseño:
- Comercial: 1 persona cada día de ejecución
- Operativo: 1 persona cada día de ejecución
- Gerencia: 1 persona, 1 vez por semana, día rotativo

---

## Modelo de datos

### Nueva tabla: `tarea_equipo_cuota`

| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | int PK | auto |
| `tarea_tipo_id` | int FK → `tarea_especial_tipo.id` | CASCADE DELETE |
| `sector_id` | int FK → `sector.id` | CASCADE DELETE |
| `personas_por_turno` | int | NOT NULL, ≥ 1 |
| `frecuencia` | varchar | NOT NULL, `"diaria"` \| `"semanal"` |
| `veces_por_semana` | int | nullable, requerido cuando `frecuencia="semanal"` |
| `dia_tipo` | varchar | nullable, `"fijo"` \| `"rotativo"`, requerido cuando `frecuencia="semanal"` |
| `dia_fijo` | int | nullable, 0–6 (lun–dom), requerido cuando `dia_tipo="fijo"` |
| `created_at` | datetime | auto |
| `updated_at` | datetime | auto |

### Columnas nuevas en `tarea_especial_tipo`

| Columna | Tipo | Default |
|---|---|---|
| `minimo_personas_dia` | int | 1 |
| `politica_minimo` | varchar | `"alertar"` |

`politica_minimo` acepta `"alertar"` (genera con advertencia) o `"bloquear"` (no genera asignaciones ese día si no se alcanza el mínimo).

### Compatibilidad con datos existentes

El campo `configuracion_rotacion` se mantiene sin cambios. El motor de rotación detecta el modo por la presencia de cuotas en `tarea_equipo_cuota`: si existen cuotas → usa `_generar_con_cuotas`; si no → usa las rutas existentes (`_generar_simple` o `_generar_multi_sector`).

---

## Backend

### Migración Alembic

Una migración que:
1. Agrega columna `minimo_personas_dia` (int, default 1) a `tarea_especial_tipo`
2. Crea tabla `tarea_equipo_cuota` con todas sus columnas e índice en `tarea_tipo_id`

### Modelo SQLAlchemy (`app/models/tarea_especial.py`)

Nuevo modelo `TareaEquipoCuota`:
- Relación `many-to-one` con `TareaEspecialTipo` (back_populates `cuotas_equipo`)
- Relación `many-to-one` con `Sector`

`TareaEspecialTipo` agrega:
- Columna `minimo_personas_dia`
- Relación `cuotas_equipo` con `cascade="all, delete-orphan"`

### Schemas Pydantic (`app/schemas/tarea_especial.py`)

```python
class TareaEquipoCuotaCreate(BaseModel):
    sector_id: int
    personas_por_turno: int          # >= 1
    frecuencia: Literal["diaria", "semanal"]
    veces_por_semana: Optional[int]  # requerido si frecuencia="semanal"
    dia_tipo: Optional[Literal["fijo", "rotativo"]]  # requerido si frecuencia="semanal"
    dia_fijo: Optional[int]          # 0-6, requerido si dia_tipo="fijo"

class TareaEquipoCuotaResponse(TareaEquipoCuotaCreate):
    id: int
    sector_nombre: str
```

`TareaEspecialTipoCreate` y `TareaEspecialTipoUpdate` agregan:
- `minimo_personas_dia: int = 1`
- `cuotas: Optional[list[TareaEquipoCuotaCreate]] = None`

`TareaEspecialTipoResponse` agrega:
- `minimo_personas_dia: int`
- `cuotas_equipo: list[TareaEquipoCuotaResponse]`

### API (`app/api/tareas_especiales.py`)

`POST /tareas-especiales/tipos`:
- Crea `TareaEspecialTipo` con `minimo_personas_dia`
- Si `cuotas` presente, crea registros `TareaEquipoCuota` en la misma transacción

`PUT /tareas-especiales/tipos/{id}`:
- Si `cuotas` presente: borra cuotas existentes y recrea (replace-all strategy)
- Evita merges parciales complejos

### Motor de rotación (`app/core/task_rotation_engine.py`)

Nuevo método `_generar_con_cuotas(db, tipo, fecha_inicio, fecha_fin)`:

```
Para cada día en el rango:
  Si weekday no está en dia_semana_aplicable → skip
  Si quincenal y no es semana activa → skip

  Para cada cuota en tipo.cuotas_equipo:
    Si cuota.frecuencia == "diaria":
      → asignar personas_por_turno colaboradores del sector (round-robin)

    Si cuota.frecuencia == "semanal":
      Calcular si hoy es el día que le toca a este sector esta semana:
        dia_tipo == "fijo":
          → solo ejecutar si weekday == cuota.dia_fijo
        dia_tipo == "rotativo":
          → detectar qué día usó este sector la semana ISO anterior
          → el día designado esta semana = siguiente día disponible en dia_semana_aplicable
          → solo ejecutar si hoy == ese día designado
      Si corresponde → asignar personas_por_turno colaboradores (round-robin)

  Si total asignados del día < minimo_personas_dia:
    Si politica == "alertar" → agregar advertencia y continuar
    Si politica == "bloquear" → agregar advertencia, NO crear asignaciones del día
```

La política de conflicto se lee del campo `politica_minimo` de `TareaEspecialTipo` (`"alertar"` por default).

---

## Frontend

### Nuevos componentes

**`FormTareaEspecial.tsx`** — wizard de 4 pasos con estado centralizado:

```typescript
interface WizardState {
  // Paso 1
  nombre: string
  descripcion: string
  color: string
  vigencia: { indefinida: boolean; desde: string; hasta: string }

  // Paso 2
  dia_semana_aplicable: number[]
  hora_inicio: string
  hora_fin: string
  minimo_personas_dia: number
  frecuencia: "semanal" | "quincenal"
  fecha_inicio_ciclo: string | null

  // Paso 3
  cuotas: TareaEquipoCuotaForm[]

  // Paso 4
  inhabilita_almuerzo: boolean
  fija_almuerzo: boolean
  franja_almuerzo_id: number | null
  politica_minimo: "alertar" | "bloquear"
}

interface TareaEquipoCuotaForm {
  sector_id: number
  personas_por_turno: number
  frecuencia: "diaria" | "semanal"
  veces_por_semana: number
  dia_tipo: "fijo" | "rotativo"
  dia_fijo: number | null
}
```

**`CuotasEquipoStep.tsx`** — paso 3:
- Lista de tarjetas, una por cuota. Cada tarjeta muestra sector, personas/turno, frecuencia
- Si frecuencia="semanal": muestra toggle fijo/rotativo; si fijo: selector de día
- Botón "Agregar equipo" abre selector de sector no usado todavía
- Resumen de cobertura estimada al pie (calcula si la suma diaria cubre el mínimo)

### Tipos API (`src/api/tareasEspeciales.ts`)

```typescript
export interface TareaEquipoCuota {
  id: number
  sector_id: number
  sector_nombre: string
  personas_por_turno: number
  frecuencia: "diaria" | "semanal"
  veces_por_semana: number | null
  dia_tipo: "fijo" | "rotativo" | null
  dia_fijo: number | null
}

export interface TareaEquipoCuotaCreate {
  sector_id: number
  personas_por_turno: number
  frecuencia: "diaria" | "semanal"
  veces_por_semana?: number
  dia_tipo?: "fijo" | "rotativo"
  dia_fijo?: number
}
```

`TareaEspecialTipo` agrega `minimo_personas_dia: number` y `cuotas_equipo: TareaEquipoCuota[]`.  
`TareaEspecialTipoCreate` agrega `minimo_personas_dia?: number` y `cuotas?: TareaEquipoCuotaCreate[]`.

### Integración en `AdminPanel.tsx`

El formulario inline actual de tareas especiales se reemplaza por `<FormTareaEspecial>`. Al editar, se pre-popula el wizard con los datos existentes incluyendo `cuotas_equipo`.

---

## Impacto en el calendario

Sin cambios al motor de cronograma regular. Cuando `inhabilita_almuerzo=true`, la persona ya queda marcada como "desafectada" (comportamiento igual a vacaciones, sin modificaciones necesarias).

---

## Fuera de scope

- Notificaciones cuando no se alcanza el mínimo (futuro)
- Visualización de cobertura por tarea en el panel de cronograma (futuro)
- Permitir voluntarios de otros sectores cuando hay déficit (futuro)
