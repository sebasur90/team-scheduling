-- Add configuracion_rotacion column to tarea_especial_tipo
-- Supports multi-sector rotation configuration as JSON
ALTER TABLE tarea_especial_tipo
ADD COLUMN configuracion_rotacion TEXT DEFAULT NULL;

-- Example structure stored as JSON:
-- {
--   "modo": "patron_fijo" | "personalizado",
--   "patron_semanal": ["comerciales", "operativos", "comerciales", "operativos", "gerencia"] | null,
--   "distribucion_por_dia": {
--     "0": {"comerciales": 1, "operativos": 0, "gerencia": 0},
--     "1": {"comerciales": 0, "operativos": 1, "gerencia": 0},
--     ...
--   } | null,
--   "distribuciones_sector": {
--     "comerciales": 2,
--     "operativos": 2,
--     "gerencia": 1
--   }
-- }
