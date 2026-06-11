-- Add google_event_id to citas for Google Calendar sync tracking
alter table citas add column if not exists google_event_id text;
