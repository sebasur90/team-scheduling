# Rediseño Mobile-First con Tailwind CSS

**Fecha:** 2026-07-31  
**Estado:** Aprobado  

---

## Contexto

La app es un sistema de gestión de turnos de almuerzo (React 18 + TypeScript + Vite). Actualmente usa CSS puro artesanal con variables CSS, sin frameworks de UI. El diseño mobile es básico: algunos breakpoints en 768px pero la experiencia en celular es pobre (calendario como tabla horizontal difícil de usar, header que apila verticalmente, tabs que requieren scroll).

El objetivo es convertir la app en una experiencia mobile-first moderna, manteniendo el comportamiento existente pero con una estética nueva y navegación optimizada para celular.

---

## Decisiones de diseño

| Decisión | Elección | Alternativas descartadas |
|---|---|---|
| Estilo visual | Light Clean — azul cielo (`sky-700`) | Dark mode, Violet soft |
| Navegación mobile | Bottom nav bar | Tabs superiores con scroll, hamburger drawer |
| Calendario mobile | Strip de días + detalle del día seleccionado | Tabla con scroll horizontal, lista por día |
| Framework CSS | Tailwind CSS v3 | CSS puro mejorado, Tailwind solo para mobile |
| Estrategia de migración | Migración progresiva por componente | Reemplazo completo, híbrido |

---

## Design tokens

```js
// tailwind.config.js
colors: {
  primary:   { DEFAULT: '#0369a1', light: '#38bdf8', dark: '#075985' },
  sky:       { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd' },
  surface:   '#ffffff',
  bg:        '#f0f9ff',       // sky-50, fondo general
  admin:     '#0f172a',       // slate-900, header/nav admin
}
```

Paleta semántica:
- **Primary** `#0369a1` — acciones, tabs activos, turno propio, botones principales
- **Success** `#16a34a` — barómetro verde, Tipo B, alertas OK
- **Warning** `#d97706` — barómetro amarillo, alertas nivel medio, swaps pendientes
- **Danger** `#dc2626` — barómetro rojo, franjas sin cubrir, alertas críticas
- **Admin dark** `#0f172a` — header y bottom nav del panel admin (diferenciador visual de rol)

---

## Arquitectura de componentes

### Shell de usuario

```
<Dashboard>
  <TopBar />          ← compacto: título sección + avatar con iniciales
  <Barometro />       ← card con borde izquierdo coloreado por estado
  <main>              ← contenido scrolleable (bg sky-50)
    {activeTab}
  </main>
  <BottomNav />       ← fijo en el fondo, 4 ítems con indicador azul
</Dashboard>
```

**TopBar** (reemplaza al Header actual):
- Mobile: altura compacta (~56px), muestra el nombre de la sección activa, avatar con iniciales a la derecha
- Desktop: header azul completo (`bg-sky-700`) con logo, nombre de usuario y botón salir. Sin BottomNav en desktop — usa tabs horizontales bajo el header.

**BottomNav** (nuevo componente, solo mobile):
- 4 ítems: 📅 Calendario · ✨ Preferencias · 🏖️ Vacaciones · 🔔 Notificaciones
- Indicador activo: barra de 3px en la parte superior del ítem + label en azul
- Badge rojo con número de no-leídas sobre el ícono de notificaciones
- Oculto en desktop (`hidden md:flex` invertido)

### Shell de admin

```
<AdminDashboard>
  <AdminTopBar />     ← header oscuro (slate-900) + badge "ADMIN" dorado
  <AdminKPIRow />     ← 4 métricas en fila: cobertura, alertas, swaps, colaboradores
  <AdminTabs />       ← tabs con scroll horizontal (Resumen, Colaboradores, Turnos, Sectores, Config, Notif.)
  <main>
    {activeAdminTab}
  </main>
  <AdminBottomNav />  ← fondo oscuro, 5 ítems, acento dorado (amber) en activo
</AdminDashboard>
```

El admin usa header y bottom nav oscuros (`bg-slate-900`) para diferenciar visualmente el rol de administrador del rol de colaborador.

---

## Especificación de componentes

### CalendarView (rediseño completo mobile)

**Mobile:**
1. **Strip de días**: fila de 5 botones (Lun–Vie) con día seleccionado resaltado en `bg-sky-700` texto blanco. Punto indicador bajo el número si ese día tiene turno asignado.
2. **Estado activo**: `selectedDay` (useState), por defecto el día actual.
3. **Lista de franjas**: para el día seleccionado, renderiza cada franja como una card vertical:
   - Card normal: `bg-white rounded-xl shadow-sm` con hora + pills de compañeros
   - Card propia: `bg-sky-700 text-white rounded-xl` + botón "⇄ Solicitar swap"
   - Capacidad: número a la derecha (`3/5`)
4. Pills de personas: `bg-sky-100 text-sky-800` (Tipo A), `bg-green-100 text-green-800` (Tipo B), `bg-white/25 text-white` (en card propia)

**Desktop (≥768px):**
- Tabla semanal existente conservada, con rediseño visual en Tailwind
- Columna del día actual: fondo `bg-sky-50`, header `bg-sky-100 text-sky-700`
- Pills: azul (`bg-sky-100`) y verde (`bg-green-100`)
- El propio usuario: pill `bg-sky-700 text-white` con estrella ⭐

### Barometro

