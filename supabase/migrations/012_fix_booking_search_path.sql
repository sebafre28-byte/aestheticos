-- Fix: SECURITY DEFINER functions need explicit search_path to find tables
-- when called by the anon role in Supabase

CREATE OR REPLACE FUNCTION get_clinica_publica(p_slug text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_clinica record; v_servicios json; v_profesionales json;
BEGIN
  SELECT id, nombre, telefono, email, direccion, logo_url, configuracion
  INTO v_clinica FROM clinicas WHERE slug = p_slug;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT json_agg(json_build_object('id', id, 'nombre', nombre, 'descripcion', descripcion, 'duracion_minutos', duracion_minutos, 'precio', precio, 'color', color))
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

CREATE OR REPLACE FUNCTION get_slots_ocupados(p_clinica_id uuid, p_fecha date, p_profesional_id uuid DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_slots json;
BEGIN
  SELECT json_agg(json_build_object('inicio', inicio, 'fin', fin, 'profesional_id', profesional_id))
  INTO v_slots
  FROM citas
  WHERE clinica_id = p_clinica_id
    AND DATE(inicio AT TIME ZONE 'America/Santiago') = p_fecha
    AND estado NOT IN ('cancelada', 'no_asistio')
    AND (p_profesional_id IS NULL OR profesional_id = p_profesional_id);
  RETURN COALESCE(v_slots, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION crear_reserva_publica(
  p_clinica_id uuid,
  p_servicio_id uuid,
  p_profesional_id uuid,
  p_inicio timestamptz,
  p_fin timestamptz,
  p_paciente_nombre text,
  p_paciente_telefono text,
  p_paciente_email text DEFAULT NULL,
  p_notas text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_paciente_id uuid; v_cita_id uuid;
BEGIN
  SELECT id INTO v_paciente_id FROM pacientes
  WHERE clinica_id = p_clinica_id AND telefono = p_paciente_telefono LIMIT 1;

  IF v_paciente_id IS NULL THEN
    INSERT INTO pacientes (clinica_id, nombre, telefono, email)
    VALUES (p_clinica_id, p_paciente_nombre, p_paciente_telefono, p_paciente_email)
    RETURNING id INTO v_paciente_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM citas
    WHERE clinica_id = p_clinica_id
      AND profesional_id = p_profesional_id
      AND estado NOT IN ('cancelada', 'no_asistio')
      AND tstzrange(inicio, fin) && tstzrange(p_inicio, p_fin)
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'El horario ya no está disponible');
  END IF;

  INSERT INTO citas (clinica_id, paciente_id, profesional_id, servicio_id, inicio, fin, estado, notas)
  VALUES (p_clinica_id, v_paciente_id, p_profesional_id, p_servicio_id, p_inicio, p_fin, 'pendiente', p_notas)
  RETURNING id INTO v_cita_id;

  RETURN json_build_object('ok', true, 'cita_id', v_cita_id);
END;
$$;

-- Re-grant in case recreating functions dropped grants
GRANT EXECUTE ON FUNCTION get_clinica_publica(text) TO anon;
GRANT EXECUTE ON FUNCTION get_slots_ocupados(uuid, date, uuid) TO anon;
GRANT EXECUTE ON FUNCTION crear_reserva_publica(uuid, uuid, uuid, timestamptz, timestamptz, text, text, text, text) TO anon;

-- Also ensure slug exists for any clinic missing it
UPDATE clinicas
SET slug = lower(regexp_replace(trim(nombre), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(id::text, 1, 6)
WHERE slug IS NULL;
