# Rotación Multi-Sector para Tareas Especiales

**Fecha:** 2026-08-03  
**Estado:** APPROVED  
**Autor:** Brainstorming Session  

---

## Resumen Ejecutivo

Extender el sistema de tareas especiales para soportar **rotación multi-sector con cuotas configurables**. Permite crear tareas como "Orientador" que roten automáticamente entre colaboradores de diferentes sectores (comerciales, operativos, gerenciales) con distribución configurable (ej: 2 comerciales, 2 operativos, 1 gerencia por semana).

**Cambios:**
- Agregar campo `configuracion_rotacion` (JSON) a `TareaEspecialTipo`
- Extender `TaskRotationEngine` para interpretar configuración multi-sector
- Nuevo componente UI `ConfiguracionRotacionMultiSector` en formulario de admin
- Sin nuevos endpoints (reutiliza existentes)

---

## Requerimientos Funcionales

### RF1: Crear Tarea Especial Multi-Sector

**Actor:** Admin  
**Flujo:**
1. Admin accede a Admin Panel → Tareas Especiales → Nueva Tarea
2. Completa datos básicos (nombre, días, horario, etc.)
3. Marca checkbox "Rotación multi-sector"
4. Elige modo: **Patrón fijo** o **Personalizado**
5. Configura distribución de sectores

**Modo 1: Patrón Fijo**
- Admin define secuencia de N días (según `dia_semana_aplicable`)
- Cada posición es un sector identificado por su nombre: "comerciales", "operativos", "gerencia"
- Ejemplo para 5 días: `["comerciales", "operativos", "comerciales", "operativos", "gerencia"]`
- Admin especifica cuotas totales: Comerciales: 2, Operativos: 2, Gerencia: 1
- El sistema valida que la suma de cuotas coincida con la cantidad de días aplicables

**Modo 2: Personalizado**
- Grid N días × sectores activos
- Para cada día, admin ingresa cantidad de colaboradores por sector
- Ejemplo: Lunes [comerciales:1, operativos:0, gerencia:0], Martes [comerciales:0, operativos:1, gerencia:0], etc.
- Admin especifica cuotas totales igual

**Validaciones:**
- Patrón fijo: largo del array debe coincidir con `len(dia_semana_aplicable)`; solo sectores válidos (existentes en la BD)
- Personalizado: cada día tiene asignación válida
- Suma total de `distribuciones_sector` coincide con `len(dia_semana_aplicable)`  
  ⚠️ Esta validación ocurre en `TareaEspecialTipoCreate` (model validator), no en el schema interno, porque depende del campo `dia_semana_aplicable`
- Si no es multi-sector (checkbox no marcado), `configuracion_rotacion = null`

**Salida:** POST /tareas-especiales/tipos retorna TareaEspecialTipoResponse con `configuracion_rotacion` poblado

### RF2: Editar Configuración Multi-Sector

**Actor:** Admin  
**Flujo:**
1. Admin edita tarea especial existente
2. Puede cambiar modo (patrón fijo ↔ personalizado)
3. Puede cambiar patrón o distribución por día
4. Puede cambiar cuotas de sectores
5. Puede desactivar multi-sector enviando `configuracion_rotacion: null` explícitamente

**Validaciones:** Igual a RF1

**Salida:** PUT /tareas-especiales/tipos/{tipo_id} actualiza `configuracion_rotacion`

### RF3: Generar Cronograma Multi-Sector

**Actor:** Admin  
**Flujo:**
1. Admin abre "Generar Cronograma"
2. Elige rango de fechas (ej: 01/09 - 30/11)
3. Elige tareas especiales (ej: marca "Orientador")
4. Click "Generar"

**Lógica:**
- Para cada tipo de tarea:
  - Si `tipo.configuracion_rotacion` es NULL → usa lógica simple round-robin (existente)
  - Si `tipo.configuracion_rotacion` no es NULL → usa lógica multi-sector (nueva)

