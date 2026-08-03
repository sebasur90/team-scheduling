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
- Admin define secuencia de 5 días (lunes a viernes)
- Cada posición es un sector: C (Comercial), O (Operativo), G (Gerencia)
- Ejemplo: "C-O-C-O-G"
- Admin especifica cuotas totales: Comerciales: 2, Operativos: 2, Gerencia: 1
- El sistema valida que la suma sea 5

**Modo 2: Personalizado**
- Grid 5 días × 3 sectores
- Para cada día, admin ingresa cantidad de colaboradores por sector
- Ejemplo: Lunes [C:1, O:0, G:0], Martes [C:0, O:1, G:0], etc.
- Admin especifica cuotas totales igual

**Validaciones:**
- Patrón fijo: 5 caracteres exactos, solo C/O/G
- Personalizado: cada día tiene asignación válida
- Suma total de distribuciones_sector coincide con días aplicables
- Si no es multi-sector (checkbox no marcado), `configuracion_rotacion = null`

**Salida:** POST /tareas-especiales/tipos retorna TareaEspecialTipoResponse con `configuracion_rotacion` poblado

### RF2: Editar Configuración Multi-Sector

**Actor:** Admin  
**Flujo:**
1. Admin edita tarea especial existente
2. Puede cambiar modo (patrón fijo ↔ personalizado)
3. Puede cambiar patrón o distribución por día
4. Puede cambiar cuotas de sectores

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
     - Si modo `patrón_fijo`: parsear `patrón_semanal[weekday]`
     - Si modo `personalizado`: leer `distribucion_por_dia[weekday]`
   - Para cada sector + cantidad:
     - Obtener pool de colaboradores del sector (solo activos)
     - Encontrar siguiente en rotación round-robin
     - Crear `TareaEspecialAsignacion`

2. **Manejo de inactivos:**
   - Si colaborador tiene `estado_atencion = 'desafectado'` → excluir del pool
   - Si el pool quedaría vacío para un sector en un día → advertencia (no crea la asignación)
   - Si el pool tiene menos colaboradores de los que se necesitan → advertencia pero continúa

3. **Seguimiento de rotación:**
   - Mantener índice de rotación **por sector** dentro de la tarea
   - Consultar última asignación del sector para esa tarea
   - Asignar siguiente en orden del pool

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
    # Estructura:
    # {
    #   "modo": "patrón_fijo" | "personalizado",
    #   "patrón_semanal": "C-O-C-O-G" | null,
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
ADD COLUMN configuracion_rotacion JSON DEFAULT NULL;
```

### Schema (Pydantic)

**Nuevo schema en `app/schemas/tarea_especial.py`:**

```python
class ConfiguracionRotacionMultiSector(BaseModel):
    modo: Literal["patrón_fijo", "personalizado"]
    patrón_semanal: Optional[str] = None  # "C-O-C-O-G"
    distribucion_por_dia: Optional[Dict[str, Dict[str, int]]] = None
    # Ejemplo: {"0": {"comerciales": 1, "operativos": 0, "gerencia": 0}}
    distribuciones_sector: Dict[str, int]
    # {"comerciales": 2, "operativos": 2, "gerencia": 1}

    @field_validator('patrón_semanal')
    @classmethod
    def validar_patron(cls, v, info):
        if info.data.get('modo') == 'patrón_fijo':
            if not v or len(v) != 5:
                raise ValueError("patrón_semanal debe tener 5 caracteres")
            if not all(c in 'COG' for c in v):
                raise ValueError("patrón_semanal solo acepta C, O, G")
        return v

    @field_validator('distribuciones_sector')
    @classmethod
    def validar_distribuciones(cls, v):
        total = sum(v.values())
        if total != 5:
            raise ValueError("La suma de distribuciones_sector debe ser 5")
        return v
```

**Actualizar `TareaEspecialTipoCreate` y `TareaEspecialTipoUpdate`:**

```python
class TareaEspecialTipoCreate(TareaEspecialTipoBase):
    configuracion_rotacion: Optional[ConfiguracionRotacionMultiSector] = None

class TareaEspecialTipoUpdate(BaseModel):
    nombre: Optional[str] = None
    # ... otros campos ...
    configuracion_rotacion: Optional[ConfiguracionRotacionMultiSector] = None
