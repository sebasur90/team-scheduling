-- Migration 005: General preference and priority notification for freed slots
-- 1. Add franja_preferida_id to colaborador
-- 2. Drop preferencia_diaria table (no longer needed, preference is now general not per-date)
-- 3. Update notificacion type enum to support 'franja_preferida_disponible'

-- Add franja_preferida_id as nullable FK to colaborador
ALTER TABLE colaborador
ADD COLUMN franja_preferida_id INTEGER REFERENCES franja_horaria(id);

-- Drop the old preferencia_diaria table
DROP TABLE IF EXISTS preferencia_diaria;

-- Update notificacion.tipo to allow new type 'franja_preferida_disponible'
-- We also need to add new columns to notificacion to track the freed slot
ALTER TABLE notificacion
ADD COLUMN fecha DATE NULLABLE,
ADD COLUMN estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptada', 'expirada'));

-- Create index for notification lookup by colaborador and status
CREATE INDEX idx_notificacion_colaborador_estado ON notificacion(colaborador_id, estado);
CREATE INDEX idx_notificacion_fecha ON notificacion(fecha);