**Multi-sector:**
1. Para cada fecha en el rango:
   - Obtener día de semana (0=Lunes, 4=Viernes)
   - Determinar qué sectores aplican hoy:
     - Si modo `patron_fijo`: leer `patron_semanal[weekday_index]` donde `weekday_index` es la posición del weekday dentro de los días aplicables ordenados
     - Si modo `personalizado`: leer `distribucion_por_dia[str(weekday)]`
   - Para cada sector + cantidad:
     - Obtener pool de colaboradores del sector (solo activos, habilitados para la tarea)
     - Encontrar siguiente en rotación round-robin
     - Crear `TareaEspecialAsignacion`

2. **Manejo de inactivos:**
   - Si colaborador tiene `estado_atencion = 'desafectado'` → excluir del pool
   - Si el pool quedaría vacío para un sector en un día → advertencia (no crea la asignación)
   - Si el pool tiene menos colaboradores de los que se necesitan → advertencia pero continúa

3. **Seguimiento de rotación:**
   - Mantener índice de rotación **por sector** dentro de la tarea
   - Consultar última asignación del sector para esa tarea en la BD
   - Para asignaciones múltiples en el mismo día (cantidad > 1): rastrear en memoria los ya asignados en el ciclo actual, haciendo flush antes de buscar la siguiente rotación

**Salida:** POST /tareas-especiales/generar-cronograma retorna:
```json
{
  "asignaciones_creadas": 60,
  "asignaciones_saltadas": 0,
  "advertencias": [
    "Tarea 'Orientador' sector 'comerciales': pool insuficiente (2 necesarios, 1 disponible) el 15/09"
  ]
}
```

### RF4: Ver Cronograma

**Actor:** Admin  
**Salida:** GET /tareas-especiales/cronograma retorna lista de asignaciones
- Igual a antes, pero ahora incluye tareas multi-sector
- Muestra: fecha, tarea, colaborador, sector del colaborador

---

## Requerimientos No Funcionales

**RNF1: Compatibilidad hacia atrás**
- Tareas existentes sin `configuracion_rotacion` siguen usando round-robin simple
- No afecta asignaciones existentes

**RNF2: Rendimiento**
- Generar cronograma de 3 meses con 5 tareas multi-sector: < 2 segundos
- No requiere índices nuevos (usa existentes)

**RNF3: Validación**
- Todas las validaciones en backend (no confiar en frontend)
- Errores 400 con `detail` claro

---

## Diseño Técnico

### Modelo (Backend)

**`TareaEspecialTipo` (existente + cambios)**

```python
class TareaEspecialTipo(BaseModel):
    # ... campos existentes ...
    configuracion_rotacion: Column(JSON, nullable=True)
    # Estructura JSON almacenada:
    # {
    #   "modo": "patron_fijo" | "personalizado",
    #   "patron_semanal": ["comerciales", "operativos", "comerciales", "operativos", "gerencia"] | null,
    #   "distribucion_por_dia": {
    #     "0": {"comerciales": 1, "operativos": 0, "gerencia": 0},
    #     "1": {"comerciales": 0, "operativos": 1, "gerencia": 0},
    #     ...
    #   } | null,
    #   "distribuciones_sector": {
    #     "comerciales": 2,
    #     "operativos": 2,
    #     "gerencia": 1
    #   }
    # }
```

**Migración SQL:**

```sql
ALTER TABLE tarea_especial_tipo
ADD COLUMN configuracion_rotacion TEXT DEFAULT NULL;
-- SQLite almacena JSON como TEXT; el ORM serializa/deserializa automáticamente
```

### Schema (Pydantic)

**Nuevo schema en `app/schemas/tarea_especial.py`:**

```python
from typing import Literal, Optional, Dict, List
from pydantic import BaseModel, field_validator, model_validator

class ConfiguracionRotacionMultiSector(BaseModel):
    modo: Literal["patron_fijo", "personalizado"]
    patron_semanal: Optional[List[str]] = None
    # Lista de nombres de sector, uno por día aplicable
    # Ejemplo 5 días: ["comerciales", "operativos", "comerciales", "operativos", "gerencia"]
    distribucion_por_dia: Optional[Dict[str, Dict[str, int]]] = None
    # Ejemplo: {"0": {"comerciales": 1, "operativos": 0, "gerencia": 0}}
    distribuciones_sector: Dict[str, int]
    # {"comerciales": 2, "operativos": 2, "gerencia": 1}

    @field_validator('patron_semanal')
    @classmethod
    def validar_patron_no_vacio(cls, v, info):
        # Largo se valida en TareaEspecialTipoCreate (depende de dia_semana_aplicable)
        if info.data.get('modo') == 'patron_fijo' and not v:
            raise ValueError("patron_semanal es requerido en modo patron_fijo")
        return v
```

