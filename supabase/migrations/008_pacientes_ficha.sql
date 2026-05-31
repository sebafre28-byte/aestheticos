-- Add clinical fields to pacientes
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS genero      text CHECK (genero IN ('masculino','femenino','otro','prefiero_no_decir')),
  ADD COLUMN IF NOT EXISTS direccion   text,
  ADD COLUMN IF NOT EXISTS alergias    text,
  ADD COLUMN IF NOT EXISTS condiciones text;
