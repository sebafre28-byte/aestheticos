CREATE TABLE IF NOT EXISTS galeria_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  cita_id uuid REFERENCES citas(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'antes',
  descripcion text,
  tratamiento text,
  foto_url text NOT NULL,
  fecha_foto date NOT NULL DEFAULT CURRENT_DATE,
  notas text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE galeria_fotos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinica_miembros_galeria_fotos" ON galeria_fotos;
CREATE POLICY "clinica_miembros_galeria_fotos" ON galeria_fotos
  FOR ALL USING (clinica_id = auth_clinica_id());
CREATE INDEX IF NOT EXISTS galeria_fotos_paciente_id_idx ON galeria_fotos(paciente_id);
CREATE INDEX IF NOT EXISTS galeria_fotos_clinica_id_idx ON galeria_fotos(clinica_id);
