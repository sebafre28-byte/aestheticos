-- Migración 053: saber si una suscripción es mensual o anual
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'mensual'
    CHECK (billing_period IN ('mensual', 'anual'));
