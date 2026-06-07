-- Add cancel_token to citas for patient self-cancellation
ALTER TABLE citas ADD COLUMN IF NOT EXISTS cancel_token uuid DEFAULT gen_random_uuid() NOT NULL;

-- Unique index for fast token lookup
CREATE UNIQUE INDEX IF NOT EXISTS citas_cancel_token_idx ON citas (cancel_token);

-- Public function to cancel a cita by token (anon accessible, SECURITY DEFINER)
-- Returns the cita data for the notification email, or null if not found / already cancelled
CREATE OR REPLACE FUNCTION cancelar_cita_por_token(p_token uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cita record;
BEGIN
  SELECT
    c.id,
    c.clinica_id,
    c.inicio,
    c.fin,
    c.estado,
    p.nombre   AS paciente_nombre,
    p.email    AS paciente_email,
    p.telefono AS paciente_telefono,
    s.nombre   AS servicio_nombre,
    pr.nombre  AS profesional_nombre,
    cl.nombre  AS clinica_nombre,
    cl.email   AS clinica_email,
    cl.telefono AS clinica_telefono,
    cl.direccion AS clinica_direccion,
    cl.logo_url  AS clinica_logo_url
  INTO v_cita
  FROM citas c
  JOIN pacientes   p  ON p.id  = c.paciente_id
  JOIN servicios   s  ON s.id  = c.servicio_id
  JOIN profesionales pr ON pr.id = c.profesional_id
  JOIN clinicas    cl ON cl.id = c.clinica_id
  WHERE c.cancel_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Token inválido');
  END IF;

  IF v_cita.estado IN ('cancelada', 'completada', 'no_asistio') THEN
    RETURN json_build_object('ok', false, 'error', 'La cita ya no puede cancelarse', 'estado', v_cita.estado);
  END IF;

  UPDATE citas SET estado = 'cancelada' WHERE id = v_cita.id;

  RETURN json_build_object(
    'ok',                true,
    'cita_id',           v_cita.id,
    'inicio',            to_char(v_cita.inicio AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'fin',               to_char(v_cita.fin    AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'paciente_nombre',   v_cita.paciente_nombre,
    'paciente_email',    v_cita.paciente_email,
    'paciente_telefono', v_cita.paciente_telefono,
    'servicio_nombre',   v_cita.servicio_nombre,
    'profesional_nombre',v_cita.profesional_nombre,
    'clinica_nombre',    v_cita.clinica_nombre,
    'clinica_email',     v_cita.clinica_email,
    'clinica_telefono',  v_cita.clinica_telefono,
    'clinica_direccion', v_cita.clinica_direccion,
    'clinica_logo_url',  v_cita.clinica_logo_url
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cancelar_cita_por_token(uuid) TO anon;
