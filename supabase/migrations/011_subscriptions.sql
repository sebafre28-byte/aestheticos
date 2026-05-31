-- Subscriptions table for plan-based feature gating
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid REFERENCES clinicas(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'clinica')),
  estado text NOT NULL DEFAULT 'trial' CHECK (estado IN ('activa', 'pausada', 'cancelada', 'trial')),
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their clinica subscription"
  ON subscriptions FOR SELECT
  USING (
    clinica_id IN (
      SELECT clinica_id FROM usuarios_clinica WHERE user_id = auth.uid()
    )
  );

-- Set trial_ends_at for subscriptions in 'trial' estado that don't have it yet
UPDATE subscriptions
SET trial_ends_at = created_at + INTERVAL '14 days'
WHERE estado = 'trial' AND trial_ends_at IS NULL;
