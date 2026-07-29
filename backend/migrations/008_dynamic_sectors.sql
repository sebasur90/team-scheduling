-- Migration 008: Dynamic Sectors
-- Phase 3: Sectores dinámicos

-- 1. Create sector table
CREATE TABLE sector (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    capacidad_maxima INTEGER NOT NULL DEFAULT 10,
    participa_almuerzo BOOLEAN DEFAULT TRUE,
    acceso_rol VARCHAR(50) NOT NULL DEFAULT 'gestion' CHECK (acceso_rol IN ('gestion', 'viewer')),
    minimo_cobertura INTEGER DEFAULT 1,
    color VARCHAR(7) DEFAULT '#000000',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sector_nombre ON sector(nombre);

-- 2. Seed initial sectors from legacy hardcoded values
INSERT INTO sector (nombre, capacidad_maxima, participa_almuerzo, acceso_rol, minimo_cobertura, color, created_at, updated_at)
VALUES
    ('tipo_a', 15, TRUE, 'gestion', 2, '#89b4fa', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('tipo_b', 10, TRUE, 'gestion', 1, '#a6e3a1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. Add sector_id column to colaborador (nullable at first for migration)
ALTER TABLE colaborador
ADD COLUMN sector_id INTEGER REFERENCES sector(id) ON DELETE RESTRICT;

-- 4. Migrate existing sector strings to sector_id (join by sector name)
UPDATE colaborador
SET sector_id = (SELECT id FROM sector WHERE sector.nombre = colaborador.sector)
WHERE sector IS NOT NULL;

-- 5. Verify all colaboradores now have sector_id
-- (Intentional: if any are NULL, the migration will fail the next step)
ALTER TABLE colaborador
ALTER COLUMN sector_id SET NOT NULL;

-- 6. Drop old sector column (no longer needed)
ALTER TABLE colaborador
DROP COLUMN sector;

-- 7. Create index for performance
CREATE INDEX idx_colaborador_sector_id ON colaborador(sector_id);
