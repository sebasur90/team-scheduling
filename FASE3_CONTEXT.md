# Contexto para Fase 3 — Sectores Dinámicos

**Fecha**: 2026-07-29  
**Estado Actual**: Fases 1 y 2 completadas (commits: 9c0cc85, aedc9a5)  
**Branch**: main

## Resumen de Progreso

### Fase 1 ✅ Completa
- Config de notificaciones configurable (pausas, ventanas horarias)
- Dashboard admin con cards
- Rol `viewer` de solo lectura

### Fase 2 ✅ Completa
- Junction table `colaborador_tarea_tipo` reemplaza booleans
- CRUD dinámico para tipos de tareas especiales
- Frontend con checkboxes dinámicos
- `types.py` y `engine.py` actualizados

### Fase 3 ⏳ Por Implementar
Convertir `sector` de string hardcodeado ("tipo_a" | "tipo_b") a tabla `sector` configurable.

---

## Cambios Necesarios en Fase 3

### Backend

#### 1. Migration 008: `dynamic_sectors.sql`
- Crear tabla `sector` con: `nombre`, `capacidad_maxima`, `participa_almuerzo`, `acceso_rol`, `minimo_cobertura`, `color`
- Migrar datos: `tipo_a` y `tipo_b` → registros en tabla `sector`
- Cambiar `colaborador.sector` (string) a `colaborador.sector_id` (FK)
- Deprecar `configuracion_cobertura` (los mínimos ahora viven en `sector.minimo_cobertura`)

#### 2. Modelos
- Crear `Sector` en `app/models/sector.py`
- Actualizar `Colaborador`: cambiar `sector` (string) a `sector_id` (FK) + relación `sector_obj`

#### 3. Schemas
- Crear `SectorBase`, `SectorCreate`, `SectorUpdate`, `SectorResponse` en `app/schemas/sector.py`
- Actualizar `ColaboradorCreate`/`ColaboradorUpdate`/`ColaboradorResponse` para usar `sector_id`

#### 4. APIs
- Nuevo router `app/api/sectores.py`: GET/POST/PUT/DELETE
- Validar capacidad máxima en POST/PATCH colaboradores (409 si excede `capacidad_maxima`)

#### 5. Lógica de Negocio
- `cobertura.py`: cambiar lectura de `ConfiguracionCobertura` a `sector.minimo_cobertura`
- `tipos.py`: actualizar `ColaboradorInfo` para incluir `sector_id`, `sector_nombre`, `participa_almuerzo`
- `engine.py`: cambiar agrupación de `sector` (string) a `sector_id` (integer)
- `auth.py`: al login, incluir `acceso_rol` del sector en token JWT

#### 6. Tests
- `test_sectores.py`: CRUD, validación de capacidad máxima (409)
- `test_cobertura_dinamica.py`: algoritmo agrupa por `sector_id`

### Frontend

#### 1. API Client
- Crear `app/src/api/sectores.ts` con CRUD completo

#### 2. AdminPanel
- Nueva sección "Sectores": lista + form de creación/edición
- Campo `sector` en colaboradores: pasa de `<select>` hardcodeado a dropdown dinámico desde `/sectores`

#### 3. AdminDashboard / CalendarView
- Mostrar color de sector en asignaciones

---

## Archivos Clave a Modificar

### Backend
- `backend/app/models/colaborador.py` — cambiar `sector` a `sector_id`
- `backend/app/models/sector.py` — crear (nuevo)
- `backend/app/core/tipos.py` — agregar `sector_id`, `sector_nombre`, `participa_almuerzo`
- `backend/app/core/engine.py` — cambiar agrupación por `sector_id`
- `backend/app/core/cobertura.py` — cargar `minimos_cobertura` desde `sector`
- `backend/app/api/colaboradores.py` — validar capacidad máxima
- `backend/migrations/008_dynamic_sectors.sql` — crear (nuevo)

### Frontend
- `frontend/src/api/auth.ts` — actualizar tipo `Colaborador` para `sector_id`
- `frontend/src/api/colaboradores.ts` — actualizar schema
- `frontend/src/api/sectores.ts` — crear (nuevo)
- `frontend/src/components/AdminPanel.tsx` — nueva sección "Sectores", actualizar form colaboradores
- `frontend/src/components/AdminDashboard.tsx` — (posible) mostrar colores de sectores

---

## Consideraciones Importantes

1. **Migraciones son reversibles**: Plan de rollback si falla
2. **Capacidad máxima**: validar en creación y cambio de sector
3. **Acceso por sector**: `acceso_rol` en tabla permite sectores con modo viewer
4. **Cobertura dinámica**: `minimo_cobertura` del sector reemplaza config global
5. **Tests críticos**: Migration 008 debe verificar que colaboradores quedan con `sector_id` correcto

---

## Orden Recomendado de Implementación

1. Migration 008 + modelo Sector
2. Actualizar Colaborador (sector_id + relación)
3. Schemas + router sectores (CRUD)
4. Validación de capacidad máxima en colaboradores
5. `cobertura.py`, `tipos.py`, `engine.py`
6. `auth.py` — token JWT incluye acceso_rol
7. Frontend: API + AdminPanel nueva sección
8. Tests completos

---

## Comandos Útiles

```bash
# Ver estado actual
git log --oneline -5
git status

# Ver spec completo
cat docs/superpowers/specs/2026-07-29-admin-config-panel-design.md

# Ejecución de tests (cuando venv esté disponible)
cd backend && pytest tests/test_sectores.py -v
```

---

**Siguiente paso**: Ejecutar `Migration 008` y crear modelo `Sector`.