**⚠️ La validación de suma de `distribuciones_sector` se hace en el model validator de `TareaEspecialTipoCreate`:**

```python
class TareaEspecialTipoCreate(TareaEspecialTipoBase):
    configuracion_rotacion: Optional[ConfiguracionRotacionMultiSector] = None

    @model_validator(mode='after')
    def validar_configuracion_rotacion(self):
        config = self.configuracion_rotacion
        if config is None:
            return self

        n_dias = len(self.dia_semana_aplicable)

        # Validar suma de cuotas == días aplicables
        total = sum(config.distribuciones_sector.values())
        if total != n_dias:
            raise ValueError(
                f"La suma de distribuciones_sector ({total}) debe coincidir "
                f"con la cantidad de días aplicables ({n_dias})"
            )

        # Validar largo de patron_semanal
        if config.modo == 'patron_fijo':
            if not config.patron_semanal or len(config.patron_semanal) != n_dias:
                raise ValueError(
                    f"patron_semanal debe tener {n_dias} elementos "
                    f"(uno por cada día en dia_semana_aplicable)"
                )

        return self


class TareaEspecialTipoUpdate(BaseModel):
    nombre: Optional[str] = None
    dia_semana_aplicable: Optional[List[int]] = None
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    frecuencia: Optional[str] = None
    inhabilita_almuerzo: Optional[bool] = None
    fecha_inicio_ciclo: Optional[date] = None
    fija_almuerzo: Optional[bool] = None
    franja_almuerzo_id: Optional[int] = None
    configuracion_rotacion: Optional[ConfiguracionRotacionMultiSector] = None
    # Enviar configuracion_rotacion=null para desactivar multi-sector


class TareaEspecialTipoResponse(TareaEspecialTipoBase):
    id: int
    configuracion_rotacion: Optional[ConfiguracionRotacionMultiSector] = None  # ← NUEVO
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

**Actualizar `update_tipo` en la API para soportar limpiar a null:**

```python
# En update_tipo(), usar model_fields_set para detectar campos enviados explícitamente
if 'configuracion_rotacion' in data.model_fields_set:
    tipo.configuracion_rotacion = (
        data.configuracion_rotacion.model_dump() if data.configuracion_rotacion else None
    )
