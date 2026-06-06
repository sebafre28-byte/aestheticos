ALTER TABLE google_calendar_tokens
ADD COLUMN IF NOT EXISTS sync_mode text NOT NULL DEFAULT 'push_only'
CHECK (sync_mode IN ('push_only', 'pull_only', 'bidirectional'));
