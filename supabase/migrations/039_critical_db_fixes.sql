-- Critical DB fixes for production readiness

-- 1. Fix subscriptions plan check (was rejecting 'starter', causing ALL new registrations to fail)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'starter', 'pro', 'clinica'));

-- 2. Remove email unique constraint from clinicas (breaks invited users with same email as owner)
ALTER TABLE clinicas DROP CONSTRAINT IF EXISTS clinicas_email_key;

-- 3. Fix auth_clinica_id() to be deterministic (add ORDER BY to prevent random results)
CREATE OR REPLACE FUNCTION auth_clinica_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinica_id
  FROM usuarios_clinica
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- 4. Google Calendar tokens: ensure required columns exist
DO $$
BEGIN
  -- Rename expires_at to token_expiry if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_tokens' AND column_name = 'expires_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_tokens' AND column_name = 'token_expiry'
  ) THEN
    ALTER TABLE google_calendar_tokens RENAME COLUMN expires_at TO token_expiry;
  END IF;

  -- Add token_expiry if missing entirely
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_tokens' AND column_name = 'token_expiry'
  ) THEN
    ALTER TABLE google_calendar_tokens ADD COLUMN token_expiry timestamptz;
  END IF;

  -- Add calendar_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_tokens' AND column_name = 'calendar_id'
  ) THEN
    ALTER TABLE google_calendar_tokens ADD COLUMN calendar_id text;
  END IF;

  -- Add scope if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_tokens' AND column_name = 'scope'
  ) THEN
    ALTER TABLE google_calendar_tokens ADD COLUMN scope text;
  END IF;

  -- Add sync_mode if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_tokens' AND column_name = 'sync_mode'
  ) THEN
    ALTER TABLE google_calendar_tokens ADD COLUMN sync_mode text DEFAULT 'push_only';
  END IF;
END$$;

-- 5. Google Calendar events: ensure required columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_events' AND column_name = 'token_id'
  ) THEN
    ALTER TABLE google_calendar_events ADD COLUMN token_id uuid REFERENCES google_calendar_tokens(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_events' AND column_name = 'clinica_id'
  ) THEN
    ALTER TABLE google_calendar_events ADD COLUMN clinica_id uuid REFERENCES clinicas(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_events' AND column_name = 'calendar_id'
  ) THEN
    ALTER TABLE google_calendar_events ADD COLUMN calendar_id text;
  END IF;
END$$;

-- 6. Add RLS policies for subscriptions (currently missing INSERT/UPDATE/DELETE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'subscriptions_insert_own'
  ) THEN
    CREATE POLICY subscriptions_insert_own ON subscriptions
      FOR INSERT WITH CHECK (clinica_id = auth_clinica_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'subscriptions_update_own'
  ) THEN
    CREATE POLICY subscriptions_update_own ON subscriptions
      FOR UPDATE USING (clinica_id = auth_clinica_id());
  END IF;
END$$;

-- 7. Fix crear_reserva_publica search_path for security
CREATE OR REPLACE FUNCTION crear_reserva_publica(
  p_clinica_id uuid,
  p_profesional_id uuid,
  p_servicio_id uuid,
  p_inicio timestamptz,
  p_nombre text,
  p_email text,
  p_telefono text,
  p_rut text DEFAULT NULL,
  p_notas text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duracion integer;
  v_fin timestamptz;
  v_paciente_id uuid;
  v_cita_id uuid;
  v_cancel_token uuid;
BEGIN
  -- Get service duration
  SELECT duracion INTO v_duracion
  FROM servicios
  WHERE id = p_servicio_id AND clinica_id = p_clinica_id AND activo = true;

  IF v_duracion IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'servicio_no_encontrado');
  END IF;

  v_fin := p_inicio + (v_duracion || ' minutes')::interval;

  -- Check for conflicts
  IF EXISTS (
    SELECT 1 FROM citas
    WHERE profesional_id = p_profesional_id
      AND estado NOT IN ('cancelada', 'no_asistio')
      AND tsrange(inicio::timestamptz, fin::timestamptz, '[)') && tsrange(p_inicio, v_fin, '[)')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'conflicto_horario');
  END IF;

  -- Upsert patient
  INSERT INTO pacientes (clinica_id, nombre, email, telefono, rut)
  VALUES (p_clinica_id, p_nombre, p_email, p_telefono, p_rut)
  ON CONFLICT (clinica_id, email) WHERE email IS NOT NULL
  DO UPDATE SET nombre = EXCLUDED.nombre, telefono = COALESCE(EXCLUDED.telefono, pacientes.telefono)
  RETURNING id INTO v_paciente_id;

  IF v_paciente_id IS NULL THEN
    SELECT id INTO v_paciente_id FROM pacientes
    WHERE clinica_id = p_clinica_id AND email = p_email;
  END IF;

  -- Generate cancel token
  v_cancel_token := gen_random_uuid();

  -- Create appointment
  INSERT INTO citas (clinica_id, profesional_id, servicio_id, paciente_id, inicio, fin, estado, notas, cancel_token)
  VALUES (p_clinica_id, p_profesional_id, p_servicio_id, v_paciente_id, p_inicio, v_fin, 'pendiente', p_notas, v_cancel_token)
  RETURNING id INTO v_cita_id;

  RETURN jsonb_build_object('ok', true, 'cita_id', v_cita_id, 'cancel_token', v_cancel_token);
END;
$$;

-- 8. Fix cancelar_cita_por_token search_path
CREATE OR REPLACE FUNCTION cancelar_cita_por_token(p_cancel_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cita_id uuid;
  v_estado text;
BEGIN
  SELECT id, estado INTO v_cita_id, v_estado
  FROM citas
  WHERE cancel_token = p_cancel_token;

  IF v_cita_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token_invalido');
  END IF;

  IF v_estado = 'cancelada' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ya_cancelada');
  END IF;

  UPDATE citas SET estado = 'cancelada' WHERE id = v_cita_id;

  RETURN jsonb_build_object('ok', true, 'cita_id', v_cita_id);
END;
$$;

-- 9. Add RLS to profesional_servicios for anonymous booking reads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profesional_servicios' AND policyname = 'profesional_servicios_anon_select'
  ) THEN
    CREATE POLICY profesional_servicios_anon_select ON profesional_servicios
      FOR SELECT USING (true);
  END IF;
END$$;
