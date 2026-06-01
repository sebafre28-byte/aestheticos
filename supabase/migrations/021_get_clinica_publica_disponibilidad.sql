-- Añadir disponibilidad semanal de cada profesional a get_clinica_publica
-- Para que el book pueda bloquear días sin horario del profesional
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
    ), '[]'::json),
    'disponibilidad', COALESCE((
      SELECT json_agg(json_build_object(
        'dia_semana', d.dia_semana,
        'hora_inicio', d.hora_inicio,
        'hora_fin', d.hora_fin,
        'activo', d.activo
      ))
      FROM agenda_disponibilidad d WHERE d.profesional_id = p.id AND d.activo = true
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
