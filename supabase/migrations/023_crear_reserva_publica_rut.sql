-- Actualizar crear_reserva_publica para soportar RUT opcional
-- Busca paciente por RUT primero (si se ingresó), luego por teléfono.
-- Si el paciente encontrado no tiene RUT, lo actualiza.
CREATE OR REPLACE FUNCTION crear_reserva_publica(
  p_clinica_id uuid,
  p_servicio_id uuid,
  p_profesional_id uuid,
  p_inicio timestamptz,
  p_fin timestamptz,
  p_paciente_nombre text,
  p_paciente_telefono text,
  p_paciente_email text DEFAULT NULL,
  p_notas text DEFAULT NULL,
  p_paciente_rut text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_paciente_id uuid; v_cita_id uuid;
BEGIN
  -- Buscar paciente por RUT si fue ingresado
  IF p_paciente_rut IS NOT NULL AND p_paciente_rut <> '' THEN
    SELECT id INTO v_paciente_id FROM pacientes
    WHERE clinica_id = p_clinica_id AND rut = p_paciente_rut LIMIT 1;
  END IF;

  -- Si no encontró por RUT, buscar por teléfono
  IF v_paciente_id IS NULL THEN
    SELECT id INTO v_paciente_id FROM pacientes
    WHERE clinica_id = p_clinica_id AND telefono = p_paciente_telefono LIMIT 1;
  END IF;

  -- Crear paciente si no existe
  IF v_paciente_id IS NULL THEN
    INSERT INTO pacientes (clinica_id, nombre, telefono, email, rut)
    VALUES (p_clinica_id, p_paciente_nombre, p_paciente_telefono, p_paciente_email, p_paciente_rut)
    RETURNING id INTO v_paciente_id;
  ELSIF p_paciente_rut IS NOT NULL AND p_paciente_rut <> '' THEN
    -- Actualizar RUT si el paciente existente no lo tiene
    UPDATE pacientes SET rut = p_paciente_rut
    WHERE id = v_paciente_id AND (rut IS NULL OR rut = '');
  END IF;

  -- Verificar que el slot sigue disponible
  IF EXISTS (
    SELECT 1 FROM citas
    WHERE clinica_id = p_clinica_id
      AND profesional_id = p_profesional_id
      AND estado NOT IN ('cancelada', 'no_asistio')
      AND tstzrange(inicio, fin) && tstzrange(p_inicio, p_fin)
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'El horario ya no está disponible');
  END IF;

  -- Crear cita
  INSERT INTO citas (clinica_id, paciente_id, profesional_id, servicio_id, inicio, fin, estado, notas)
  VALUES (p_clinica_id, v_paciente_id, p_profesional_id, p_servicio_id, p_inicio, p_fin, 'pendiente', p_notas)
  RETURNING id INTO v_cita_id;

  RETURN json_build_object('ok', true, 'cita_id', v_cita_id);
END;
$$;

-- Revocar y regresar el permiso con la nueva firma
REVOKE EXECUTE ON FUNCTION crear_reserva_publica(uuid, uuid, uuid, timestamptz, timestamptz, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION crear_reserva_publica(uuid, uuid, uuid, timestamptz, timestamptz, text, text, text, text, text) TO anon;
