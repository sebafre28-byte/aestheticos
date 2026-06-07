CREATE TABLE IF NOT EXISTS fichas_clinicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  cita_id uuid REFERENCES citas(id) ON DELETE SET NULL,
  tipo_tratamiento text NOT NULL DEFAULT 'general',
  contenido jsonb NOT NULL DEFAULT '{}',
  notas text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fichas_clinicas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinica_miembros_fichas" ON fichas_clinicas;
CREATE POLICY "clinica_miembros_fichas" ON fichas_clinicas
  FOR ALL USING (clinica_id = auth_clinica_id());
CREATE INDEX IF NOT EXISTS fichas_clinicas_paciente_id_idx ON fichas_clinicas(paciente_id);
CREATE INDEX IF NOT EXISTS fichas_clinicas_clinica_id_idx ON fichas_clinicas(clinica_id);
