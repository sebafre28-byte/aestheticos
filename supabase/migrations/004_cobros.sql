-- ============================================================
-- SimpliClinic — Cobros por cita
-- Migration: 004_cobros.sql
-- ============================================================

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS pago_monto integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pago_estado text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS pago_metodo text,
  ADD COLUMN IF NOT EXISTS pago_registrado_at timestamptz;

ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_pago_estado_check;
ALTER TABLE citas
  ADD CONSTRAINT citas_pago_estado_check CHECK (
    pago_estado IN ('pendiente', 'pagado', 'parcial')
  );

ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_pago_metodo_check;
ALTER TABLE citas
  ADD CONSTRAINT citas_pago_metodo_check CHECK (
    pago_metodo IS NULL OR pago_metodo IN ('efectivo', 'transferencia', 'debito', 'credito')
  );

ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_pago_monto_nonneg_check;
ALTER TABLE citas
  ADD CONSTRAINT citas_pago_monto_nonneg_check CHECK (pago_monto >= 0);

CREATE INDEX IF NOT EXISTS citas_pago_clinica_idx
  ON citas (clinica_id, pago_estado)
  WHERE pago_estado IN ('pagado', 'parcial');

-- Citas existentes: monto sugerido desde precio del servicio
UPDATE citas c
SET pago_monto = COALESCE(s.precio, 0)
FROM servicios s
WHERE s.id = c.servicio_id
  AND c.pago_monto = 0;
