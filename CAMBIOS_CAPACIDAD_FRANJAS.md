# Cambios: Agregar Capacidad Máxima por Franja Horaria

## Resumen
Se agregó un campo `capacidad_maxima` a las franjas horarias para permitir configurar de forma flexible cuántas personas pueden usar cada franja. Esto soluciona el problema donde colaboradores no recibían asignación debido a límites hardcodeados.

## Cambios Realizados

### 1. Modelo de Base de Datos
- **Archivo:** `backend/app/models/franja_horaria.py`
- **Cambio:** Agregado campo `capacidad_maxima: Integer` con default de 2
- **Actualización en `__repr__`** para mostrar la capacidad

### 2. Migración de Base de Datos
- **Archivo:** `backend/migrations/009_add_franja_capacidad_maxima.sql`
- **Descripción:** Agrega columna `capacidad_maxima` a la tabla `franja_horaria` con default 2
- **Índice:** Se crea índice para optimizar consultas

### 3. Datos de Prueba - Generador
- **Archivo:** `datos_prueba/generate_test_data.py`
- **Cambios:**
  - Actualizadas 5 franjas horarias (cambio de 4 a 5)
  - Cada franja ahora incluye `"capacidad_maxima": 3`
  - Horarios ajustados a la configuración en `constants.py`

**Franjas Generadas:**
```json
{
  "orden": 1,
  "hora_inicio": "12:00",
  "hora_fin": "12:45",
  "capacidad_maxima": 3
}
```

### 4. Datos de Prueba - Cargador
- **Archivo:** `datos_prueba/load_test_data.py`
- **Función:** `load_franjas_horarias()`
- **Cambio:** Ahora lee `capacidad_maxima` del JSON y lo asigna al modelo
- **Fallback:** Usa default de 2 si no está presente en JSON

### 5. Motor de Asignación
- **Archivo:** `backend/app/core/engine.py`
- **Función:** `_phase_2_fill_remaining()`
- **Cambio:** 
  - Carga `capacidad_maxima` de cada `FranjaHoraria` de la BD
  - Usa esa capacidad en lugar de hardcode de 2
  - Verifica que `len(asignados_por_franja[f]) < capacidad`

### 6. Persistencia de Turnos
- **Archivo:** `backend/app/api/admin_turnos.py`
- **Función:** `_persist_day_assignments()`
- **Cambio:**
  - Lee `capacidad_maxima` de cada franja desde la BD
  - Asigna la capacidad al crear cada `TurnoAlmuerzo`
  - Reemplaza hardcode de `capacidad_maxima=2`

### 7. Documentación
- **Archivo:** `GUIA_DATOS_PRUEBA.md`
- **Cambio:** Actualizada sección de franjas horarias con nueva configuración (5 franjas, capacidad 3)

## Capacidad Total
**Antes:** 4 franjas × 2 personas = 8 espacios/día
**Después:** 5 franjas × 3 personas = 15 espacios/día

Con 14 colaboradores que participan en almuerzos, ahora todos reciben asignación.

## Cómo Aplicar en Base de Datos Existente

### Opción 1: Resetear BD (desarrollo)
```bash
docker-compose down -v
docker-compose up -d postgres
sleep 5
python datos_prueba/load_test_data.py
```

### Opción 2: Aplicar migración a BD existente
```bash
# Conectar a PostgreSQL y ejecutar:
psql $DATABASE_URL < backend/migrations/009_add_franja_capacidad_maxima.sql

# Luego recargar datos:
python datos_prueba/load_test_data.py
```

## Configuración Personalizada

Para ajustar la capacidad máxima de cada franja:
1. Editar `datos_prueba/generate_test_data.py` - función `generate_franjas_horarias()`
2. Cambiar valores de `"capacidad_maxima": 3` al valor deseado
3. Regenerar datos: `python datos_prueba/generate_test_data.py`
4. Recargar en BD: `python datos_prueba/load_test_data.py`

## Ventajas
✅ Capacidad flexible por franja  
✅ Fácil ajuste sin cambiar código  
✅ Todos los colaboradores pueden recibir asignación  
✅ Sin hardcodes en el engine  
✅ Persistencia correcta de capacidad en turnos generados  

## Próximos Pasos (Opcionales)
- [ ] Agregar API para actualizar capacidad máxima de franjas
- [ ] Interfaz admin para configurar capacidades
- [ ] Validación de cobertura según capacidades configuradas
