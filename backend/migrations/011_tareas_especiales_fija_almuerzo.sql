-- Migration: Add fixed lunch fields to tarea_especial_tipo table
-- Date: 2026-08-03
-- Description: Support fixed lunch slot for special tasks

ALTER TABLE tarea_especial_tipo ADD COLUMN fija_almuerzo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tarea_especial_tipo ADD COLUMN franja_almuerzo_id INTEGER REFERENCES franja_horaria(id);
