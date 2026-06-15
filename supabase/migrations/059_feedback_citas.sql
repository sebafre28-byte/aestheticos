-- Feedback post-cita: almacena la valoración del paciente
CREATE TABLE IF NOT EXISTS feedback_citas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cita_id       uuid NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  clinica_id    uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id   uuid REFERENCES pacientes(id) ON DELETE SET NULL,
  rating        text NOT NULL CHECK (rating IN ('excelente', 'regular', 'mala')),
  respuestas    jsonb,   -- { atencion, puntualidad, resultado, volveria }
  comentario    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Un feedback por cita
CREATE UNIQUE INDEX feedback_citas_cita_id_idx ON feedback_citas (cita_id);

-- RLS
ALTER TABLE feedback_citas ENABLE ROW LEVEL SECURITY;

-- Admin/coordinador de la clínica puede leer
CREATE POLICY "feedback_select_clinica" ON feedback_citas
  FOR SELECT USING (clinica_id = auth_clinica_id());

-- Insert anónimo via cancel_token lookup (se valida en la API, no vía RLS)
CREATE POLICY "feedback_insert_service_role" ON feedback_citas
  FOR INSERT WITH CHECK (true);

-- Update comentario (cuando el paciente agrega comentario luego del rating)
CREATE POLICY "feedback_update_service_role" ON feedback_citas
  FOR UPDATE USING (true);
