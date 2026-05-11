-- ============================================================
-- AestheticOS — Agenda hardening + advanced scheduling
-- Migration: 002_agenda_google_like.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ------------------------------------------------------------
-- Citas: versionado, recurrencia y rango para colisiones
-- ------------------------------------------------------------

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS event_timezone text NOT NULL DEFAULT 'America/Santiago',
  ADD COLUMN IF NOT EXISTS recurrence_kind text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_rule text,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES citas(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recurrence_instance_date date,
  ADD COLUMN IF NOT EXISTS buffer_minutos int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lock_version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rango tstzrange GENERATED ALWAYS AS (tstzrange(inicio, fin, '[)')) STORED;

ALTER TABLE citas
  DROP CONSTRAINT IF EXISTS citas_recurrence_kind_check;

ALTER TABLE citas
  ADD CONSTRAINT citas_recurrence_kind_check CHECK (
    recurrence_kind IN ('none', 'daily', 'weekly', 'monthly', 'rrule')
  );

CREATE INDEX IF NOT EXISTS citas_recurrence_parent_idx ON citas(recurrence_parent_id);
CREATE INDEX IF NOT EXISTS citas_updated_at_idx ON citas(updated_at DESC);

ALTER TABLE citas
  DROP CONSTRAINT IF EXISTS citas_no_overlap_profesional;

ALTER TABLE citas
  ADD CONSTRAINT citas_no_overlap_profesional
  EXCLUDE USING gist (
    profesional_id WITH =,
    rango WITH &&
  )
  WHERE (estado IN ('pendiente', 'confirmada', 'completada'));

CREATE OR REPLACE FUNCTION set_citas_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.lock_version = COALESCE(OLD.lock_version, 0) + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS citas_set_updated_at ON citas;
CREATE TRIGGER citas_set_updated_at
  BEFORE UPDATE ON citas
  FOR EACH ROW
  EXECUTE FUNCTION set_citas_updated_at();

-- ------------------------------------------------------------
-- Disponibilidad y bloqueos por profesional
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agenda_disponibilidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas ON DELETE CASCADE,
  profesional_id uuid NOT NULL REFERENCES profesionales ON DELETE CASCADE,
  dia_semana int NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT disponibilidad_rango_check CHECK (hora_fin > hora_inicio)
);

CREATE INDEX IF NOT EXISTS agenda_disponibilidad_clinica_idx ON agenda_disponibilidad(clinica_id);
CREATE INDEX IF NOT EXISTS agenda_disponibilidad_profesional_idx ON agenda_disponibilidad(profesional_id, dia_semana);

CREATE TABLE IF NOT EXISTS agenda_bloqueos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas ON DELETE CASCADE,
  profesional_id uuid REFERENCES profesionales ON DELETE CASCADE,
  titulo text NOT NULL,
  motivo text,
  inicio timestamptz NOT NULL,
  fin timestamptz NOT NULL,
  tipo text NOT NULL DEFAULT 'bloqueo',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agenda_bloqueos_tipo_check CHECK (tipo IN ('bloqueo', 'vacaciones', 'feriado', 'almuerzo', 'capacitacion')),
  CONSTRAINT agenda_bloqueos_rango_check CHECK (fin > inicio)
);

CREATE INDEX IF NOT EXISTS agenda_bloqueos_clinica_idx ON agenda_bloqueos(clinica_id, inicio);
CREATE INDEX IF NOT EXISTS agenda_bloqueos_profesional_idx ON agenda_bloqueos(profesional_id, inicio);

-- ------------------------------------------------------------
-- Recordatorios y cola de notificaciones
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agenda_recordatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas ON DELETE CASCADE,
  cita_id uuid NOT NULL REFERENCES citas ON DELETE CASCADE,
  canal text NOT NULL,
  minutos_antes int NOT NULL DEFAULT 60,
  activo boolean NOT NULL DEFAULT true,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agenda_recordatorios_canal_check CHECK (canal IN ('whatsapp', 'email', 'push')),
  CONSTRAINT agenda_recordatorios_minutos_check CHECK (minutos_antes >= 0)
);

CREATE INDEX IF NOT EXISTS agenda_recordatorios_cita_idx ON agenda_recordatorios(cita_id, activo);

CREATE TABLE IF NOT EXISTS agenda_notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas ON DELETE CASCADE,
  cita_id uuid REFERENCES citas ON DELETE CASCADE,
  canal text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for timestamptz NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente',
  intentos int NOT NULL DEFAULT 0,
  ultimo_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agenda_notification_jobs_canal_check CHECK (canal IN ('whatsapp', 'email', 'push')),
  CONSTRAINT agenda_notification_jobs_estado_check CHECK (estado IN ('pendiente', 'enviado', 'fallido', 'cancelado'))
);

