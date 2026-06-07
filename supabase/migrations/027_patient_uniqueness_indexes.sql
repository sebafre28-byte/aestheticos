-- Unique constraints to prevent duplicate patients per clinic
ALTER TABLE pacientes ADD CONSTRAINT IF NOT EXISTS pacientes_clinica_rut_unique
  UNIQUE (clinica_id, rut) DEFERRABLE INITIALLY DEFERRED;

-- Note: partial unique indexes require a different syntax
-- Using a unique index instead for NULL-safe uniqueness
DROP INDEX IF EXISTS idx_pacientes_clinica_rut_unique;
CREATE UNIQUE INDEX idx_pacientes_clinica_rut_unique
  ON pacientes (clinica_id, rut)
  WHERE rut IS NOT NULL AND rut <> '';

DROP INDEX IF EXISTS idx_pacientes_clinica_email_unique;
CREATE UNIQUE INDEX idx_pacientes_clinica_email_unique
  ON pacientes (clinica_id, email)
  WHERE email IS NOT NULL AND email <> '';

-- Trigram indexes for fast partial search on rut and email
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP INDEX IF EXISTS idx_pacientes_rut_trgm;
CREATE INDEX idx_pacientes_rut_trgm
  ON pacientes USING gin (rut gin_trgm_ops)
  WHERE rut IS NOT NULL;

DROP INDEX IF EXISTS idx_pacientes_email_trgm;
CREATE INDEX idx_pacientes_email_trgm
  ON pacientes USING gin (email gin_trgm_ops)
  WHERE email IS NOT NULL;

-- Performance index for whatsapp_logs cron query
DROP INDEX IF EXISTS idx_whatsapp_logs_estado_created;
CREATE INDEX idx_whatsapp_logs_estado_created
  ON whatsapp_logs (estado, created_at DESC);
