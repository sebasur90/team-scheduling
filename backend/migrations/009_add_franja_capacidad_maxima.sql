-- Migration: Add capacidad_maxima column to franja_horaria table
-- Date: 2026-07-30
-- Description: Add capacity limit per time slot to support flexible scheduling

ALTER TABLE franja_horaria ADD COLUMN capacidad_maxima INTEGER NOT NULL DEFAULT 2;

-- Create index for performance
CREATE INDEX idx_franja_horaria_capacidad ON franja_horaria(capacidad_maxima);
