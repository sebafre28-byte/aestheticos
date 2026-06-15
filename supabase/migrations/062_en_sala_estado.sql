-- Add 'en_sala' to citas.estado check constraint
-- This represents a patient who has arrived and is waiting in the room

ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_estado_check;
ALTER TABLE citas ADD CONSTRAINT citas_estado_check
  CHECK (estado IN ('pendiente', 'confirmada', 'en_sala', 'completada', 'cancelada', 'no_asistio'));
