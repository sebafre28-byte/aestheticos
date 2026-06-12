ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS flow_customer_id      text,
  ADD COLUMN IF NOT EXISTS flow_subscription_id  text;

CREATE INDEX IF NOT EXISTS idx_subscriptions_flow_sub ON subscriptions(flow_subscription_id);
