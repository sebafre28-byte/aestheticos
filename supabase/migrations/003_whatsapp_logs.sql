-- ============================================================
-- SimpliClinic / AestheticOS — WhatsApp reminder audit log
-- Migration: 003_whatsapp_logs.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id          uuid NOT NULL REFERENCES clinicas ON DELETE CASCADE,
  cita_id             uuid REFERENCES citas ON DELETE SET NULL,
  paciente_telefono   text NOT NULL,
  tipo_mensaje        text NOT NULL,
  estado              text NOT NULL DEFAULT 'enviado',
  respuesta_paciente  text,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT whatsapp_logs_estado_check CHECK (
    estado IN ('enviado', 'fallido', 'respondido')
  ),
  CONSTRAINT whatsapp_logs_tipo_mensaje_check CHECK (
    tipo_mensaje IN (
      'recordatorio_24h',
      'recordatorio_2h',
      'confirmacion',
      'post_cita',
      'notificacion_clinica_cancelacion',
      'manual'
    )
  )
);

CREATE INDEX IF NOT EXISTS whatsapp_logs_clinica_idx ON whatsapp_logs (clinica_id, created_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_logs_cita_idx ON whatsapp_logs (cita_id, tipo_mensaje);
CREATE INDEX IF NOT EXISTS whatsapp_logs_telefono_idx ON whatsapp_logs (paciente_telefono, created_at DESC);

-- Un envío exitoso por cita y tipo para recordatorios automáticos (permite reintentos fallidos y envíos manuales repetidos)
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_logs_cita_tipo_enviado_unique
  ON whatsapp_logs (cita_id, tipo_mensaje)
  WHERE cita_id IS NOT NULL
    AND estado = 'enviado'
    AND tipo_mensaje IN ('recordatorio_24h', 'recordatorio_2h', 'post_cita');

ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_logs_clinica" ON whatsapp_logs;
CREATE POLICY "whatsapp_logs_clinica" ON whatsapp_logs
  FOR ALL
  USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());
