-- ============================================================
-- October planning calendar (the Calendar page, route /timeline).
-- Run this in the Supabase SQL Editor on the existing project.
--
-- Deliberately separate from `tasks` (the Tasks page) and from the
-- unused `timeline_milestones` seed table: the calendar is its own
-- context, so nothing here shows up on other pages and vice versa.
-- ============================================================

create table if not exists calendar_events (
  id uuid default gen_random_uuid() primary key,
  event_date date not null,
  event_time time,                          -- null = no set time
  title text not null,
  description text not null default '',
  created_at timestamptz default now()
);

create index if not exists calendar_events_date_idx
  on calendar_events (event_date, event_time);

-- Same allow-all RLS as every other planner table (the app gate is the password).
alter table calendar_events enable row level security;

drop policy if exists "Allow all access to calendar_events" on calendar_events;
create policy "Allow all access to calendar_events"
  on calendar_events for all using (true) with check (true);
