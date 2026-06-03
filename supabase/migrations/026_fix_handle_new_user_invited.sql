-- Fix: handle_new_user no debe crear clínica para usuarios invitados.
-- Usuarios invitados tienen 'rol' en raw_user_meta_data (recepcionista/profesional).
-- Solo owners (registro normal) deben obtener una clínica automáticamente.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinica_id uuid;
BEGIN
  -- Usuarios invitados: tienen rol en metadata → no crear clínica propia
  IF NEW.raw_user_meta_data->>'rol' IS NOT NULL THEN
    RETURN NEW;
  END IF;

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

  INSERT INTO subscriptions (clinica_id, plan, estado)
  VALUES (v_clinica_id, 'free', 'trial')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
