-- Backfill: insertar owners existentes en usuarios_clinica si no están ya
-- Esto soluciona clínicas creadas antes de la corrección del trigger handle_new_user
INSERT INTO usuarios_clinica (clinica_id, user_id, rol, nombre, email, activo)
SELECT
  c.id AS clinica_id,
  c.owner_id AS user_id,
  'admin' AS rol,
  COALESCE(u.raw_user_meta_data->>'nombre', u.raw_user_meta_data->>'clinica_nombre', u.email, 'Admin') AS nombre,
  u.email,
  true AS activo
FROM clinicas c
JOIN auth.users u ON u.id = c.owner_id
ON CONFLICT (clinica_id, user_id) DO NOTHING;
