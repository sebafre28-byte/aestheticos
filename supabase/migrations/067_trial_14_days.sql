-- Cambiar trial de 7 a 14 días
-- Aplica para nuevas clínicas (trigger handle_new_user)
-- Las clínicas existentes en trial NO se ven afectadas por esta migración

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clinica_id uuid;
BEGIN
  -- Crear clínica
  INSERT INTO clinicas (owner_id, nombre, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_clinica', 'Mi Clínica'),
    NEW.email
  )
  RETURNING id INTO v_clinica_id;

  -- Vincular usuario como admin
  INSERT INTO usuarios_clinica (user_id, clinica_id, rol)
  VALUES (NEW.id, v_clinica_id, 'admin');

  -- Crear suscripción trial de 14 días
  INSERT INTO subscriptions (clinica_id, plan, estado, trial_ends_at)
  VALUES (v_clinica_id, 'free', 'trial', now() + interval '14 days');

  RETURN NEW;
END;
$$;
