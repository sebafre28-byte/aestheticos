-- ============================================================
-- SimpliClinic — Configuración de clínica (plantillas y recordatorios)
-- Migration: 006_clinica_config.sql
-- ============================================================

ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS configuracion jsonb NOT NULL DEFAULT '{}';
