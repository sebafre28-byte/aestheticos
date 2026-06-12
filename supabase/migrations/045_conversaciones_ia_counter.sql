-- Contador de conversaciones IA usadas por mes
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS conv_ia_usadas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conv_ia_mes    text;  -- formato 'YYYY-MM'

-- Función atómica: verifica cupo, incrementa contador y retorna resultado
-- Resetea el contador automáticamente al cambiar de mes
CREATE OR REPLACE FUNCTION incrementar_conv_ia(p_clinica_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_sub        subscriptions%ROWTYPE;
  v_limite     integer;
  v_mes_actual text;
  v_permitido  boolean;
  v_nuevas     integer;
BEGIN
  v_mes_actual := to_char(now(), 'YYYY-MM');

  SELECT * INTO v_sub FROM subscriptions WHERE clinica_id = p_clinica_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('permitido', false, 'usadas', 0, 'limite', 0);
  END IF;

  -- Límite según plan
  CASE v_sub.plan
    WHEN 'free'    THEN v_limite := 0;
    WHEN 'pro'     THEN v_limite := 300;
    WHEN 'clinica' THEN v_limite := 1000;
    ELSE v_limite := 0;
  END CASE;

  -- Trial activo tiene límite del plan Pro (clinica)
  IF v_sub.estado = 'trial' AND (v_sub.trial_ends_at IS NULL OR v_sub.trial_ends_at > now()) THEN
    v_limite := 1000;
  END IF;

  -- Sin acceso en plan free
  IF v_limite = 0 THEN
    RETURN jsonb_build_object('permitido', false, 'usadas', v_sub.conv_ia_usadas, 'limite', 0);
  END IF;

  -- Resetear si cambió el mes
  IF v_sub.conv_ia_mes IS DISTINCT FROM v_mes_actual THEN
    v_sub.conv_ia_usadas := 0;
  END IF;

  v_permitido := v_sub.conv_ia_usadas < v_limite;
  v_nuevas    := CASE WHEN v_permitido THEN v_sub.conv_ia_usadas + 1 ELSE v_sub.conv_ia_usadas END;

  UPDATE subscriptions
  SET conv_ia_usadas = v_nuevas,
      conv_ia_mes    = v_mes_actual,
      updated_at     = now()
  WHERE clinica_id = p_clinica_id;

  RETURN jsonb_build_object(
    'permitido', v_permitido,
    'usadas',    v_nuevas,
    'limite',    v_limite
  );
END;
$$;

GRANT EXECUTE ON FUNCTION incrementar_conv_ia(uuid) TO authenticated, service_role;
