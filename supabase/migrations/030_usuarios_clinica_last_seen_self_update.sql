-- Permite a cualquier usuario autenticado actualizar su propio last_seen_at
-- sin necesitar rol admin.
CREATE POLICY "usuarios_clinica_self_update_last_seen"
  ON usuarios_clinica
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