```

### Motor de Rotación

**`app/core/task_rotation_engine.py` (refactor)**

**Imports adicionales necesarios:**
```python
from datetime import date, datetime, timedelta
from app.models import (
    TareaEspecialTipo, TareaEspecialAsignacion, ColaboradorTareaTipo,
    Colaborador, Sector  # ← NUEVOS
)
```

```python
class TaskRotationEngine:
    @staticmethod
    def generar(db, fecha_inicio, fecha_fin, tipo_ids=None):
        # ... lógica existente de carga de tipos ...
        
        for tipo in tipos:
            if tipo.configuracion_rotacion:
                # NUEVO: Multi-sector
                TaskRotationEngine._generar_multi_sector(db, tipo, fecha_inicio, fecha_fin)
            else:
                # Existente: Round-robin simple
                TaskRotationEngine._generar_simple(db, tipo, fecha_inicio, fecha_fin)
    
    @staticmethod
    def _generar_multi_sector(db, tipo, fecha_inicio, fecha_fin):
        """Genera asignaciones respetando configuración multi-sector"""
        config = tipo.configuracion_rotacion
        asignaciones_creadas = 0
        advertencias = []

        # Días aplicables ordenados para indexar patron_semanal
        dias_aplicables = sorted(tipo.dia_semana_aplicable)
        
        current = fecha_inicio
        while current <= fecha_fin:
            weekday = current.weekday()  # 0-4 = Mon-Fri
            
            if weekday not in dias_aplicables:
                current += timedelta(days=1)  # ← usar timedelta, no aritmética manual
                continue
            
            # Obtener distribución para hoy
            if config['modo'] == 'patron_fijo':
                # patron_semanal es una lista indexada por posición en dias_aplicables
                patron_idx = dias_aplicables.index(weekday)
                sector_nombre = config['patron_semanal'][patron_idx]
                sector_count = {sector_nombre: 1}
            else:  # personalizado
                sector_count = config['distribucion_por_dia'].get(str(weekday), {})
            
            # Procesar cada sector
            for sector_nombre, cantidad_necesaria in sector_count.items():
                if cantidad_necesaria == 0:
                    continue

                # Obtener pool del sector (solo activos, habilitados para la tarea)
                pool = db.query(ColaboradorTareaTipo).join(
                    Colaborador,
                    ColaboradorTareaTipo.colaborador_id == Colaborador.id
                ).join(
                    Sector,
                    Colaborador.sector_id == Sector.id
                ).filter(
                    ColaboradorTareaTipo.tarea_tipo_id == tipo.id,
                    Colaborador.estado_atencion == 'activo',
                    Sector.nombre == sector_nombre
                ).order_by(ColaboradorTareaTipo.colaborador_id).all()
                
                if not pool:
                    advertencias.append(
                        f"Tarea '{tipo.nombre}' sector '{sector_nombre}': "
                        f"sin colaboradores disponibles el {current}"
                    )
                    continue
                
                if len(pool) < cantidad_necesaria:
                    advertencias.append(
                        f"Tarea '{tipo.nombre}' sector '{sector_nombre}': "
                        f"pool insuficiente ({cantidad_necesaria} necesarios, "
                        f"{len(pool)} disponibles) el {current}"
                    )
                
                # Rotar y asignar: rastrear ya-asignados en este ciclo (mismo día/sector)
                # para evitar repetir cuando cantidad_necesaria > 1
                asignados_este_ciclo: list[int] = []
                
                for i in range(cantidad_necesaria):
                    # Buscar última asignación de este sector para esta tarea
                    last_asignacion = db.query(TareaEspecialAsignacion).join(
                        Colaborador,
                        TareaEspecialAsignacion.colaborador_id == Colaborador.id
                    ).join(
                        Sector,
                        Colaborador.sector_id == Sector.id
                    ).filter(
                        TareaEspecialAsignacion.tarea_especial_tipo_id == tipo.id,
                        Sector.nombre == sector_nombre
                    ).order_by(TareaEspecialAsignacion.fecha.desc()).first()
                    
                    if last_asignacion:
                        last_idx = next(
                            (j for j, c in enumerate(pool) 
                             if c.colaborador_id == last_asignacion.colaborador_id),
                            -1
                        )
                        # Avanzar hasta encontrar uno no asignado en este ciclo
                        for _ in range(len(pool)):
                            last_idx = (last_idx + 1) % len(pool)
                            if pool[last_idx].colaborador_id not in asignados_este_ciclo:
                                break
                        next_idx = last_idx
                    else:
                        # Primera vez: tomar el primero no asignado en este ciclo
                        next_idx = next(
                            (j for j, c in enumerate(pool)
                             if c.colaborador_id not in asignados_este_ciclo),
                            0
                        )
                    
                    colaborador_id = pool[next_idx].colaborador_id
                    
                    # Verificar que no exista ya la asignación en BD
                    existing = db.query(TareaEspecialAsignacion).filter(
                        TareaEspecialAsignacion.fecha == current,
                        TareaEspecialAsignacion.tarea_especial_tipo_id == tipo.id,
                        TareaEspecialAsignacion.colaborador_id == colaborador_id
                    ).first()
                    
                    if not existing:
                        asignacion = TareaEspecialAsignacion(
                            fecha=current,
                            tarea_especial_tipo_id=tipo.id,
                            colaborador_id=colaborador_id
                        )
                        db.add(asignacion)
                        db.flush()  # ← flush para que las siguientes queries vean esta asignación
                        asignaciones_creadas += 1
                    
                    asignados_este_ciclo.append(colaborador_id)
            
            current += timedelta(days=1)  # ← timedelta, sin bugs de fin de mes
        
        db.commit()
        return asignaciones_creadas, advertencias
