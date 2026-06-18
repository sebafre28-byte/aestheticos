-- ─── Superadmin: limit overrides + notes + action logs ───────────────────────

-- 1. Custom limit overrides per clinic (stored in subscriptions)
--    Keys match PlanLimits: profesionales, pacientes, conversaciones_ia, usuarios, storage_gb
--    Value -1 = unlimited, null key = use plan default
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS limit_overrides JSONB DEFAULT NULL;

-- 2. Internal superadmin notes per clinic
ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS notas_superadmin TEXT DEFAULT NULL;

-- 3. Audit log: every superadmin action is recorded
CREATE TABLE IF NOT EXISTS superadmin_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id   UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  admin_email  TEXT NOT NULL,
  accion       TEXT NOT NULL,         -- 'set_plan', 'extend_trial', 'set_limit_override', etc.
  campo        TEXT,                  -- which field changed (for overrides)
  valor_previo TEXT,
  valor_nuevo  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-clinic history queries
CREATE INDEX IF NOT EXISTS idx_superadmin_logs_clinica ON superadmin_logs(clinica_id, created_at DESC);

-- No RLS needed: this table is only accessed via service-role admin client
