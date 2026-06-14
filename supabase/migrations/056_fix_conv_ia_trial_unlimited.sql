-- Fix incrementar_conv_ia: trial debe ser ilimitado (sin cap de 1000)
-- También resetear contador para clínicas en trial que puedan haber quedado bloqueadas

CREATE OR REPLACE FUNCTION incrementar_conv_ia(p_clinica_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_sub subscriptions%ROWTYPE;
  v_limite integer;
  v_mes_actual text;
  v_permitido boolean;
BEGIN
  v_mes_actual := to_char(now(), 'YYYY-MM');

  SELECT * INTO v_sub FROM subscriptions WHERE clinica_id = p_clinica_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('permitido', false, 'usadas', 0, 'limite', 0);
  END IF;

  -- Trial activo: acceso ilimitado, no contar contra cuota
  IF v_sub.estado = 'trial' AND (v_sub.trial_ends_at IS NULL OR v_sub.trial_ends_at > now()) THEN
    RETURN jsonb_build_object('permitido', true, 'usadas', 0, 'limite', -1);
  END IF;

  -- Determinar límite según plan
  CASE v_sub.plan
    WHEN 'free'    THEN v_limite := 0;
    WHEN 'pro'     THEN v_limite := 300;
    WHEN 'clinica' THEN v_limite := -1; -- ilimitado
    ELSE v_limite := 0;
  END CASE;

  -- Sin acceso (plan free fuera de trial)
  IF v_limite = 0 THEN
    RETURN jsonb_build_object('permitido', false, 'usadas', v_sub.conv_ia_usadas, 'limite', 0);
  END IF;

  -- Ilimitado (plan clinica)
  IF v_limite = -1 THEN
    UPDATE subscriptions SET conv_ia_usadas = conv_ia_usadas + 1, conv_ia_mes = v_mes_actual
    WHERE clinica_id = p_clinica_id;
    RETURN jsonb_build_object('permitido', true, 'usadas', v_sub.conv_ia_usadas + 1, 'limite', -1);
  END IF;

  -- Resetear contador si es un nuevo mes
  IF v_sub.conv_ia_mes IS DISTINCT FROM v_mes_actual THEN
    UPDATE subscriptions
    SET conv_ia_usadas = 0, conv_ia_mes = v_mes_actual
    WHERE clinica_id = p_clinica_id;
    v_sub.conv_ia_usadas := 0;
  END IF;

  -- Verificar cupo (plan pro: 300/mes)
  v_permitido := v_sub.conv_ia_usadas < v_limite;

  IF v_permitido THEN
    UPDATE subscriptions SET conv_ia_usadas = conv_ia_usadas + 1, conv_ia_mes = v_mes_actual
    WHERE clinica_id = p_clinica_id;
  END IF;

  RETURN jsonb_build_object(
    'permitido', v_permitido,
    'usadas', CASE WHEN v_permitido THEN v_sub.conv_ia_usadas + 1 ELSE v_sub.conv_ia_usadas END,
    'limite', v_limite
  );
END;
$$;

GRANT EXECUTE ON FUNCTION incrementar_conv_ia(uuid) TO authenticated, service_role;

-- Resetear contador de clínicas en trial para desbloquear el agente
UPDATE subscriptions
SET conv_ia_usadas = 0
WHERE estado = 'trial'
  AND (trial_ends_at IS NULL OR trial_ends_at > now());
