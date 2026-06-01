-- B3: Buffer entre citas — agrega buffer_minutos a la tabla servicios
ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS buffer_minutos int NOT NULL DEFAULT 0
    CHECK (buffer_minutos >= 0 AND buffer_minutos <= 120);
