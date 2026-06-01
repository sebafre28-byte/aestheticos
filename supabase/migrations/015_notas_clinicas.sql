CREATE TABLE IF NOT EXISTS notas_clinicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profesional_id uuid REFERENCES profesionales(id) ON DELETE SET NULL,
  cita_id uuid REFERENCES citas(id) ON DELETE SET NULL,
  contenido text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notas_clinicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinica_notas" ON notas_clinicas
  USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());

CREATE INDEX idx_notas_paciente ON notas_clinicas(clinica_id, paciente_id, created_at DESC);
