-- Contador de conversaciones IA usadas en el mes actual
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS conv_ia_usadas    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conv_ia_mes       text;   -- formato 'YYYY-MM', para resetear mensualmente

-- Función que incrementa el contador y retorna si se puede usar el agente
-- Retorna: { permitido: bool, usadas: int, limite: int }
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
  
  -- Determinar límite según plan
  CASE v_sub.plan
    WHEN 'free'    THEN v_limite := 0;
    WHEN 'pro'     THEN v_limite := 300;
    WHEN 'clinica' THEN v_limite := 1000;
    ELSE v_limite := 0;
  END CASE;
  
  -- Trial tiene límite del plan clinica
  IF v_sub.estado = 'trial' AND (v_sub.trial_ends_at IS NULL OR v_sub.trial_ends_at > now()) THEN
    v_limite := 1000;
  END IF;
  
  -- Resetear contador si es un nuevo mes
  IF v_sub.conv_ia_mes IS DISTINCT FROM v_mes_actual THEN
    UPDATE subscriptions 
    SET conv_ia_usadas = 0, conv_ia_mes = v_mes_actual
    WHERE clinica_id = p_clinica_id;
    v_sub.conv_ia_usadas := 0;
    v_sub.conv_ia_mes := v_mes_actual;
  END IF;
  
  -- Sin límite (plan clinica activo) = siempre permitido
  IF v_limite = -1 OR v_limite = 1000 AND v_sub.plan = 'clinica' THEN
    UPDATE subscriptions SET conv_ia_usadas = conv_ia_usadas + 1, conv_ia_mes = v_mes_actual
    WHERE clinica_id = p_clinica_id;
    RETURN jsonb_build_object('permitido', true, 'usadas', v_sub.conv_ia_usadas + 1, 'limite', v_limite);
  END IF;
  
  -- Sin acceso (plan free)
  IF v_limite = 0 THEN
    RETURN jsonb_build_object('permitido', false, 'usadas', v_sub.conv_ia_usadas, 'limite', 0);
  END IF;
  
  -- Verificar si hay cupo
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

-- Grant para que el agente pueda llamar la función
GRANT EXECUTE ON FUNCTION incrementar_conv_ia(uuid) TO authenticated, service_role;
