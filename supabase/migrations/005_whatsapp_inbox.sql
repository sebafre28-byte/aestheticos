-- ============================================================
-- SimpliClinic — WhatsApp Inbox (Fase 2)
-- Migration: 005_whatsapp_inbox.sql
-- ============================================================

-- ─── conversaciones ──────────────────────────────────────────
-- Una conversación = un hilo con un número de teléfono externo.
-- Se asocia a un paciente si el número coincide con uno registrado.

CREATE TABLE IF NOT EXISTS conversaciones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id      uuid NOT NULL REFERENCES clinicas ON DELETE CASCADE,
  paciente_id     uuid REFERENCES pacientes ON DELETE SET NULL,
  telefono        text NOT NULL,
  estado          text NOT NULL DEFAULT 'activa',
  asignado_a      uuid REFERENCES profesionales ON DELETE SET NULL,
  ultimo_mensaje_at timestamptz NOT NULL DEFAULT now(),
  no_leidos       integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT conversaciones_estado_check CHECK (
    estado IN ('activa', 'archivada', 'spam')
  ),
  CONSTRAINT conversaciones_no_leidos_nonneg CHECK (no_leidos >= 0),
  -- Un número solo tiene una conversación activa por clínica
  CONSTRAINT conversaciones_clinica_telefono_unique UNIQUE (clinica_id, telefono)
);

-- ─── mensajes_inbox ──────────────────────────────────────────
-- Cada mensaje dentro de una conversación.
-- direccion=entrante: paciente → clínica
-- direccion=saliente: clínica/bot → paciente

CREATE TABLE IF NOT EXISTS mensajes_inbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id uuid NOT NULL REFERENCES conversaciones ON DELETE CASCADE,
  clinica_id      uuid NOT NULL REFERENCES clinicas ON DELETE CASCADE,
  direccion       text NOT NULL,
  contenido       text NOT NULL,
  tipo            text NOT NULL DEFAULT 'texto',
  estado_whatsapp text NOT NULL DEFAULT 'enviado',
  wamid           text,          -- WhatsApp Message ID (Meta Cloud API)
  enviado_por     uuid REFERENCES auth.users ON DELETE SET NULL,  -- null = bot/sistema
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mensajes_inbox_direccion_check CHECK (
    direccion IN ('entrante', 'saliente')
  ),
  CONSTRAINT mensajes_inbox_tipo_check CHECK (
    tipo IN ('texto', 'imagen', 'audio', 'documento', 'plantilla')
  ),
  CONSTRAINT mensajes_inbox_estado_check CHECK (
    estado_whatsapp IN ('pendiente', 'enviado', 'entregado', 'leido', 'fallido')
  )
);

-- ─── Índices ─────────────────────────────────────────────────

-- Lista de conversaciones ordenada por actividad reciente
CREATE INDEX IF NOT EXISTS conversaciones_clinica_actividad_idx
  ON conversaciones (clinica_id, ultimo_mensaje_at DESC);

-- Conversaciones por estado para filtros rápidos
CREATE INDEX IF NOT EXISTS conversaciones_clinica_estado_idx
  ON conversaciones (clinica_id, estado)
  WHERE estado = 'activa';

-- Buscar conversación por teléfono (para vincular mensajes entrantes)
CREATE INDEX IF NOT EXISTS conversaciones_telefono_idx
  ON conversaciones (clinica_id, telefono);

-- Mensajes de una conversación en orden cronológico
CREATE INDEX IF NOT EXISTS mensajes_inbox_conversacion_idx
  ON mensajes_inbox (conversacion_id, created_at);

-- Lookup por wamid para tracking de estado de Meta
CREATE INDEX IF NOT EXISTS mensajes_inbox_wamid_idx
  ON mensajes_inbox (wamid)
  WHERE wamid IS NOT NULL;

-- ─── Trigger: actualizar ultimo_mensaje_at ───────────────────

CREATE OR REPLACE FUNCTION update_conversacion_on_mensaje()
RETURNS trigger AS $$
BEGIN
  UPDATE conversaciones
  SET
    ultimo_mensaje_at = NEW.created_at,
    updated_at        = now(),
    -- Incrementar no_leidos solo para mensajes entrantes
    no_leidos = CASE
      WHEN NEW.direccion = 'entrante'
        THEN no_leidos + 1
      ELSE no_leidos
    END
  WHERE id = NEW.conversacion_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS mensajes_inbox_after_insert ON mensajes_inbox;
CREATE TRIGGER mensajes_inbox_after_insert
  AFTER INSERT ON mensajes_inbox
  FOR EACH ROW EXECUTE FUNCTION update_conversacion_on_mensaje();

-- ─── Trigger: updated_at en conversaciones ───────────────────

CREATE OR REPLACE FUNCTION touch_conversacion_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS conversaciones_updated_at ON conversaciones;
CREATE TRIGGER conversaciones_updated_at
  BEFORE UPDATE ON conversaciones
  FOR EACH ROW EXECUTE FUNCTION touch_conversacion_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_inbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversaciones_clinica" ON conversaciones;
CREATE POLICY "conversaciones_clinica" ON conversaciones
  FOR ALL
  USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());

DROP POLICY IF EXISTS "mensajes_inbox_clinica" ON mensajes_inbox;
CREATE POLICY "mensajes_inbox_clinica" ON mensajes_inbox
  FOR ALL
  USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());
