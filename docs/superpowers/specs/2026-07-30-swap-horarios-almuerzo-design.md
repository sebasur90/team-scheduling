# Diseño: Sistema de Intercambio de Horarios de Almuerzo (Swap)

**Fecha:** 2026-07-30  
**Estado:** Aprobado

---

## Contexto

El sistema actual asigna franjas de almuerzo a cada colaborador por semana. Los usuarios necesitan poder intercambiar sus franjas entre ellos de forma autónoma, sin intervención del admin, pero garantizando que los mínimos de cobertura por sector no se rompan.

La infraestructura de datos base ya existe: el modelo `SwapSolicitud`, el schema `SwapCreate`/`SwapResponse` y el enum `EstadoSwap` están definidos. Lo que falta es la capa de API, la lógica de negocio y el frontend completo.

---

## Alcance

- Usuarios (rol `usuario`) pueden proponer intercambios de franja del mismo día entre ellos.
- El receptor acepta o rechaza desde el Centro de Notificaciones o desde el Calendario.
- Al aceptar, el intercambio se ejecuta automáticamente (sin aprobación admin).
- Admin recibe notificaciones de todos los eventos pero no interviene en el flujo.
- No aplica a usuarios con rol `viewer`.

---

## Ciclo de vida del swap

```
[A clickea pill de B]
       │
       ▼
[Modal de confirmación en frontend]
       │ Confirma
       ▼
POST /api/swaps
       │
       ├─ Validación falla (cobertura) → 409 + mensaje descriptivo
       │
       └─ OK → SwapSolicitud(estado=pendiente)
               asignacion_A → pendiente_swap
               asignacion_B → pendiente_swap
               Notificación → B + admin (swap_solicitado)
                      │
            ┌─────────┴──────────┐
            │                    │
         B acepta             B rechaza / A cancela
            │                    │
            ▼                    ▼
   Intercambio atómico    swap.estado = rechazado/cancelado
   asignacion_A.colaborador = B    ambas asignaciones → firme
   asignacion_B.colaborador = A    Notificación → contraparte
   ambas → firme
   swap.estado = aceptado
   Notificación → A + admin
```

**Estados posibles:** `pendiente` → `aceptado` | `rechazado` | `cancelado`

---

## Backend

### Validación de cobertura

**Nuevo archivo:** `backend/app/core/swap_validator.py`

Función `validate_swap_coverage(db, asig_a, asig_b) -> tuple[bool, str | None]`

Lógica:
1. Obtiene todos los colaboradores activos del día
2. Obtiene ausencias del día (excluidos)
3. Para `franja_A`: simula asignados = (actuales - A) + B → corre `CoberturaValidator.satisfies_minimum_coverage()`
4. Para `franja_B`: simula asignados = (actuales - B) + A → corre `CoberturaValidator.satisfies_minimum_coverage()`
5. Si alguna falla → devuelve `(False, "El intercambio rompería la cobertura mínima de sector [X] en la franja de [HH:MM]")`
6. Si ambas pasan → devuelve `(True, None)`

Reutiliza `CoberturaValidator` existente en `backend/app/core/cobertura.py`. No duplica lógica.

### Schema actualizado

`backend/app/schemas/swap.py` — `SwapCreate` pasa a incluir `asignacion_receptor_id`:

```python
class SwapCreate(BaseModel):
    asignacion_origen_id: int      # asignacion de quien inicia (A)
    asignacion_receptor_id: int    # asignacion de quien recibe (B), conocida al clickear la pill
```

El campo `colaborador_receptor_id` se deriva del `AsignacionAlmuerzo.colaborador_id` de la asignacion receptora (no lo envía el frontend).

`SwapResponse` ampliado:

```python
class SwapResponse(BaseModel):
    id: int
    asignacion_origen_id: int
    asignacion_receptor_id: Optional[int]
    colaborador_solicitante_id: int
    colaborador_receptor_id: int
    estado: str
    motivo_rechazo: Optional[str]
    created_at: datetime
    # Datos denormalizados para el frontend
    fecha: Optional[date]
    franja_origen_hora: Optional[str]
    franja_receptor_hora: Optional[str]
    nombre_solicitante: Optional[str]
    nombre_receptor: Optional[str]

    class Config:
        from_attributes = True
```

### Router API

**Nuevo archivo:** `backend/app/api/swap.py`

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `POST` | `/api/swaps` | usuario | Crear solicitud |
| `GET` | `/api/swaps` | usuario | Listar (enviados + recibidos) |
| `POST` | `/api/swaps/{id}/aceptar` | receptor | Aceptar y ejecutar |
| `POST` | `/api/swaps/{id}/rechazar` | receptor | Rechazar |
| `POST` | `/api/swaps/{id}/cancelar` | solicitante | Cancelar mientras pendiente |

