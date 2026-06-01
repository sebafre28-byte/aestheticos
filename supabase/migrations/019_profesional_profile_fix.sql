-- Ejecutar esto en Supabase SQL Editor
-- Paso 1: Columnas nuevas en profesionales (IF NOT EXISTS es seguro si ya corrió)
ALTER TABLE profesionales ADD COLUMN IF NOT EXISTS foto_url text;
ALTER TABLE profesionales ADD COLUMN IF NOT EXISTS bio text;

-- Paso 2: Tabla junction (IF NOT EXISTS es seguro)
CREATE TABLE IF NOT EXISTS profesional_servicios (
  profesional_id uuid NOT NULL REFERENCES profesionales ON DELETE CASCADE,
  servicio_id    uuid NOT NULL REFERENCES servicios ON DELETE CASCADE,
  PRIMARY KEY (profesional_id, servicio_id)
);

-- Paso 3: RLS
ALTER TABLE profesional_servicios ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores si existen (por si corrió parcialmente antes)
DROP POLICY IF EXISTS "clinica_own_profesional_servicios" ON profesional_servicios;
DROP POLICY IF EXISTS "anon_read_profesional_servicios" ON profesional_servicios;

-- Política correcta usando auth_clinica_id() (igual que el resto del proyecto)
CREATE POLICY "clinica_own_profesional_servicios" ON profesional_servicios
  FOR ALL
  USING (
    profesional_id IN (
      SELECT id FROM profesionales WHERE clinica_id = auth_clinica_id()
    )
  )
  WITH CHECK (
    profesional_id IN (
      SELECT id FROM profesionales WHERE clinica_id = auth_clinica_id()
    )
  );

-- Lectura anónima para el book público
CREATE POLICY "anon_read_profesional_servicios" ON profesional_servicios
  FOR SELECT USING (true);

-- Paso 4: Actualizar get_clinica_publica para incluir foto, bio y servicios del profesional
CREATE OR REPLACE FUNCTION get_clinica_publica(p_slug text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_clinica record; v_servicios json; v_profesionales json;
BEGIN
  SELECT id, nombre, telefono, email, direccion, logo_url, configuracion
  INTO v_clinica FROM clinicas WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT json_agg(json_build_object(
    'id', id, 'nombre', nombre, 'descripcion', descripcion,
    'duracion_minutos', duracion_minutos, 'precio', precio, 'color', color,
    'buffer_minutos', COALESCE(buffer_minutos, 0)
  ))
  INTO v_servicios FROM servicios WHERE clinica_id = v_clinica.id AND activo = true;

  SELECT json_agg(json_build_object(
    'id', p.id, 'nombre', p.nombre, 'especialidad', p.especialidad,
    'color', p.color, 'foto_url', p.foto_url, 'bio', p.bio,
    'servicios_ids', COALESCE((
      SELECT json_agg(ps.servicio_id)
      FROM profesional_servicios ps WHERE ps.profesional_id = p.id
    ), '[]'::json)
  ))
  INTO v_profesionales FROM profesionales p
  WHERE p.clinica_id = v_clinica.id AND p.activo = true;

  RETURN json_build_object(
    'id', v_clinica.id, 'nombre', v_clinica.nombre, 'telefono', v_clinica.telefono,
    'email', v_clinica.email, 'direccion', v_clinica.direccion, 'logo_url', v_clinica.logo_url,
    'configuracion', v_clinica.configuracion,
    'servicios', COALESCE(v_servicios, '[]'::json),
    'profesionales', COALESCE(v_profesionales, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_clinica_publica(text) TO anon;
