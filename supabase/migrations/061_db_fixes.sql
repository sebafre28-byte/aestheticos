-- ─────────────────────────────────────────────────────────────────
-- 061 — DB fixes: conflict check + missing indexes
-- ─────────────────────────────────────────────────────────────────

-- Fix: reagendar_cita_por_token was checking conflicts by clinica_id only,
-- allowing double-booking with another patient of the SAME profesional.
-- Now it also filters by profesional_id.
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
  SELECT c.id, c.estado, c.clinica_id, c.profesional_id INTO v_cita
  FROM citas c
  WHERE c.cancel_token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Token inválido');
  END IF;

  IF v_cita.estado IN ('cancelada', 'completada', 'no_asistio') THEN
    RETURN json_build_object('ok', false, 'error', 'La cita ya no puede modificarse');
  END IF;

  -- Check for conflicts on the same profesional (not just same clinic)
  SELECT COUNT(*) INTO v_conflicto
  FROM citas c2
  WHERE c2.profesional_id = v_cita.profesional_id
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

-- ─── Missing indexes ──────────────────────────────────────────────

-- For cron deduplication queries (very frequent)
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_clinica_created
  ON whatsapp_logs(clinica_id, created_at);

-- For inbox thread loading
CREATE INDEX IF NOT EXISTS idx_mensajes_inbox_conv_created
  ON mensajes_inbox(conversacion_id, created_at);

-- For consentimiento queries by clinic
CREATE INDEX IF NOT EXISTS idx_consentimiento_sol_clinica
  ON consentimiento_solicitudes(clinica_id);

-- For active paquetes lookup per patient
CREATE INDEX IF NOT EXISTS idx_paquetes_vendidos_paciente_paquete
  ON paquetes_vendidos(paciente_id, paquete_id);
