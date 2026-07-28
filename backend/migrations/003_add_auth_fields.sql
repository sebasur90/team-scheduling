-- Add authentication fields to colaborador table
ALTER TABLE colaborador ADD COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE colaborador ADD COLUMN es_admin BOOLEAN DEFAULT FALSE;
