-- Drop legacy Stripe columns — payment processor migrated to Flow.cl
ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_subscription_id;
