-- Allow marketing email logs in whatsapp_logs table
-- paciente_telefono is optional for email-only marketing logs
ALTER TABLE whatsapp_logs ALTER COLUMN paciente_telefono DROP NOT NULL;

-- Add paciente_id reference for marketing logs
ALTER TABLE whatsapp_logs ADD COLUMN IF NOT EXISTS paciente_id uuid REFERENCES pacientes(id) ON DELETE SET NULL;

-- Add canal column (email | whatsapp)
ALTER TABLE whatsapp_logs ADD COLUMN IF NOT EXISTS canal text;

-- Expand tipo_mensaje to include marketing email types
ALTER TABLE whatsapp_logs DROP CONSTRAINT IF EXISTS whatsapp_logs_tipo_mensaje_check;
ALTER TABLE whatsapp_logs ADD CONSTRAINT whatsapp_logs_tipo_mensaje_check
  CHECK (tipo_mensaje IN (
    'recordatorio_24h', 'recordatorio_2h', 'confirmacion', 'post_cita',
    'notificacion_clinica_cancelacion', 'manual',
    'email_cumpleanos', 'email_reactivacion'
  ));
