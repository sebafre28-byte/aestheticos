-- Fix: handle_new_user trigger was failing when email already exists in clinicas
-- (UNIQUE constraint on clinicas.email caused "Database error saving new user")
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

  -- Insert default trial subscription for new clinic
  INSERT INTO subscriptions (clinica_id, plan, estado)
  VALUES (v_clinica_id, 'free', 'trial')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
