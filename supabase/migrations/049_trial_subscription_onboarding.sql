-- Fix handle_new_user:
--   1. Use plan='free' (valid CHECK value; 'starter' was never valid)
--   2. Set trial_ends_at = now() + 7 days automatically on registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinica_id uuid;
BEGIN
  -- Invited users have 'rol' in metadata → skip, don't create a clinic
  IF NEW.raw_user_meta_data->>'rol' IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO clinicas (owner_id, nombre, telefono)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'clinica_nombre'), ''), 'Mi Clínica'),
    NEW.raw_user_meta_data->>'telefono'
  )
  RETURNING id INTO v_clinica_id;

  INSERT INTO subscriptions (clinica_id, plan, estado, trial_ends_at)
  VALUES (v_clinica_id, 'free', 'trial', now() + interval '7 days')
  ON CONFLICT DO NOTHING;

  INSERT INTO usuarios_clinica (clinica_id, user_id, rol, nombre, email, activo)
  VALUES (
    v_clinica_id,
    NEW.id,
    'admin',
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'nombre'), ''), NEW.email, 'Admin'),
    NEW.email,
    true
  )
  ON CONFLICT (clinica_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
