-- Migration 007: Dynamic special tasks
-- Phase 2: Tareas especiales dinámicas

-- 1. Create junction table colaborador ↔ tarea_especial_tipo
CREATE TABLE colaborador_tarea_tipo (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER NOT NULL REFERENCES colaborador(id) ON DELETE CASCADE,
    tarea_tipo_id INTEGER NOT NULL REFERENCES tarea_especial_tipo(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(colaborador_id, tarea_tipo_id)
);

CREATE INDEX idx_colab_tarea ON colaborador_tarea_tipo(colaborador_id);
CREATE INDEX idx_tarea_colab ON colaborador_tarea_tipo(tarea_tipo_id);

-- 2. Migrate existing data from boolean columns to junction table
-- Only insert if the corresponding tarea_especial_tipo exists
INSERT INTO colaborador_tarea_tipo (colaborador_id, tarea_tipo_id)
SELECT id, 1 FROM colaborador
WHERE habilitado_tarea_especial_1 = true
  AND EXISTS (SELECT 1 FROM tarea_especial_tipo WHERE id = 1);

INSERT INTO colaborador_tarea_tipo (colaborador_id, tarea_tipo_id)
SELECT id, 2 FROM colaborador
WHERE habilitado_tarea_especial_2 = true
  AND EXISTS (SELECT 1 FROM tarea_especial_tipo WHERE id = 2);

-- 3. Drop obsolete boolean columns
ALTER TABLE colaborador
  DROP COLUMN habilitado_tarea_especial_1,
  DROP COLUMN habilitado_tarea_especial_2;