```

> **Nota:** El `_next_day` helper manual que existe en el engine actual tiene un bug: salta del día 28 directamente al 1 del mes siguiente aunque el mes tenga 30 o 31 días. Se reemplaza por `current += timedelta(days=1)` en toda la función, incluyendo el engine simple.

### API (Cambios en lógica)

**`app/api/tareas_especiales.py` (cambios)**

- `create_tipo()`: serializa `configuracion_rotacion` a dict antes de persistir
- `update_tipo()`: usa `model_fields_set` para detectar `configuracion_rotacion` enviado explícitamente (incluso si es `null`)
- `generar_cronograma()`: llama a `TaskRotationEngine.generar()` que maneja ambos casos

```python
# create_tipo — serializar config a dict para Column(JSON)
tipo = TareaEspecialTipo(
    ...
    configuracion_rotacion=(
        data.configuracion_rotacion.model_dump() 
        if data.configuracion_rotacion else None
    ),
)

# update_tipo — detectar null explícito
if 'configuracion_rotacion' in data.model_fields_set:
    tipo.configuracion_rotacion = (
        data.configuracion_rotacion.model_dump() 
        if data.configuracion_rotacion else None
    )
```

---

### Frontend

**Nuevo componente: `ConfiguracionRotacionMultiSector.tsx`**

Ubicación: `frontend/src/components/ConfiguracionRotacionMultiSector.tsx`

**⚠️ Los sectores se cargan dinámicamente desde `GET /sectores`, no están hardcodeados.**

```typescript
interface ConfiguracionRotacionMultiSector {
  modo: 'patron_fijo' | 'personalizado'
  patron_semanal: string[] | null  // array de nombres de sector, uno por día aplicable
  distribucion_por_dia: Record<string, Record<string, number>> | null
  distribuciones_sector: Record<string, number>
}

interface Props {
  valor: ConfiguracionRotacionMultiSector | null
  diasAplicables: number[]  // viene del formulario padre (dia_semana_aplicable)
  onChange: (config: ConfiguracionRotacionMultiSector | null) => void
  disabled?: boolean
}

export const ConfiguracionRotacionMultiSector: React.FC<Props> = ({
  valor,
  diasAplicables,
  onChange,
  disabled = false,
}) => {
  const [sectores, setSectores] = useState<string[]>([])
  const [activa, setActiva] = useState(valor !== null)
  const [modo, setModo] = useState<'patron_fijo' | 'personalizado'>(
    valor?.modo || 'patron_fijo'
  )

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const diasOrdenados = [...diasAplicables].sort()

  // Cargar sectores desde la API
  useEffect(() => {
    sectoresApi.list().then((res) => {
      setSectores(res.data.map((s) => s.nombre))
    })
  }, [])

  // ... resto de la lógica de UI ...

  const handleToggle = (checked: boolean) => {
    setActiva(checked)
    onChange(checked ? buildConfig() : null)
  }

  // UI implementada en CSS + JSX
  // Modo patrón fijo: un <select> por cada día aplicable, opciones = sectores cargados
  // Modo personalizado: tabla diasOrdenados × sectores, inputs numéricos
  // Resumen: muestra distribuciones_sector calculadas
}
```

**Integración en `TareasEspecialesPanel.tsx`:**

```typescript
<ConfiguracionRotacionMultiSector
  valor={formData.configuracion_rotacion}
  diasAplicables={formData.dia_semana_aplicable}
  onChange={(config) =>
    setFormData({ ...formData, configuracion_rotacion: config })
  }
  disabled={isLoading}
/>
```

**Actualizar tipos en `frontend/src/api/tareasEspeciales.ts`:**

```typescript
export interface ConfiguracionRotacionMultiSector {
  modo: 'patron_fijo' | 'personalizado'
  patron_semanal: string[] | null
  distribucion_por_dia: Record<string, Record<string, number>> | null
  distribuciones_sector: Record<string, number>
}

export interface TareaEspecialTipo {
  // ... campos existentes ...
  configuracion_rotacion: ConfiguracionRotacionMultiSector | null  // ← NUEVO
}

export interface TareaEspecialTipoCreate {
  // ... campos existentes ...
  configuracion_rotacion?: ConfiguracionRotacionMultiSector | null
}

