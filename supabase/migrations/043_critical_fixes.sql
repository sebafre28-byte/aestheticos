-- CRITICAL FIX 1: subscriptions.plan CHECK constraint rejects 'starter'
-- New registrations fail because trigger inserts plan='starter' which is not allowed
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'starter', 'pro', 'clinica'));

-- CRITICAL FIX 2: Drop clinicas_email_key (no longer needed, was causing register failures)
ALTER TABLE clinicas DROP CONSTRAINT IF EXISTS clinicas_email_key;

-- CRITICAL FIX 3: Google Calendar tokens - fix column names if table has old schema
-- If table was created by migration 039 (with 'expires_at' instead of 'token_expiry')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_tokens' AND column_name = 'expires_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_tokens' AND column_name = 'token_expiry'
  ) THEN
    ALTER TABLE google_calendar_tokens RENAME COLUMN expires_at TO token_expiry;
    ALTER TABLE google_calendar_tokens ALTER COLUMN token_expiry SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_tokens' AND column_name = 'calendar_id'
  ) THEN
    ALTER TABLE google_calendar_tokens ADD COLUMN calendar_id text NOT NULL DEFAULT 'primary';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_tokens' AND column_name = 'scope'
  ) THEN
    ALTER TABLE google_calendar_tokens ADD COLUMN scope text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_tokens' AND column_name = 'sync_mode'
  ) THEN
    ALTER TABLE google_calendar_tokens ADD COLUMN sync_mode text NOT NULL DEFAULT 'push_only'
      CHECK (sync_mode IN ('push_only', 'pull_only', 'bidirectional'));
  END IF;
END $$;

-- Fix google_calendar_events if it has old schema (user_id instead of token_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_events' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_calendar_events' AND column_name = 'token_id'
  ) THEN
    ALTER TABLE google_calendar_events
      ADD COLUMN token_id uuid REFERENCES google_calendar_tokens(id) ON DELETE CASCADE,
      ADD COLUMN clinica_id uuid REFERENCES clinicas(id) ON DELETE CASCADE,
      ADD COLUMN calendar_id text NOT NULL DEFAULT 'primary';
  END IF;
END $$;
