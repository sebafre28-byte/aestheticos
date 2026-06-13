-- Plantillas de consentimiento por clínica/servicio
CREATE TABLE consentimiento_plantillas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id  uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  servicio_id uuid REFERENCES servicios(id) ON DELETE SET NULL,
  titulo      text NOT NULL DEFAULT 'Consentimiento Informado',
  contenido   text NOT NULL,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON consentimiento_plantillas(clinica_id);
CREATE INDEX ON consentimiento_plantillas(servicio_id);

ALTER TABLE consentimiento_plantillas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinica_own" ON consentimiento_plantillas
  USING (clinica_id = (SELECT clinica_id FROM usuarios_clinica WHERE user_id = auth.uid() LIMIT 1));

-- Solicitudes enviadas al paciente para firma
CREATE TABLE consentimiento_solicitudes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id   uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  cita_id      uuid NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  plantilla_id uuid REFERENCES consentimiento_plantillas(id) ON DELETE SET NULL,
  email_destino text NOT NULL,
  token        text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  estado       text NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente','firmado','expirado')),
  firma_img    text,   -- dataURL base64 PNG
  firma_ip     text,
  firmado_at   timestamptz,
  expires_at   timestamptz NOT NULL DEFAULT now() + interval '72 hours',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON consentimiento_solicitudes(cita_id);
CREATE INDEX ON consentimiento_solicitudes(token);

ALTER TABLE consentimiento_solicitudes ENABLE ROW LEVEL SECURITY;
-- Staff de la clínica puede leer/escribir
CREATE POLICY "clinica_own" ON consentimiento_solicitudes
  USING (clinica_id = (SELECT clinica_id FROM usuarios_clinica WHERE user_id = auth.uid() LIMIT 1));
-- Lectura pública por token (para la página de firma del paciente)
CREATE POLICY "public_token_read" ON consentimiento_solicitudes
  FOR SELECT USING (true);
