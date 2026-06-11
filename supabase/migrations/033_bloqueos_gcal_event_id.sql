alter table bloqueos add column if not exists gcal_event_id text;
create index if not exists idx_bloqueos_gcal_event_id on bloqueos(gcal_event_id) where gcal_event_id is not null;
