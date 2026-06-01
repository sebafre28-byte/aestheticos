CREATE TABLE IF NOT EXISTS bloqueos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  profesional_id uuid NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  inicio timestamptz NOT NULL,
  fin timestamptz NOT NULL,
  titulo text NOT NULL DEFAULT 'No disponible',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bloqueos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinica_bloqueos" ON bloqueos
  USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());

CREATE INDEX idx_bloqueos_profesional_inicio ON bloqueos(clinica_id, profesional_id, inicio);
