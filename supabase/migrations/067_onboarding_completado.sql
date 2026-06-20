-- Agrega flag para saber si la clínica completó el wizard de onboarding.
-- Una vez true, nunca se vuelve a mostrar el wizard.
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS onboarding_completado boolean NOT NULL DEFAULT false;