```

### Motor de Rotación

**`app/core/task_rotation_engine.py` (refactor)**

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
        
        current = fecha_inicio
        while current <= fecha_fin:
            weekday = current.weekday()  # 0-4 = Mon-Fri
            
            # Validar que sea día aplicable
            if weekday not in tipo.dia_semana_aplicable:
                current = TaskRotationEngine._next_day(current)
                continue
            
            # Obtener distribución para hoy
            if config['modo'] == 'patrón_fijo':
                sector_hoy = config['patrón_semanal'][weekday]
                sector_count = {sector_hoy: 1}
            else:  # personalizado
                sector_count = config['distribucion_por_dia'].get(str(weekday), {})
            
            # Procesar cada sector
            for sector_nombre, cantidad_necesaria in sector_count.items():
                # Obtener pool del sector (solo activos)
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
                
                # Rotar y asignar
                for i in range(cantidad_necesaria):
                    last_asignacion = db.query(TareaEspecialAsignacion).filter(
                        TareaEspecialAsignacion.tarea_especial_tipo_id == tipo.id,
                        TareaEspecialAsignacion.colaborador.has(
                            Colaborador.sector_obj.has(Sector.nombre == sector_nombre)
                        )
                    ).order_by(TareaEspecialAsignacion.fecha.desc()).first()
                    
                    if last_asignacion:
                        last_idx = next(
                            (j for j, c in enumerate(pool) 
                             if c.colaborador_id == last_asignacion.colaborador_id),
                            -1
                        )
                        next_idx = (last_idx + 1) % len(pool)
                    else:
                        next_idx = 0
                    
                    colaborador_id = pool[next_idx].colaborador_id
                    
                    # Crear asignación (evitar duplicados)
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
                        asignaciones_creadas += 1
            
            current = TaskRotationEngine._next_day(current)
        
        db.commit()
        return asignaciones_creadas, advertencias
    
    @staticmethod
    def _next_day(fecha):
        """Avanza un día, manejando fin de mes/año"""
        if fecha.day < 28:
            return fecha.replace(day=fecha.day + 1)
        elif fecha.month < 12:
            return fecha.replace(month=fecha.month + 1, day=1)
        else:
            return fecha.replace(year=fecha.year + 1, month=1, day=1)
```

### API (Sin cambios de endpoints, solo lógica)

**`app/api/tareas_especiales.py` (cambios mínimos)**

- `create_tipo()`: acepta `configuracion_rotacion` del schema
- `update_tipo()`: actualiza `configuracion_rotacion`
- `generar_cronograma()`: llama a `TaskRotationEngine.generar()` que maneja ambos casos

---

### Frontend

**Nuevo componente: `ConfiguracionRotacionMultiSector.tsx`**

Ubicación: `frontend/src/components/ConfiguracionRotacionMultiSector.tsx`

```typescript
interface Props {
  valor: ConfiguracionRotacionMultiSector | null
  onChange: (config: ConfiguracionRotacionMultiSector | null) => void
  disabled?: boolean
}

export const ConfiguracionRotacionMultiSector: React.FC<Props> = ({
  valor,
  onChange,
  disabled = false,
}) => {
  const [activa, setActiva] = useState(valor !== null)
  const [modo, setModo] = useState<'patrón_fijo' | 'personalizado'>(
    valor?.modo || 'patrón_fijo'
  )
  const [patron, setPatron] = useState(valor?.patrón_semanal || 'C-O-C-O-G')
  const [distribucionPorDia, setDistribucionPorDia] = useState(
    valor?.distribucion_por_dia || {}
  )
  const [distribuciones, setDistribuciones] = useState(
    valor?.distribuciones_sector || {
      comerciales: 2,
      operativos: 2,
      gerencia: 1,
    }
  )

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
  const sectores = ['comerciales', 'operativos', 'gerencia']

  const handleToggle = (checked: boolean) => {
    setActiva(checked)
    if (checked) {
      onChange({
        modo: 'patrón_fijo',
        patrón_semanal: patron,
        distribucion_por_dia: null,
        distribuciones_sector: distribuciones,
      })
    } else {
      onChange(null)
    }
  }

  const handleModoChange = (nuevoModo: 'patrón_fijo' | 'personalizado') => {
    setModo(nuevoModo)
    onChange({
      modo: nuevoModo,
      patrón_semanal: nuevoModo === 'patrón_fijo' ? patron : null,
      distribucion_por_dia: nuevoModo === 'personalizado' ? distribucionPorDia : null,
      distribuciones_sector: distribuciones,
    })
  }

  const handlePatronChange = (dia: number, sector: string) => {
    const nuevoPatron = patron.split('')
    nuevoPatron[dia] = sector[0].toUpperCase()
    const nuevo = nuevoPatron.join('')
    setPatron(nuevo)
    onChange({
      modo,
      patrón_semanal: nuevo,
      distribucion_por_dia: null,
      distribuciones_sector: distribuciones,
    })
  }

  // UI implementada en CSS + JSX
  return (
    <div className="config-rotacion">
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={activa}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={disabled}
        />
        <span>Rotación multi-sector</span>
      </label>

      {activa && (
        <div className="rotacion-config">
          {/* Selector de modo */}
          <div className="form-group">
            <label>Modo de configuración:</label>
            <select
              value={modo}
              onChange={(e) => handleModoChange(e.target.value as any)}
              disabled={disabled}
            >
              <option value="patrón_fijo">Patrón fijo semanal</option>
              <option value="personalizado">Personalizado por día</option>
            </select>
          </div>

          {/* Modo Patrón Fijo */}
          {modo === 'patrón_fijo' && (
            <div className="patron-container">
              <label>Patrón semanal (C=Comercial, O=Operativo, G=Gerencia):</label>
              <div className="patron-selector">
                {diasSemana.map((dia, i) => (
                  <div key={i} className="dia-input">
                    <label>{dia}</label>
                    <select
                      value={patron[i] || 'C'}
                      onChange={(e) => handlePatronChange(i, e.target.value)}
                      disabled={disabled}
                    >
                      <option value="C">Comercial</option>
                      <option value="O">Operativo</option>
                      <option value="G">Gerencia</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modo Personalizado */}
          {modo === 'personalizado' && (
            <div className="personalizado-container">
              <label>Cantidad por día y sector:</label>
              <table className="distribucion-table">
                <thead>
                  <tr>
                    <th>Día</th>
                    {sectores.map((s) => (
                      <th key={s}>{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {diasSemana.map((dia, i) => (
                    <tr key={i}>
                      <td>{dia}</td>
                      {sectores.map((sector) => (
                        <td key={`${i}-${sector}`}>
                          <input
                            type="number"
                            min="0"
                            max="5"
                            value={
                              distribucionPorDia[String(i)]?.[sector] || 0
                            }
                            onChange={(e) => {
                              const newDistribucion = {
                                ...distribucionPorDia,
                                [String(i)]: {
                                  ...(distribucionPorDia[String(i)] || {}),
                                  [sector]: parseInt(e.target.value),
                                },
                              }
                              setDistribucionPorDia(newDistribucion)
                              onChange({
                                modo,
                                patrón_semanal: null,
                                distribucion_por_dia: newDistribucion,
                                distribuciones_sector: distribuciones,
                              })
                            }}
                            disabled={disabled}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Resumen */}
          <div className="resumen-distribuciones">
            <h4>Resumen semanal:</h4>
            <ul>
              {Object.entries(distribuciones).map(([sector, cantidad]) => (
                <li key={sector}>
                  {sector}: <strong>{cantidad}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Integración en `TareasEspecialesPanel.tsx`:**

```typescript
<ConfiguracionRotacionMultiSector
  valor={formData.configuracion_rotacion}
  onChange={(config) =>
    setFormData({ ...formData, configuracion_rotacion: config })
  }
  disabled={isLoading}
