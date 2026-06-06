CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz NOT NULL,
  calendar_id text NOT NULL DEFAULT 'primary',
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, clinica_id)
);
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "google_tokens_own" ON google_calendar_tokens
  FOR ALL USING (clinica_id = auth_clinica_id());
CREATE INDEX IF NOT EXISTS google_calendar_tokens_clinica_idx ON google_calendar_tokens(clinica_id);
CREATE INDEX IF NOT EXISTS google_calendar_tokens_user_idx ON google_calendar_tokens(user_id);

CREATE TABLE IF NOT EXISTS google_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cita_id uuid NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  token_id uuid NOT NULL REFERENCES google_calendar_tokens(id) ON DELETE CASCADE,
  clinica_id uuid NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  calendar_id text NOT NULL DEFAULT 'primary',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cita_id, token_id)
);
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "google_events_clinica" ON google_calendar_events
  FOR ALL USING (clinica_id = auth_clinica_id());