Card con borde izquierdo de 4px coloreado por estado:
- Verde: `border-l-4 border-green-500 bg-green-50`
- Amarillo: `border-l-4 border-amber-500 bg-amber-50`
- Rojo: `border-l-4 border-red-500 bg-red-50`

Indicador circular (40px) con color de fondo correspondiente + glow via `shadow`.

### AdminDashboard — Tab Resumen

**KPI Row** (4 cards en grid `grid-cols-4 gap-3`):
- Cobertura semanal (verde/rojo según umbral)
- Alertas activas (rojo si > 0)
- Swaps pendientes (amber si > 0)
- Colaboradores activos (azul, siempre)

**Alertas** (`flex-col gap-2`): cada alerta es una card con:
- Borde izquierdo coloreado por severidad (rojo/amber/verde)
- Ícono + título + subtítulo
- Botón de acción directo a la derecha ("Asignar →", "Ver swaps →")

### Login

Mantiene el diseño actual (degradado azul-morado → card blanca centrada) pero migrado a Tailwind. Sin cambios funcionales.

### Modales (SwapConfirmModal, SwapStatusModal)

- Overlay: `fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center`
- Card: `bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4`
- Header de modal: título + botón X
- Acciones: flex row con gap, botón primario `bg-sky-700 text-white` y secundario `bg-gray-100 text-gray-700`

---

## Setup de Tailwind en Docker

El frontend corre dentro de un container Docker (`frontend` service en `docker-compose.yml`). El Dockerfile hace `npm install` a partir de `package.json`, y el volumen `./frontend:/app` sincroniza el código fuente pero **no** el `node_modules` del host (el compose declara `/app/node_modules` como volumen anónimo del container).

Por eso Tailwind **no se instala en el host** — se agrega a `frontend/package.json` como devDependency y se reconstruye la imagen:

```bash
# Después de editar package.json y los archivos de config:
docker-compose build frontend
docker-compose up frontend
```

Los archivos de configuración (`tailwind.config.js`, `postcss.config.js`) sí van en `frontend/` y son recogidos por el volumen en tiempo de ejecución.

---

## Orden de migración

1. **Setup Tailwind**: agregar `tailwindcss`, `postcss` y `autoprefixer` a `devDependencies` en `frontend/package.json`. Crear `frontend/tailwind.config.js` y `frontend/postcss.config.js`. Agregar directivas `@tailwind` a `index.css`. Reconstruir container con `docker-compose build frontend`. Eliminar variables CSS de `index.css` excepto las que se reusen en la transición.
2. **Header → TopBar + BottomNav**: crear `TopBar.tsx` y `BottomNav.tsx` con Tailwind, actualizar `Dashboard.tsx` para usarlos. Eliminar `Header.tsx` y `Header.css`.
3. **Dashboard.tsx**: eliminar tabs superiores en mobile, integrar `BottomNav`. En desktop mantener tabs con Tailwind.
4. **Barometro.tsx**: migrar a Tailwind. Eliminar `Barometro.css`.
5. **CalendarView.tsx**: implementar strip de días + vista de día en mobile. Mantener tabla en desktop. Eliminar `CalendarView.css`.
6. **AdminDashboard.tsx + AdminPanel.tsx**: header dark, KPI row, alertas con acción. Eliminar `AdminDashboard.css`, `AdminPanel.css`.
7. **Componentes restantes** (Preferences, Vacaciones, NotificationCenter, Login, modales): migrar uno a uno, eliminar sus `.css` al finalizar cada uno.

---

## Comportamiento responsive

- **Mobile**: `< 768px` — TopBar compacto + BottomNav, calendario en strip+detalle, padding reducido
- **Desktop**: `≥ 768px` — Header completo con tabs horizontales, sin BottomNav, tabla semanal, layout con max-width

Se usa el enfoque **mobile-first** de Tailwind: estilos base para mobile, modificadores `md:` para desktop.

---

## Componentes nuevos a crear

| Componente | Descripción |
|---|---|
| `TopBar.tsx` | Header compacto para mobile |
| `BottomNav.tsx` | Barra de navegación inferior (usuario) |
| `AdminTopBar.tsx` | Header oscuro del admin |
| `AdminBottomNav.tsx` | Nav inferior oscuro del admin |
| `AdminKPIRow.tsx` | Fila de 4 métricas del resumen admin |

---

## Componentes a eliminar

- `Header.tsx` + `Header.css` (reemplazado por `TopBar.tsx`)

---

## Archivos CSS a eliminar (progresivamente)

Todos los `.css` individuales de componentes serán eliminados a medida que el componente se migra a Tailwind:
`Header.css`, `Dashboard.css`, `CalendarView.css`, `Barometro.css`, `AdminDashboard.css`, `AdminPanel.css`, `Preferences.css`, `Vacaciones.css`, `NotificationCenter.css`, `Login.css`, `ConfiguracionPanel.css`, `SectoresPanel.css`, `TareasEspecialesPanel.css`, `SwapConfirmModal.css`, `SwapStatusModal.css`, `SwapPendingBanner.css`, `SwapResponseBanner.css`, `ViewerPanel.css`, `PreferenciasUsuarios.css`, `NotificacionesConfig.css`

El archivo `App.css` y `index.css` se simplifican para contener solo las directivas de Tailwind y estilos globales mínimos.
