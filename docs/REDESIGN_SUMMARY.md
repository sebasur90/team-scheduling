# Rediseño UI — Resumen de cambios

Rediseño completo de la interfaz frontend implementado el 2026-08-03.

## Sistema de diseño nuevo

- **Color primario:** `#4f46e5` (indigo-600) → `#7c3aed` (violet-700) en gradiente
- **Fondo:** `#f5f5fa` (gris frío muy suave, en lugar de sky-50)
- **Cards:** fondo blanco, `border-radius: 20px`, `border: 1.5px solid rgba(0,0,0,.05)`, `box-shadow: 0 2px 8px rgba(0,0,0,.04)`
- **Tipografía:** system-ui, pesos 700–800 en títulos, `tracking-tight`
- **Comercial:** `#6d28d9` (violet-700) — cambio desde cyan
- **Operativo:** `#ea580c` (orange-600) — igual que antes

## Archivos modificados

| Archivo | Descripción |
|---|---|
| `frontend/src/index.css` | Tokens CSS: `--color-primary: #4f46e5`, `--color-bg: #f5f5fa`, `--card-radius: 20px`, `btn-primary` → indigo |
| `frontend/src/App.tsx` | Splash screen con `sessionStorage` (solo se muestra una vez por sesión); spinner indigo mientras carga auth |
| `frontend/src/components/SplashScreen.tsx` | **Nuevo** — gradiente 145deg indigo→violet, logo glassmorphism, dots loader, 2.2s |
| `frontend/src/components/Login.tsx` | Header curvo con gradiente (height 240px, border-radius 0 0 40px 40px), form sobre fondo `#f5f5fa` |
| `frontend/src/components/Dashboard.tsx` | Header mobile contextual: saludo + fecha en tab "calendar", título simple en otros tabs. Barometro dentro del tab calendar |
| `frontend/src/components/TopBar.tsx` | Gradiente indigo para desktop; initials en pill gradiente |
| `frontend/src/components/BottomNav.tsx` | SVG icons (sin emoji), glassmorphism `rgba(255,255,255,.92) + blur(20px)`, pill gradiente en tab activo, badge rojo |
| `frontend/src/components/Barometro.tsx` | Card gradiente (verde/amber/rojo), stats en vidrio esmerilado, barra de progreso |
| `frontend/src/components/DayStrip.tsx` | Chips redondeados, día activo en gradiente, hoy en `#ede9fe` |
| `frontend/src/components/DayDetailView.tsx` | Cards `rounded-2xl`, badge de cantidad, sin-asignar con fondo `#fef2f2` |
| `frontend/src/components/CalendarView.tsx` | Navegación mobile con flechas, botón "Esta semana", controles admin en gradiente |
| `frontend/src/components/Preferences.tsx` | Selección visual como tarjetas (activa en gradiente), sin radio buttons |
| `frontend/src/components/Vacaciones.tsx` | Balance card en gradiente, form compacto (2 cols), lista con avatares |

## Decisiones técnicas

- **Splash:** `sessionStorage.getItem('splash_shown')` — una vez por sesión
- **unreadCount:** usa `n.estado === 'pendiente'` (no `leida` — campo que no existe en `UserNotification`)
- **Mobile safe:** header con `max(env(safe-area-inset-top), 44px)`, nav con `env(safe-area-inset-bottom)` para iPhone
- **AdminDashboard y ViewerPanel:** sin cambios — mantienen diseño anterior con TopBar

## Notas

- El mockup visual está en `docs/mockup-redesign.html`
- CSS files (`.css`) de componentes pueden tener reglas obsoletas — limpieza pendiente
- Panel de reportes del admin aún usa estilo anterior (sky blue)
