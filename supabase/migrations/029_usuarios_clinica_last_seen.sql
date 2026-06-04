ALTER TABLE usuarios_clinica
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
