-- Strengthen RLS on bloqueos: ensure profesional_id belongs to the same clinica
-- profesional_id references profesionales(id), which has its own clinica_id column

DROP POLICY IF EXISTS "clinica_bloqueos" ON bloqueos;

CREATE POLICY "bloqueos_clinica_policy" ON bloqueos
  FOR ALL USING (clinica_id = auth_clinica_id())
  WITH CHECK (
    clinica_id = auth_clinica_id() AND
    EXISTS (
      SELECT 1 FROM profesionales
      WHERE id = profesional_id
        AND clinica_id = auth_clinica_id()
    )
  );
