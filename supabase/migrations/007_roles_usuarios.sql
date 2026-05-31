-- ============================================================
-- SimpliClinic — Roles de usuario por clínica
-- Migration: 007_roles_usuarios.sql
-- ============================================================

-- Tipo enum para roles
CREATE TYPE rol_usuario AS ENUM ('admin', 'profesional', 'recepcionista');

-- Tabla de miembros de clínica
CREATE TABLE IF NOT EXISTS usuarios_clinica (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id  uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rol         rol_usuario NOT NULL DEFAULT 'recepcionista',
  nombre      text NOT NULL,
  email       text,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_usuarios_clinica_clinica ON usuarios_clinica(clinica_id);
CREATE INDEX idx_usuarios_clinica_user   ON usuarios_clinica(user_id);
CREATE UNIQUE INDEX idx_usuarios_clinica_unique ON usuarios_clinica(clinica_id, user_id) WHERE user_id IS NOT NULL;

-- Actualizar auth_clinica_id para soportar usuarios miembro además del owner
CREATE OR REPLACE FUNCTION auth_clinica_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT id FROM clinicas WHERE owner_id = auth.uid() LIMIT 1),
    (SELECT clinica_id FROM usuarios_clinica WHERE user_id = auth.uid() AND activo = true LIMIT 1)
  );
$$;

-- Función para obtener el rol del usuario en su clínica
CREATE OR REPLACE FUNCTION auth_rol_usuario()
RETURNS rol_usuario LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM clinicas WHERE owner_id = auth.uid()) THEN 'admin'::rol_usuario
    ELSE (SELECT rol FROM usuarios_clinica WHERE user_id = auth.uid() AND activo = true LIMIT 1)
  END;
$$;

-- RLS en usuarios_clinica
ALTER TABLE usuarios_clinica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_clinica_select" ON usuarios_clinica
  FOR SELECT USING (clinica_id = auth_clinica_id());

CREATE POLICY "usuarios_clinica_insert" ON usuarios_clinica
  FOR INSERT WITH CHECK (
    clinica_id = auth_clinica_id()
    AND auth_rol_usuario() = 'admin'
  );

CREATE POLICY "usuarios_clinica_update" ON usuarios_clinica
  FOR UPDATE USING (
    clinica_id = auth_clinica_id()
    AND auth_rol_usuario() = 'admin'
  );

CREATE POLICY "usuarios_clinica_delete" ON usuarios_clinica
  FOR DELETE USING (
    clinica_id = auth_clinica_id()
    AND auth_rol_usuario() = 'admin'
  );

-- Migrar owners existentes como admin en la nueva tabla
INSERT INTO usuarios_clinica (clinica_id, user_id, rol, nombre, email)
SELECT
  c.id AS clinica_id,
  c.owner_id AS user_id,
  'admin'::rol_usuario AS rol,
  COALESCE(u.raw_user_meta_data->>'nombre', u.email, 'Admin') AS nombre,
  u.email
FROM clinicas c
JOIN auth.users u ON u.id = c.owner_id
ON CONFLICT DO NOTHING;
