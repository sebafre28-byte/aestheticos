-- ============================================================
-- SimpliClinic — Vincular auth user con perfil profesional
-- Migration: 025_profesional_user_link.sql
-- ============================================================

-- 1. Agregar profesional_id en usuarios_clinica
ALTER TABLE usuarios_clinica
  ADD COLUMN IF NOT EXISTS profesional_id uuid REFERENCES profesionales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_clinica_profesional ON usuarios_clinica(profesional_id);

-- 2. Función para obtener el profesional_id del usuario autenticado
CREATE OR REPLACE FUNCTION auth_profesional_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT profesional_id
  FROM usuarios_clinica
  WHERE user_id = auth.uid() AND activo = true
  LIMIT 1;
$$;

-- 3. Actualizar auth_rol_usuario para reflejar label coordinador en metadata
--    (el enum sigue siendo recepcionista en DB, solo cambia el label en UI)
--    No se modifica el enum para evitar riesgos de migración.
