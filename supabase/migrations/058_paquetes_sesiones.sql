-- Migration 058: Paquetes de sesiones

CREATE TABLE IF NOT EXISTS paquetes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id      uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  servicio_id     uuid NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  sesiones_total  integer NOT NULL CHECK (sesiones_total > 0),
  precio          integer NOT NULL DEFAULT 0,
  activo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE paquetes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paquetes_clinica" ON paquetes
  USING (clinica_id = auth_clinica_id());

CREATE POLICY "paquetes_insert" ON paquetes
  FOR INSERT WITH CHECK (clinica_id = auth_clinica_id());

CREATE POLICY "paquetes_update" ON paquetes
  FOR UPDATE USING (clinica_id = auth_clinica_id());

CREATE TABLE IF NOT EXISTS paquetes_vendidos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id      uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paquete_id      uuid NOT NULL REFERENCES paquetes(id) ON DELETE RESTRICT,
  paciente_id     uuid NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  sesiones_total  integer NOT NULL,
  sesiones_usadas integer NOT NULL DEFAULT 0,
  precio_pagado   integer NOT NULL DEFAULT 0,
  activo          boolean NOT NULL DEFAULT true,
  vendido_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  notas           text
);

ALTER TABLE paquetes_vendidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paquetes_vendidos_clinica" ON paquetes_vendidos
  USING (clinica_id = auth_clinica_id());

CREATE POLICY "paquetes_vendidos_insert" ON paquetes_vendidos
  FOR INSERT WITH CHECK (clinica_id = auth_clinica_id());

CREATE POLICY "paquetes_vendidos_update" ON paquetes_vendidos
  FOR UPDATE USING (clinica_id = auth_clinica_id());

-- Column en citas para registrar qué paquete_vendido se usó
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS paquete_vendido_id uuid REFERENCES paquetes_vendidos(id);

CREATE INDEX IF NOT EXISTS idx_paquetes_vendidos_paciente ON paquetes_vendidos(paciente_id, activo);
CREATE INDEX IF NOT EXISTS idx_paquetes_clinica ON paquetes(clinica_id, activo);