CREATE INDEX IF NOT EXISTS agenda_notification_jobs_queue_idx ON agenda_notification_jobs(estado, scheduled_for);

-- ------------------------------------------------------------
-- Auditoría de cambios
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agenda_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid NOT NULL REFERENCES clinicas ON DELETE CASCADE,
  cita_id uuid REFERENCES citas ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users ON DELETE SET NULL,
  accion text NOT NULL,
  antes jsonb,
  despues jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agenda_audit_log_clinica_idx ON agenda_audit_log(clinica_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agenda_audit_log_cita_idx ON agenda_audit_log(cita_id, created_at DESC);

CREATE OR REPLACE FUNCTION log_cita_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO agenda_audit_log (clinica_id, cita_id, actor_id, accion, despues)
    VALUES (NEW.clinica_id, NEW.id, auth.uid(), 'create', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO agenda_audit_log (clinica_id, cita_id, actor_id, accion, antes, despues)
    VALUES (NEW.clinica_id, NEW.id, auth.uid(), 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    INSERT INTO agenda_audit_log (clinica_id, cita_id, actor_id, accion, antes)
    VALUES (OLD.clinica_id, OLD.id, auth.uid(), 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS citas_audit_trigger ON citas;
CREATE TRIGGER citas_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON citas
  FOR EACH ROW
  EXECUTE FUNCTION log_cita_changes();

-- ------------------------------------------------------------
-- RPC transaccional: crear/editar cita validando colisiones
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION upsert_cita_atomic(
  p_cita_id uuid,
  p_clinica_id uuid,
  p_paciente_id uuid,
  p_profesional_id uuid,
  p_servicio_id uuid,
  p_inicio timestamptz,
  p_fin timestamptz,
  p_notas text,
  p_estado text DEFAULT 'pendiente',
  p_expected_lock_version int DEFAULT NULL
)
RETURNS citas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cita citas;
BEGIN
  IF p_fin <= p_inicio THEN
    RAISE EXCEPTION 'Rango horario inválido';
  END IF;

  IF p_cita_id IS NULL THEN
    INSERT INTO citas (
      clinica_id, paciente_id, profesional_id, servicio_id, inicio, fin, notas, estado
    )
    VALUES (
      p_clinica_id, p_paciente_id, p_profesional_id, p_servicio_id, p_inicio, p_fin, p_notas, p_estado
    )
    RETURNING * INTO v_cita;
  ELSE
    UPDATE citas
    SET
      paciente_id = p_paciente_id,
      profesional_id = p_profesional_id,
      servicio_id = p_servicio_id,
      inicio = p_inicio,
      fin = p_fin,
      notas = p_notas,
      estado = p_estado
    WHERE id = p_cita_id
      AND (p_expected_lock_version IS NULL OR lock_version = p_expected_lock_version)
    RETURNING * INTO v_cita;

    IF v_cita IS NULL THEN
      RAISE EXCEPTION 'Conflicto de versión en cita';
    END IF;
  END IF;

  RETURN v_cita;
END;
$$;

-- ------------------------------------------------------------
-- RLS para tablas nuevas
-- ------------------------------------------------------------

ALTER TABLE agenda_disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_bloqueos ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_recordatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_disponibilidad_clinica" ON agenda_disponibilidad;
CREATE POLICY "agenda_disponibilidad_clinica" ON agenda_disponibilidad
  FOR ALL USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());

DROP POLICY IF EXISTS "agenda_bloqueos_clinica" ON agenda_bloqueos;
CREATE POLICY "agenda_bloqueos_clinica" ON agenda_bloqueos
  FOR ALL USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());

DROP POLICY IF EXISTS "agenda_recordatorios_clinica" ON agenda_recordatorios;
CREATE POLICY "agenda_recordatorios_clinica" ON agenda_recordatorios
  FOR ALL USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());

DROP POLICY IF EXISTS "agenda_notification_jobs_clinica" ON agenda_notification_jobs;
CREATE POLICY "agenda_notification_jobs_clinica" ON agenda_notification_jobs
  FOR ALL USING (clinica_id = auth_clinica_id())
  WITH CHECK (clinica_id = auth_clinica_id());

DROP POLICY IF EXISTS "agenda_audit_log_clinica" ON agenda_audit_log;
CREATE POLICY "agenda_audit_log_clinica" ON agenda_audit_log
  FOR SELECT USING (clinica_id = auth_clinica_id());
