-- ─── MFA: códigos OTP por email ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mfa_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_codes_user ON mfa_codes(user_id, created_at DESC);

-- Auto-cleanup: delete codes older than 1 hour
CREATE OR REPLACE FUNCTION cleanup_mfa_codes() RETURNS void LANGUAGE sql AS $$
  DELETE FROM mfa_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
$$;

-- No RLS needed: accessed only via service-role admin client
