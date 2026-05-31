-- Agrega sitio_web a clinicas; logo_url ya puede existir, se usa IF NOT EXISTS
ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS sitio_web text,
  ADD COLUMN IF NOT EXISTS logo_url  text;
