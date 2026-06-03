-- Mejora auth_profesional_id() con fallback por email.
-- Si usuarios_clinica.profesional_id está explícito → úsalo.
-- Si no → busca un profesional activo en la misma clínica con el mismo email del usuario auth.

CREATE OR REPLACE FUNCTION auth_profesional_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT profesional_id
     FROM usuarios_clinica
     WHERE user_id = auth.uid() AND activo = true AND profesional_id IS NOT NULL
     LIMIT 1),
    (SELECT p.id
     FROM profesionales p
     JOIN usuarios_clinica uc ON uc.clinica_id = p.clinica_id
     WHERE uc.user_id = auth.uid() AND uc.activo = true
       AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
       AND p.activo = true
     LIMIT 1)
  );
$$;