/>
```

---

## Testing

### Unit Tests (Backend)

**`tests/test_tareas_especiales_multisector.py`**

1. Validación de configuración:
   - Patrón fijo válido (5 caracteres COG)
   - Patrón inválido (rechaza)
   - Distribuciones que no suman 5 (rechaza)
   - Personalizado con distribución inconsistente (rechaza)

2. Generación de cronograma multi-sector:
   - Genera asignaciones correctas para patrón fijo
   - Genera asignaciones correctas para personalizado
   - Rota correctamente dentro de cada sector
   - Excluye colaboradores inactivos
   - Genera advertencias si pool insuficiente
   - No crea duplicados

3. Compatibilidad hacia atrás:
   - Tareas sin `configuracion_rotacion` siguen usando round-robin simple

### Integration Tests (E2E)

1. Create tarea multi-sector → generar cronograma → verificar asignaciones
2. Edit patrón → regenerar → verificar cambios
3. Agregar/quitar colaborador del pool → regenerar → verificar rotación

### Manual Testing

1. Admin crea "Orientador" con patrón "C-O-C-O-G"
2. Habilita 3 comerciales, 2 operativos, 2 gerentes
3. Genera 4 semanas
4. Verifica cronograma muestra patrón correcto
5. Swapea una asignación, verifica impacto

---

## Consideraciones de Implementación

### Orden de cambios recomendado

1. **Migración SQL:** Agregar columna `configuracion_rotacion`
2. **Schema Pydantic:** Definir `ConfiguracionRotacionMultiSector` y validadores
3. **Modelo:** Actualizar `TareaEspecialTipo`
4. **Motor:** Refactor `TaskRotationEngine` (mantener compatibilidad atrás)
5. **API:** Actualizar create/update
6. **Frontend:** Agregar componente `ConfiguracionRotacionMultiSector`
7. **Tests:** Coverage completo
8. **Docs:** Actualizar si aplica

### Mitigación de riesgos

**Riesgo:** El cambio afecta tareas existentes
**Mitigación:** `configuracion_rotacion` es NULL por defecto; se usa lógica antigua

**Riesgo:** Join con Sector en el engine es lento
**Mitigación:** El engine ya hace JOINs; usar índices existentes (sector_id en Colaborador)

**Riesgo:** Validación de patrón en frontend puede no coincidir con backend
**Mitigación:** Backend es source of truth; frontend lo valida también para UX

---

## Casos de Uso Futuros

Este diseño es extensible para:
- Rotación por 3+ sectores (actual: 3, máximo teórico: ilimitado)
- Frecuencia personalizada por sector (ej: comerciales cada 2 semanas, operativos cada semana)
- Prioridad o "peso" diferente por sector en la rotación
- Exclusiones (ej: ciertos colaboradores no rotan en ciertos días)

---

## Aprobaciones

- **Diseño:** ✅ Aprobado por usuario
- **Spec:** ⏳ Pendiente revisión