**POST `/api/swaps` — lógica detallada:**
1. Verificar que `current_user.id == asignacion_origen.colaborador_id`
2. Verificar que `asignacion_origen.turno_almuerzo.fecha == asignacion_receptor.turno_almuerzo.fecha`
3. Verificar que ninguna de las dos asignaciones tenga ya un swap en estado `pendiente`
4. Correr `validate_swap_coverage()` → si falla, `HTTP 409` con detalle del motivo
5. Crear `SwapSolicitud(estado='pendiente', asignacion_receptor_id=asig_receptor.id, colaborador_receptor_id=asig_receptor.colaborador_id)`
6. `asignacion_origen.estado = 'pendiente_swap'`
7. `asignacion_receptor.estado = 'pendiente_swap'`
8. `db.commit()`
9. Crear notificaciones Firestore para receptor y admin

**POST `/api/swaps/{id}/aceptar` — lógica detallada:**
1. Verificar que `current_user.id == swap.colaborador_receptor_id`
2. Verificar que `swap.estado == 'pendiente'` (guard contra doble-click)
3. Verificar que ambas asignaciones aún existen (guard contra eliminación por admin)
4. Transacción atómica:
   - `asignacion_origen.colaborador_id = swap.colaborador_receptor_id`
   - `asignacion_receptor.colaborador_id = swap.colaborador_solicitante_id`
   - `asignacion_origen.estado = 'firme'`
   - `asignacion_receptor.estado = 'firme'`
   - `swap.estado = 'aceptado'`
5. `db.commit()`
6. Crear notificaciones Firestore para solicitante y admin

**POST `/api/swaps/{id}/rechazar`:**
1. Verificar que `current_user.id == swap.colaborador_receptor_id`
2. Verificar que `swap.estado == 'pendiente'`
3. `swap.estado = 'rechazado'`, `swap.motivo_rechazo = body.motivo` (opcional)
4. `asignacion_origen.estado = 'firme'`, `asignacion_receptor.estado = 'firme'`
5. `db.commit()`
6. Notificar al solicitante

**POST `/api/swaps/{id}/cancelar`:**
1. Verificar que `current_user.id == swap.colaborador_solicitante_id`
2. Verificar que `swap.estado == 'pendiente'`
3. `swap.estado = 'cancelado'`
4. `asignacion_origen.estado = 'firme'`, `asignacion_receptor.estado = 'firme'`
5. `db.commit()`
6. Notificar al receptor

**Registro en `main.py`:** agregar `from app.api import swap` e `app.include_router(swap.router, prefix="/api")`.

---

## Frontend

### Módulo de API

**Nuevo archivo:** `frontend/src/api/swaps.ts`

```typescript
export interface SwapResponse {
  id: number
  asignacion_origen_id: number
  asignacion_receptor_id: number | null
  colaborador_solicitante_id: number
  colaborador_receptor_id: number
  estado: 'pendiente' | 'aceptado' | 'rechazado' | 'cancelado'
  motivo_rechazo: string | null
  created_at: string
  fecha: string | null
  franja_origen_hora: string | null
  franja_receptor_hora: string | null
  nombre_solicitante: string | null
  nombre_receptor: string | null
}

export const swapsApi = {
  create: (asignacion_origen_id: number, asignacion_receptor_id: number) =>
    client.post<SwapResponse>('/swaps', { asignacion_origen_id, asignacion_receptor_id }),
  list: () =>
    client.get<SwapResponse[]>('/swaps'),
  aceptar: (id: number) =>
    client.post(`/swaps/${id}/aceptar`),
  rechazar: (id: number, motivo?: string) =>
    client.post(`/swaps/${id}/rechazar`, { motivo }),
  cancelar: (id: number) =>
    client.post(`/swaps/${id}/cancelar`),
}
```

### Cambios en `CalendarView.tsx`

**Pills clickeables:**
- Una pill de otro usuario es clickeable si el usuario actual tiene una asignación en ese mismo día
- El cursor cambia a `pointer` en pills clickeables
- Pills propias con `estado = 'pendiente_swap'` muestran un badge naranja (punto) en la esquina superior derecha
- Al clickear pill ajena → abrir `SwapConfirmModal`
- Al clickear pill propia con badge → abrir `SwapStatusModal`

**Estado local necesario:**
```typescript
const [swapModal, setSwapModal] = useState<{
  asignacionOrigen: AsignacionResponse
  asignacionReceptor: AsignacionResponse
  receptorNombre: string
  franjaOrigen: string
  franjaReceptor: string
  fecha: string
} | null>(null)

const [swapStatusModal, setSwapStatusModal] = useState<SwapResponse | null>(null)
```

### Nuevo componente `SwapConfirmModal.tsx`

Modal de confirmación antes de enviar la solicitud:

