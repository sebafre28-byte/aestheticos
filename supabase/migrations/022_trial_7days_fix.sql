-- Fix trial_ends_at para subscriptions existentes sin fecha de vencimiento
-- y cambiar duración del trial a 7 días

-- 1. Parchear subscriptions existentes que tienen trial_ends_at NULL
UPDATE subscriptions
SET trial_ends_at = created_at + INTERVAL '7 days'
WHERE estado = 'trial' AND trial_ends_at IS NULL;

-- 2. Agregar DEFAULT para nuevas inserciones
ALTER TABLE subscriptions
  ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '7 days');

-- 3. Actualizar trigger handle_new_user para que setee trial_ends_at explícitamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinica_id uuid;
BEGIN
  INSERT INTO clinicas (owner_id, nombre, telefono, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'clinica_nombre', 'Mi Clínica'),
    NEW.raw_user_meta_data->>'telefono',
    NEW.email
  )
  ON CONFLICT (email) DO UPDATE
    SET owner_id = EXCLUDED.owner_id,
        nombre   = EXCLUDED.nombre
  RETURNING id INTO v_clinica_id;

  INSERT INTO subscriptions (clinica_id, plan, estado, trial_ends_at)
  VALUES (v_clinica_id, 'free', 'trial', NOW() + INTERVAL '7 days')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
