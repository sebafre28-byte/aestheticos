-- ─── Subscriptions table ─────────────────────────────────────────────────────

CREATE TABLE subscriptions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id             uuid        REFERENCES clinicas(id) ON DELETE CASCADE NOT NULL,
  plan                   text        NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'clinica')),
  estado                 text        NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'pausada', 'cancelada', 'trial')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  trial_ends_at          timestamptz,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

-- RLS: clinica only sees its own subscription
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_own" ON subscriptions
  USING (clinica_id = auth_clinica_id());

-- Insert default free/trial subscription for existing clinics
INSERT INTO subscriptions (clinica_id, plan, estado)
SELECT id, 'free', 'trial' FROM clinicas
WHERE id NOT IN (SELECT clinica_id FROM subscriptions);
