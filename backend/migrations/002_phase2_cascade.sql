-- Phase 2: Notificaciones Push, Cascada de Cobertura y Panel Admin en Tiempo Real

-- Extender asignacion_almuerzo.estado
ALTER TABLE asignacion_almuerzo
  DROP CONSTRAINT IF EXISTS asignacion_almuerzo_estado_check;

ALTER TABLE asignacion_almuerzo
  ADD CONSTRAINT asignacion_almuerzo_estado_check
  CHECK (estado IN ('firme', 'pendiente_swap', 'notificada', 'confirmada'));

-- Agregar campos a tablas existentes
ALTER TABLE colaborador
  ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(512);

ALTER TABLE notificacion
  ADD COLUMN IF NOT EXISTS canal VARCHAR(20) DEFAULT 'in_app';

-- Nuevas tablas
CREATE TABLE IF NOT EXISTS incidencia_cobertura (
  id SERIAL PRIMARY KEY,
  asignacion_id INTEGER NOT NULL REFERENCES asignacion_almuerzo(id) ON DELETE CASCADE,
  motivo VARCHAR(20) NOT NULL CHECK (motivo IN ('rechazo', 'timeout')),
  estado VARCHAR(30) NOT NULL DEFAULT 'ventana_admin'
    CHECK (estado IN ('ventana_admin', 'broadcast_activo', 'resuelta', 'sin_candidatos')),
  colaborador_reemplazante_id INTEGER REFERENCES colaborador(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historial_reemplazos (
  id SERIAL PRIMARY KEY,
  colaborador_id INTEGER NOT NULL REFERENCES colaborador(id) ON DELETE CASCADE,
  incidencia_id INTEGER NOT NULL REFERENCES incidencia_cobertura(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  semana_iso VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incidencia_cobertura_asignacion_id
  ON incidencia_cobertura(asignacion_id);
CREATE INDEX IF NOT EXISTS idx_incidencia_cobertura_estado
  ON incidencia_cobertura(estado);
CREATE INDEX IF NOT EXISTS idx_historial_reemplazos_colaborador_id
  ON historial_reemplazos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_historial_reemplazos_semana_iso
  ON historial_reemplazos(semana_iso);
