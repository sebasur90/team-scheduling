-- Migration: Link AsignacionAlmuerzo to the TareaEspecialAsignacion that fixed it
-- Date: 2026-08-07
-- Description: Support fija_almuerzo enforcement (fixed lunch slot from a special task)

ALTER TABLE asignacion_almuerzo ADD COLUMN tarea_especial_asignacion_id INTEGER REFERENCES tarea_especial_asignacion(id) ON DELETE SET NULL;

CREATE INDEX ix_asignacion_almuerzo_tarea_especial_asignacion_id ON asignacion_almuerzo(tarea_especial_asignacion_id);
