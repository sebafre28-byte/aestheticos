-- Fix get_clinica_publica to include buffer_minutos in servicios
-- Fix get_slots_ocupados to include buffer_minutos for conflict detection

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
    'id', id,
    'nombre', nombre,
    'descripcion', descripcion,
    'duracion_minutos', duracion_minutos,
    'precio', precio,
    'color', color,
    'buffer_minutos', COALESCE(buffer_minutos, 0)
  ))
  INTO v_servicios FROM servicios WHERE clinica_id = v_clinica.id AND activo = true;

  SELECT json_agg(json_build_object('id', id, 'nombre', nombre, 'especialidad', especialidad, 'color', color))
  INTO v_profesionales FROM profesionales WHERE clinica_id = v_clinica.id AND activo = true;

  RETURN json_build_object(
    'id', v_clinica.id,
    'nombre', v_clinica.nombre,
    'telefono', v_clinica.telefono,
    'email', v_clinica.email,
    'direccion', v_clinica.direccion,
    'logo_url', v_clinica.logo_url,
    'configuracion', v_clinica.configuracion,
    'servicios', COALESCE(v_servicios, '[]'::json),
    'profesionales', COALESCE(v_profesionales, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_clinica_publica(text) TO anon;

-- Fix get_slots_ocupados to include buffer_minutos for proper overlap detection
CREATE OR REPLACE FUNCTION get_slots_ocupados(p_clinica_id uuid, p_fecha date, p_profesional_id uuid DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_slots json;
BEGIN
  SELECT json_agg(json_build_object(
    'inicio', inicio,
    'fin', fin,
    'profesional_id', profesional_id,
    'buffer_minutos', COALESCE(buffer_minutos, 0)
  ))
  INTO v_slots
  FROM citas
  WHERE clinica_id = p_clinica_id
    AND DATE(inicio AT TIME ZONE 'America/Santiago') = p_fecha
    AND estado NOT IN ('cancelada', 'no_asistio')
    AND (p_profesional_id IS NULL OR profesional_id = p_profesional_id);
  RETURN COALESCE(v_slots, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_slots_ocupados(uuid, date, uuid) TO anon;
