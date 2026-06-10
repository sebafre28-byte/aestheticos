-- Google Calendar OAuth tokens per user+clinica
create table if not exists google_calendar_tokens (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  clinica_id     uuid not null references clinicas(id) on delete cascade,
  access_token   text not null,
  refresh_token  text,
  token_expiry   timestamptz,
  calendar_id    text not null default 'primary',
  sync_mode      text not null default 'export' check (sync_mode in ('export', 'bidireccional')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, clinica_id)
);

alter table google_calendar_tokens enable row level security;

-- Users can only see/edit their own tokens
create policy "gcal_own" on google_calendar_tokens
  for all using (auth.uid() = user_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger google_calendar_tokens_updated_at
  before update on google_calendar_tokens
  for each row execute function update_updated_at();
