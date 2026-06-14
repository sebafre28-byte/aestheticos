-- Get cita info by cancel_token without modifying anything (anon accessible)
CREATE OR REPLACE FUNCTION get_cita_por_token(p_token uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cita record;
BEGIN
  SELECT
    c.id,
    c.inicio,
    c.fin,
    c.estado,
    c.clinica_id,
    c.profesional_id,
    c.servicio_id,
    p.nombre   AS paciente_nombre,
    p.email    AS paciente_email,
    p.telefono AS paciente_telefono,
    s.nombre   AS servicio_nombre,
    s.duracion_minutos AS servicio_duracion,
    pr.nombre  AS profesional_nombre,
    cl.nombre  AS clinica_nombre,
    cl.email   AS clinica_email,
    cl.telefono AS clinica_telefono,
    cl.direccion AS clinica_direccion,
    cl.logo_url  AS clinica_logo_url
  INTO v_cita
  FROM citas c
  JOIN pacientes    p  ON p.id  = c.paciente_id
  JOIN servicios    s  ON s.id  = c.servicio_id
  JOIN profesionales pr ON pr.id = c.profesional_id
  JOIN clinicas     cl ON cl.id = c.clinica_id
  WHERE c.cancel_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Token inválido');
  END IF;

  RETURN json_build_object(
    'ok',                  true,
    'cita_id',             v_cita.id,
    'inicio',              to_char(v_cita.inicio AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'fin',                 to_char(v_cita.fin    AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'estado',              v_cita.estado,
    'clinica_id',          v_cita.clinica_id,
    'profesional_id',      v_cita.profesional_id,
    'servicio_id',         v_cita.servicio_id,
    'servicio_duracion',   v_cita.servicio_duracion,
    'paciente_nombre',     v_cita.paciente_nombre,
    'paciente_email',      v_cita.paciente_email,
    'paciente_telefono',   v_cita.paciente_telefono,
    'servicio_nombre',     v_cita.servicio_nombre,
    'profesional_nombre',  v_cita.profesional_nombre,
    'clinica_nombre',      v_cita.clinica_nombre,
    'clinica_email',       v_cita.clinica_email,
    'clinica_telefono',    v_cita.clinica_telefono,
    'clinica_direccion',   v_cita.clinica_direccion,
    'clinica_logo_url',    v_cita.clinica_logo_url
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_cita_por_token(uuid) TO anon;

-- Confirm a cita by token (patient self-confirmation)
CREATE OR REPLACE FUNCTION confirmar_cita_por_token(p_token uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cita record;
BEGIN
  SELECT c.id, c.estado INTO v_cita
  FROM citas c
  WHERE c.cancel_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Token inválido');
  END IF;

  IF v_cita.estado IN ('cancelada', 'completada', 'no_asistio') THEN
    RETURN json_build_object('ok', false, 'error', 'La cita ya no puede modificarse', 'estado', v_cita.estado);
  END IF;

  UPDATE citas SET estado = 'confirmada', updated_at = now() WHERE id = v_cita.id;

  RETURN json_build_object('ok', true, 'cita_id', v_cita.id);
END;
$$;

GRANT EXECUTE ON FUNCTION confirmar_cita_por_token(uuid) TO anon;

-- Reschedule a cita by token (patient self-service)
CREATE OR REPLACE FUNCTION reagendar_cita_por_token(
  p_token        uuid,
  p_nuevo_inicio timestamptz,
  p_nuevo_fin    timestamptz
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cita record;
  v_conflicto int;
BEGIN
  SELECT c.id, c.estado, c.clinica_id INTO v_cita
  FROM citas c
  WHERE c.cancel_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Token inválido');
  END IF;

  IF v_cita.estado IN ('cancelada', 'completada', 'no_asistio') THEN
    RETURN json_build_object('ok', false, 'error', 'La cita ya no puede modificarse');
  END IF;

  -- Check for conflicts (exclude this cita itself)
  SELECT COUNT(*) INTO v_conflicto
  FROM citas c2
  WHERE c2.clinica_id = v_cita.clinica_id
    AND c2.id <> v_cita.id
    AND c2.estado NOT IN ('cancelada', 'no_asistio')
    AND c2.inicio < p_nuevo_fin
    AND c2.fin    > p_nuevo_inicio;

  IF v_conflicto > 0 THEN
    RETURN json_build_object('ok', false, 'error', 'El horario seleccionado ya no está disponible');
  END IF;

  UPDATE citas
  SET inicio = p_nuevo_inicio, fin = p_nuevo_fin, estado = 'confirmada', updated_at = now()
  WHERE id = v_cita.id;

  RETURN json_build_object('ok', true, 'cita_id', v_cita.id);
END;
$$;

GRANT EXECUTE ON FUNCTION reagendar_cita_por_token(uuid, timestamptz, timestamptz) TO anon;
