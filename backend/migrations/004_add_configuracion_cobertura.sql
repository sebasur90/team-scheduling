-- Migration 004: Add ConfiguracionCobertura table for dynamic coverage minimums
CREATE TABLE configuracion_cobertura (
    id SERIAL PRIMARY KEY,
    minimo_tipo_a INTEGER NOT NULL DEFAULT 1 CHECK (minimo_tipo_a >= 0),
    minimo_tipo_b INTEGER NOT NULL DEFAULT 1 CHECK (minimo_tipo_b >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed with defaults (preserves current behavior until admin changes it)
INSERT INTO configuracion_cobertura (minimo_tipo_a, minimo_tipo_b)
VALUES (1, 1);

CREATE INDEX idx_configuracion_cobertura_id ON configuracion_cobertura(id);
