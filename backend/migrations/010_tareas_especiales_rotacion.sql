-- Migration: Add rotation fields to tarea_especial_tipo table
-- Date: 2026-08-03
-- Description: Support automatic task rotation with frequency and lunch exclusion settings

ALTER TABLE tarea_especial_tipo ADD COLUMN frecuencia VARCHAR(10) NOT NULL DEFAULT 'semanal';
ALTER TABLE tarea_especial_tipo ADD COLUMN inhabilita_almuerzo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tarea_especial_tipo ADD COLUMN fecha_inicio_ciclo DATE;

-- Validate frecuencia values
CREATE TRIGGER validate_frecuencia
BEFORE INSERT ON tarea_especial_tipo
BEGIN
  SELECT CASE
    WHEN NEW.frecuencia NOT IN ('semanal', 'quincenal')
    THEN RAISE(ABORT, 'frecuencia must be "semanal" or "quincenal"')
  END;
END;

CREATE TRIGGER validate_frecuencia_update
BEFORE UPDATE ON tarea_especial_tipo
BEGIN
  SELECT CASE
    WHEN NEW.frecuencia NOT IN ('semanal', 'quincenal')
    THEN RAISE(ABORT, 'frecuencia must be "semanal" or "quincenal"')
  END;
END;
