-- Módulo multi-tenant: cada clínica guarda sus propias credenciales de WhatsApp.
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS whatsapp_config jsonb DEFAULT '{}'::jsonb;
