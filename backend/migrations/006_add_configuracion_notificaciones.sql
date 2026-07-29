-- Migration 006: Add notification configuration and viewer role
-- Phase 1: Config de notificaciones + Dashboard + Rol viewer

-- 1. Create singleton configuracion_notificaciones table
CREATE TABLE configuracion_notificaciones (
    id SERIAL PRIMARY KEY,
    aviso_previo_minutos INTEGER NOT NULL DEFAULT 5 CHECK (aviso_previo_minutos >= 0),
    tiempo_respuesta_colab_min INTEGER NOT NULL DEFAULT 3 CHECK (tiempo_respuesta_colab_min >= 0),
    tiempo_aceptacion_admin_min INTEGER NOT NULL DEFAULT 1 CHECK (tiempo_aceptacion_admin_min >= 0),
    notificaciones_pausadas BOOLEAN NOT NULL DEFAULT false,
    pausa_hasta TIMESTAMP WITH TIME ZONE,
    hora_inicio_envio TIME NOT NULL DEFAULT '08:00',
    hora_fin_envio TIME NOT NULL DEFAULT '18:00',
    intervalo_recordatorio_min INTEGER NOT NULL DEFAULT 30 CHECK (intervalo_recordatorio_min >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed with defaults (singleton ensures only one record)
INSERT INTO configuracion_notificaciones DEFAULT VALUES;

-- Index for lookups
CREATE INDEX idx_configuracion_notificaciones_id ON configuracion_notificaciones(id);

-- 2. Update colaborador rol CHECK constraint to include 'viewer'
ALTER TABLE colaborador
  DROP CONSTRAINT IF EXISTS colaborador_rol_check;
ALTER TABLE colaborador
  ADD CONSTRAINT colaborador_rol_check
  CHECK (rol IN ('admin', 'usuario', 'viewer'));
