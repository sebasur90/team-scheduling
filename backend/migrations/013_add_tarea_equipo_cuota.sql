-- Add columns to tarea_especial_tipo for quota-based rotation
ALTER TABLE tarea_especial_tipo
ADD COLUMN minimo_personas_dia INTEGER NOT NULL DEFAULT 1;

ALTER TABLE tarea_especial_tipo
ADD COLUMN politica_minimo VARCHAR(10) NOT NULL DEFAULT 'alertar';

-- Create tarea_equipo_cuota table for per-team rotation configuration
CREATE TABLE tarea_equipo_cuota (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tarea_tipo_id INTEGER NOT NULL REFERENCES tarea_especial_tipo(id) ON DELETE CASCADE,
    sector_id INTEGER NOT NULL REFERENCES sector(id) ON DELETE CASCADE,
    personas_por_turno INTEGER NOT NULL DEFAULT 1,
    frecuencia VARCHAR(10) NOT NULL,
    veces_por_semana INTEGER,
    dia_tipo VARCHAR(10),
    dia_fijo INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_tarea_equipo_cuota_tarea_tipo_id ON tarea_equipo_cuota(tarea_tipo_id);
