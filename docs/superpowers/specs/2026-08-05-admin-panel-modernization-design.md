# Design Spec: Admin Panel Modernization

**Date:** 2026-08-05  
**Author:** Claude Code  
**Status:** Ready for Implementation  

---

## Overview

Modernize 4 key admin panel components to use a consistent, elegant design system based on the successful patterns from `FormTareaEspecial.css` and `CuotasEquipoStep.css`. All components will follow a mobile-first, responsive approach with violet (#7c3aed) as the primary color.

## Scope

### Components to Modernize

1. **Formulario de Colaboradores** (crear/editar)
2. **Formulario de Sectores** (crear/editar)
3. **Formulario de Franjas Horarias** (crear/editar)
4. **Cronograma de Tareas Panel**

### What's Included
- New CSS files per component
- React component updates to remove inline styles and use semantic class names
- Mobile-first responsive design (single-column on mobile, grid on desktop)
- Consistent visual language across all 4 components

### What's NOT Included
- Changes to form logic or data validation
- API modifications
- Restructuring of existing layouts (styling only)

---

## Design System

### Color Palette
- **Primary:** Violet (#7c3aed)
- **Primary Light:** Violet 10% (#f0e6ff)
- **Neutral:** Grays (#333, #666, #999, #ddd, #e0e0e0, #f5f5f5, #fafafa)
- **Success:** Green (#10b981)
- **Error:** Red (#ef4444)

### Typography
- **Headings:** Font-weight 600–700, color #333
- **Body:** Font-weight 400–500, color #333/#666, font-size 0.9–0.95rem
- **Labels:** Font-weight 500–600, font-size 0.9rem, color #333

### Spacing & Borders
- **Border radius:** 8px (inputs/small elements), 12–16px (containers/cards)
- **Border width:** 1.5px (modern look)
- **Box shadow:** 0 2px 8px rgba(0,0,0,0.05) to 0 4px 12px rgba(124,58,237,0.1)
- **Gap/Margin:** 1rem (between sections), 0.5–0.75rem (within sections)

### Transitions
- **Default:** all 0.2s ease
- Applied to: borders, backgrounds, shadows, color changes

---

## Component Design

### 1. Form Container Pattern (Applies to all 3 formularios)

**Structure:**
```
┌─ .admin-form-card (container)
│  ├─ .admin-form-header (violet background)
│  │  ├─ .admin-form-title
│  │  └─ .admin-form-subtitle
│  ├─ .admin-form-body (content area)
│  │  ├─ [form fields]
│  │  └─ [form groups]
│  └─ .admin-form-actions (buttons)
```

**Styling Details:**
- Card: Border radius 16px, border 1.5px rgba(124,58,237,0.1), shadow 0 4px 12px rgba(124,58,237,0.1)
- Header: Background #f0e6ff, border-bottom 1.5px solid #d9c9ff, padding 1.5rem
- Body: Padding 1.5rem, white background
- Buttons: Full width on mobile (stacked), side-by-side on desktop

**Mobile Behavior:**
- Single-column layout
- Font-size 16px on inputs (prevents iOS zoom)
- Min-height 48px on interactive elements (touch-friendly)
- Buttons stacked vertically (full width)
- Padding: 1.25rem (slightly less than desktop 1.5rem)

**Desktop Behavior:**
- Max-width 700px (centered)
- Grid layout: 2 columns for name/email, 3 columns for sector/rol/estado
- Buttons side-by-side (flex: 1)

### 2. Colaboradores Form

**Fields:**
- Nombre (text, required)
- Email (email, required on create, disabled on edit)
- Sector (select, required)
- Rol (select, default "usuario")
- Estado (select, default "activo")
- Tareas Especiales (checkbox group)

**Layout:**
- Mobile: All single-column
- Desktop: 2-col (nombre/email), 3-col (sector/rol/estado), full-width (tareas)

**Focus States:**
- Border: #7c3aed
- Box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1)

### 3. Sectores Form

**Fields:**
- Nombre (text, required)
- Capacidad Máxima (number, required)
- Mínimo de Cobertura (number, required)
- Acceso al Sistema (select)
- Color Identificador (color picker)
- Participa en Turnos (checkbox)

**Layout:**
- Mobile: All single-column
- Desktop: 1-col (nombre), 2-col (capacidad/minimo), 3-col (acceso/color/participa)

**Special Elements:**
- Color picker: Standard HTML5 color input with 1.5px border

### 4. Franjas Horarias Form

**Fields:**
- Orden (number, required)
- Hora Inicio (time, required)
- Hora Fin (time, required)

**Layout:**
- Mobile: Single-column stack
- Desktop: 3-column equal width

**Simplicity Note:** This is the simplest form; same pattern applies.

### 5. Cronograma Tareas Panel

**Structure:**
```
┌─ .cronograma-panel (container)
│  ├─ .cronograma-header (controls)
│  │  ├─ Title + "Generar" button
│  │  └─ Date filters (desde/hasta)
│  └─ .cronograma-list (scrollable area)
│     └─ .cronograma-item-card × n
│        ├─ Title + Date
│        ├─ Assigned person (chip)
│        └─ Time range
```

**Styling Details:**
- Container: Border radius 12px, border 1.5px solid #e0e0e0
- Header: Background #fafafa, border-bottom 1.5px solid #e0e0e0, padding 1.5rem
- Item cards: Background #f9f9f9, border-left 4px solid #7c3aed, border-radius 6px, padding 1rem
- List: Max-height 400px, overflow-y auto
- Chips: Background violet/green, color white, padding 0.25rem 0.75rem, border-radius 4px

**Mobile Behavior:**
- Full-width container, single-column date inputs
- Items full width, readable spacing
- Scrollable list with touch-friendly spacing

**Desktop Behavior:**
- 3-column date controls (desde/hasta/filtrar)
- Item cards in grid layout
- Larger viewport for cronograma list

---

## Implementation Strategy

### File Structure
```
frontend/src/components/
├── AdminPanel.tsx (no changes to JSX structure)
├── AdminPanel.css (core utilities only)
├── FormColaborador.css (NEW)
├── FormSector.css (NEW)
├── FormFranja.css (NEW)
└── CronogramaTareasPanel.css (UPDATE or NEW)
```

### CSS Architecture
- **Base classes** (.admin-form-card, .admin-form-header, .admin-form-body, .admin-form-actions) in each component's CSS
- **Reusable utilities** (.form-group, .form-row, .form-actions) kept in AdminPanel.css (already exist)
- **Component-specific** overrides/customizations in each component's own CSS file
- **Mobile media query:** @media (max-width: 768px)

### React Changes
Minimal modifications to AdminPanel.tsx:
- Add className to form containers (e.g., `className="admin-form-card"`)
- Keep all existing form structure
- Remove any inline styles from the form wrapper (move to CSS)
- No changes to state management, handlers, or validation logic

### Migration Path
1. Create FormColaborador.css with all .admin-form-* classes
2. Update AdminPanel.tsx form elements (add classNames)
3. Repeat for Sectores, Franjas
4. Create/update CronogramaTareasPanel.css
5. Test responsive behavior at 375px, 768px, 1024px viewports

---

## Mobile-First Details

### Input/Select Sizing (Mobile)
- Padding: 0.875rem 1rem
- Font-size: 16px (iOS zoom prevention)
- Min-height: 48px (touch targets)
- Border-radius: 8px

### Button Sizing (Mobile)
- Width: 100% (full width)
- Padding: 0.875rem
- Min-height: 48px
- Font-size: 1rem
- Layout: Flex column (stacked)

### Layout (Mobile)
- Single column grid (grid-template-columns: 1fr)
- Margins/padding: 1.25rem (slightly less than desktop)
- Inputs/buttons: Full width

### Layout (Desktop)
- 2–3 column grids where appropriate
- Max-width: 700px for forms
- Padding: 1.5rem
- Buttons: Flex 1 (equal width side-by-side)

### Typography (Mobile)
- Headings: 1rem (slightly smaller than desktop 1.1rem)
- Labels: 0.9rem (same as desktop)
- Body: 0.9rem (same)
- Preserved vertical rhythm

---

## Focus States & Interactions

### Input Focus
- Border-color: #7c3aed
- Box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1)
- Transition: 0.2s

### Button Hover
- Primary: Background #6d28d9 (darker violet), shadow 0 4px 12px rgba(124, 58, 237, 0.3)
- Secondary: Background #d1d5db (lighter gray)

### Button Disabled
- Opacity: 0.6 or background #ccc, cursor: not-allowed

### Checkbox/Radio Focus
- Accent-color: #7c3aed (native browser styling)

---

## Testing Checkpoints

### Visual
- [ ] Violet color consistent across all 4 components
- [ ] Header stands out with light violet background
- [ ] Focus states visible and violet-colored
- [ ] Shadows subtle but present
- [ ] Borders 1.5px consistent

### Mobile (375px)
- [ ] Single column layout
- [ ] Inputs 16px font size
- [ ] All interactive elements ≥48px height
- [ ] Buttons full width and stacked
- [ ] Text readable without zoom

### Desktop (1024px)
- [ ] Multi-column grids used (2–3 cols)
- [ ] Max-width 700px respected for forms
- [ ] Buttons side-by-side (equal width)
- [ ] Spacing balanced
- [ ] No overflow or horizontal scroll

### Responsive Breakpoint (768px)
- [ ] Transition smooth from mobile to desktop
- [ ] No jarring layout shifts
- [ ] All content accessible

### Interactions
- [ ] Hover states work on buttons
- [ ] Focus states work on inputs
- [ ] Disabled states visible
- [ ] Transitions smooth (0.2s)

---

## Success Criteria

✅ All 4 components use consistent violet + modern design  
✅ Mobile-first: optimized for touch at 375px, scales to desktop  
✅ No breaking changes to existing functionality  
✅ CSS organized in separate files per component  
✅ React changes minimal (class names only)  
✅ Responsive tested at 375px, 768px, 1024px  

---

## Notes

- **Consistency:** Patterns from FormTareaEspecial.css and CuotasEquipoStep.css serve as the single source of truth
- **Mobile-First:** Default styles are mobile; desktop styles via @media (min-width: 769px)
- **No Refactoring:** Form logic, validation, and state management untouched
- **Progressive Enhancement:** Existing functionality works; new styles layer on top
