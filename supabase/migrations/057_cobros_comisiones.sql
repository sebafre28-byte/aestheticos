-- Migration 057: Comisiones de profesionales y cierre de caja

-- Comisión configurable por profesional (%)
ALTER TABLE profesionales
  ADD COLUMN IF NOT EXISTS comision_porcentaje numeric(5,2) NOT NULL DEFAULT 0
    CHECK (comision_porcentaje >= 0 AND comision_porcentaje <= 100);

-- Comisión calculada al registrar cobro (monto en CLP entero)
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS comision_monto integer NOT NULL DEFAULT 0;

-- Tabla de cierres de caja diarios
CREATE TABLE IF NOT EXISTS cierres_caja (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id    uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  fecha         date NOT NULL,
  total         integer NOT NULL DEFAULT 0,
  efectivo      integer NOT NULL DEFAULT 0,
  transferencia integer NOT NULL DEFAULT 0,
  debito        integer NOT NULL DEFAULT 0,
  credito       integer NOT NULL DEFAULT 0,
  cerrado_por   uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinica_id, fecha)
);

ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cierres_caja_clinica" ON cierres_caja
  USING (clinica_id = auth_clinica_id());

CREATE POLICY "cierres_caja_insert" ON cierres_caja
  FOR INSERT WITH CHECK (clinica_id = auth_clinica_id());

CREATE POLICY "cierres_caja_update" ON cierres_caja
  FOR UPDATE USING (clinica_id = auth_clinica_id());