export interface TareaEspecialTipoUpdate {
  // ... campos existentes ...
  configuracion_rotacion?: ConfiguracionRotacionMultiSector | null
}
```

---

## Testing

### Unit Tests (Backend)

**`tests/test_tareas_especiales_multisector.py`**

1. Validación de configuración:
   - Patrón fijo válido (array de N sectores, N = len(dia_semana_aplicable))
   - Patrón con largo incorrecto (rechaza)
   - Distribuciones que no suman len(dia_semana_aplicable) (rechaza)
   - Personalizado con distribución inconsistente (rechaza)

2. Generación de cronograma multi-sector:
   - Genera asignaciones correctas para patrón fijo
   - Genera asignaciones correctas para personalizado
   - Rota correctamente dentro de cada sector
   - Excluye colaboradores inactivos (`estado_atencion = 'desafectado'`)
   - Genera advertencias si pool insuficiente
   - No crea duplicados
   - Con `cantidad_necesaria = 2`: asigna 2 colaboradores distintos el mismo día

3. Compatibilidad hacia atrás:
   - Tareas sin `configuracion_rotacion` siguen usando round-robin simple

4. Desactivar multi-sector:
   - PUT con `configuracion_rotacion: null` limpia la config existente

### Integration Tests (E2E)

1. Create tarea multi-sector → generar cronograma → verificar asignaciones
2. Edit patrón → regenerar → verificar cambios
3. Agregar/quitar colaborador del pool → regenerar → verificar rotación
4. PUT con `configuracion_rotacion: null` → verificar que queda en null en BD

### Manual Testing

1. Admin crea "Orientador" con patrón `["comerciales", "operativos", "comerciales", "operativos", "gerencia"]`
2. Habilita 3 comerciales, 2 operativos, 2 gerentes
3. Genera 4 semanas
4. Verifica cronograma muestra patrón correcto
5. Swapea una asignación, verifica impacto

---

## Consideraciones de Implementación

### Orden de cambios recomendado

1. **Migración SQL:** Agregar columna `configuracion_rotacion TEXT DEFAULT NULL`
2. **Schema Pydantic:** Definir `ConfiguracionRotacionMultiSector`; mover validación de suma a model_validator en `TareaEspecialTipoCreate`
3. **Modelo:** Agregar `configuracion_rotacion` a `TareaEspecialTipo`
4. **Motor:** Refactor `TaskRotationEngine` con imports de `Colaborador`/`Sector`, usar `timedelta`, flush entre asignaciones múltiples
5. **API:** Actualizar `create_tipo` (serializar a dict) y `update_tipo` (usar `model_fields_set`)
6. **Frontend:** Agregar tipo `ConfiguracionRotacionMultiSector` en `tareasEspeciales.ts`; agregar campo en formulario admin con carga dinámica de sectores
7. **Tests:** Coverage completo incluyendo caso `cantidad_necesaria > 1`
8. **Docs:** Actualizar si aplica

### Mitigación de riesgos

**Riesgo:** El cambio afecta tareas existentes  
**Mitigación:** `configuracion_rotacion` es NULL por defecto; se usa lógica antigua

**Riesgo:** Join con Sector en el engine es lento  
**Mitigación:** El engine ya hace JOINs; usar índices existentes (`sector_id` en `Colaborador`)

**Riesgo:** Validación de suma en frontend puede diferir del backend  
**Mitigación:** Backend es source of truth; frontend valida también para UX pero el servidor rechaza con 400 + detail claro

**Riesgo:** `update_tipo` ignora `configuracion_rotacion: null`  
**Mitigación:** Usar `model_fields_set` para distinguir "campo no enviado" de "campo enviado como null"

---

## Casos de Uso Futuros

Este diseño es extensible para:
- Rotación por 3+ sectores (actual: dinámico según sectores en BD)
- Frecuencia personalizada por sector (ej: comerciales cada 2 semanas, operativos cada semana)
- Prioridad o "peso" diferente por sector en la rotación
- Exclusiones (ej: ciertos colaboradores no rotan en ciertos días)

---

## Aprobaciones

- **Diseño:** ✅ Aprobado por usuario
- **Spec:** ✅ Revisada y corregida (bugs identificados en revisión pre-implementación)
