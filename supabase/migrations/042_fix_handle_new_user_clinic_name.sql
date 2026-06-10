-- Fix: handle_new_user must NOT use ON CONFLICT (email) since clinicas_email_key was dropped.
-- Also ensures clinic name from registration metadata is used correctly.
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

  INSERT INTO subscriptions (clinica_id, plan, estado)
  VALUES (v_clinica_id, 'starter', 'trial')
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