```
┌─────────────────────────────────┐
│  Solicitar intercambio          │
├─────────────────────────────────┤
│  Fecha:      Lunes 4 ago 2026   │
│  Tu turno:   12:00 – 12:30      │
│  Turno de:   Juan García        │
│              12:30 – 13:00      │
├─────────────────────────────────┤
│  [error de cobertura si aplica] │
├─────────────────────────────────┤
│  [ Cancelar ]  [ Confirmar → ]  │
└─────────────────────────────────┘
```

Props:
```typescript
{
  asignacionOrigen: AsignacionResponse
  asignacionReceptor: AsignacionResponse
  receptorNombre: string
  franjaOrigen: string   // "12:00 – 12:30"
  franjaReceptor: string // "12:30 – 13:00"
  fecha: string
  onClose: () => void
  onSuccess: () => void  // refresca el calendario
}
```

Al confirmar: llama `swapsApi.create()`. Si el backend responde 409, muestra el mensaje de error dentro del modal sin cerrarlo. Si éxito, cierra y refresca el calendario.

### Nuevo componente `SwapStatusModal.tsx`

Para el solicitante al clickear su badge:

```
┌─────────────────────────────────┐
│  Intercambio pendiente          │
├─────────────────────────────────┤
│  Solicitaste intercambiar con   │
│  Juan García                    │
│  Lunes 4 ago 2026               │
│  Tu franja:  12:00 – 12:30      │
│  Su franja:  12:30 – 13:00      │
│                                 │
│  Esperando respuesta...         │
├─────────────────────────────────┤
│           [ Cancelar swap ]     │
└─────────────────────────────────┘
```

Al cancelar: llama `swapsApi.cancelar()`, cierra el modal y refresca el calendario.

### Cambios en `NotificationCenter.tsx`

Las notificaciones de tipo `swap_solicitado` renderizan un `SwapActionCard` con botones de acción. El resto de tipos de swap son solo informativos.

**Nuevo componente `SwapActionCard.tsx`** (usado dentro de NotificationCenter):

```
┌─────────────────────────────────────┐
│ 🔄  Solicitud de intercambio        │
│                                     │
│  María López quiere intercambiar    │
│  su turno 12:00–12:30 por tu turno  │
│  12:30–13:00 del Lunes 4 ago        │
│                                     │
│  [ Rechazar ]      [ Aceptar ✓ ]    │
└─────────────────────────────────────┘
```

Al aceptar/rechazar: llama `swapsApi.aceptar()` o `swapsApi.rechazar()`, emite evento para refrescar el calendario si está montado.

---

## Notificaciones Firestore

Todos los eventos crean registros en la tabla `notificacion` (sistema existente) y actualizan Firestore para entrega en tiempo real.

| Evento | Destinatarios | Tipo | Mensaje |
|--------|--------------|------|---------|
| Swap creado | receptor + admin | `swap_solicitado` | "[Nombre A] quiere intercambiar su turno [HH:MM] por tu turno [HH:MM] del [fecha]" |
| Swap aceptado | solicitante + admin | `swap_aceptado` | "[Nombre B] aceptó el intercambio del [fecha]. Tu nuevo turno: [HH:MM]" |
| Swap rechazado | solicitante | `swap_rechazado` | "[Nombre B] rechazó el intercambio del [fecha]" |
| Swap cancelado | receptor | `swap_cancelado` | "[Nombre A] canceló la solicitud de intercambio del [fecha]" |

Las notificaciones `swap_solicitado` incluyen el `swap_id` en el payload de Firestore para que el frontend pueda renderizar `SwapActionCard` con las acciones correctas.

---

## Archivos a crear / modificar

**Backend — nuevos:**
- `backend/app/core/swap_validator.py`
- `backend/app/api/swap.py`

**Backend — modificados:**
- `backend/app/schemas/swap.py` — actualizar `SwapCreate`, ampliar `SwapResponse`
- `backend/app/main.py` — registrar router de swap

**Frontend — nuevos:**
- `frontend/src/api/swaps.ts`
- `frontend/src/components/SwapConfirmModal.tsx`
- `frontend/src/components/SwapConfirmModal.css`
- `frontend/src/components/SwapStatusModal.tsx`
- `frontend/src/components/SwapStatusModal.css`
- `frontend/src/components/SwapActionCard.tsx`

**Frontend — modificados:**
- `frontend/src/components/CalendarView.tsx` — pills clickeables + badge + apertura de modales
- `frontend/src/components/NotificationCenter.tsx` — renderizar `SwapActionCard` para `swap_solicitado`

---

## Restricciones y casos borde

- Un usuario no puede tener más de un swap `pendiente` sobre la misma asignación.
- Si el admin elimina una asignación mientras su swap está pendiente, al intentar aceptar el backend detecta la asignación faltante, cancela el swap automáticamente y notifica a ambas partes.
- Los viewers no pueden iniciar ni responder swaps.
- No se puede hacer swap con uno mismo.
- Solo se puede hacer swap entre asignaciones del mismo día (no entre días distintos).
