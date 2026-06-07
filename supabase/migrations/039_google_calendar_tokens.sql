-- Google Calendar OAuth tokens per user
create table if not exists google_calendar_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  clinica_id  uuid not null references clinicas(id) on delete cascade,
  access_token  text not null,
  refresh_token text,
  expires_at  timestamptz,
  email       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id)
);

alter table google_calendar_tokens enable row level security;

create policy "Usuario ve sus propios tokens"
  on google_calendar_tokens for select
  using (user_id = auth.uid());

create policy "Usuario gestiona sus propios tokens"
  on google_calendar_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Mapping cita <-> Google event
create table if not exists google_calendar_events (
  id              uuid primary key default gen_random_uuid(),
  cita_id         uuid not null references citas(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  google_event_id text not null,
  created_at      timestamptz default now(),
  unique(cita_id, user_id)
);

alter table google_calendar_events enable row level security;

create policy "Usuario ve sus propios eventos"
  on google_calendar_events for select
  using (user_id = auth.uid());

create policy "Usuario gestiona sus propios eventos"
  on google_calendar_events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
