-- Run this in Supabase SQL Editor to set up the database

create table categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

-- Seed default categories
insert into categories (name, sort_order) values
  ('Venue & Church', 1),
  ('Photography & Video', 2),
  ('Catering & Food', 3),
  ('Decor & Flowers', 4),
  ('Attire & Grooming', 5),
  ('Invitations & Stationery', 6),
  ('Music & Entertainment', 7),
  ('Transport', 8),
  ('Hair & Makeup', 9),
  ('Jewellery', 10),
  ('Cake', 11),
  ('Gifts & Favours', 12),
  ('Honeymoon', 13),
  ('Other', 14);

create table tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null,
  assignee text not null default '',
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'done')),
  notes text not null default '',
  vendor text not null default '',
  contact text not null default '',
  price numeric not null default 0,
  created_at timestamptz default now()
);

-- If tables already exist, run these instead:
-- alter table tasks add column if not exists vendor text not null default '';
-- alter table tasks add column if not exists contact text not null default '';
-- alter table tasks add column if not exists price numeric not null default 0;

create table timeline_milestones (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null default '',
  target_date date not null,
  is_completed boolean not null default false,
  created_at timestamptz default now()
);

create table schedule_items (
  id uuid default gen_random_uuid() primary key,
  time text not null,
  title text not null,
  description text not null default '',
  location text not null default '',
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create table budget_items (
  id uuid default gen_random_uuid() primary key,
  category text not null,
  vendor text not null default 'TBD',
  contact text not null default '',
  total_expense numeric not null default 0,
  advance_paid numeric not null default 0,
  advance_date date,
  due_date date,
  status text not null default 'not_paid' check (status in ('not_paid', 'advance_paid', 'settled')),
  assignee text not null default '',
  side text not null default 'groom' check (side in ('bride', 'groom')),
  notes text not null default '',
  created_at timestamptz default now()
);

-- Enable Row Level Security but allow all operations (no auth required)
alter table categories enable row level security;
alter table tasks enable row level security;
alter table timeline_milestones enable row level security;
alter table schedule_items enable row level security;
alter table budget_items enable row level security;

create policy "Allow all access to categories" on categories for all using (true) with check (true);
create policy "Allow all access to tasks" on tasks for all using (true) with check (true);
create policy "Allow all access to timeline_milestones" on timeline_milestones for all using (true) with check (true);
create policy "Allow all access to schedule_items" on schedule_items for all using (true) with check (true);
create policy "Allow all access to budget_items" on budget_items for all using (true) with check (true);

-- Seed some default wedding day schedule items
insert into schedule_items (time, title, description, location, sort_order) values
  ('06:00 AM', 'Bride Prep Begins', 'Hair, makeup, and getting ready', 'Home', 1),
  ('07:00 AM', 'Groom Prep Begins', 'Getting ready', 'Home', 2),
  ('08:00 AM', 'Photoshoot - Bride', 'Pre-wedding bridal photoshoot', 'TBD', 3),
  ('09:00 AM', 'Photoshoot - Groom', 'Pre-wedding groom photoshoot', 'TBD', 4),
  ('10:00 AM', 'Couple Photoshoot', 'Pre-wedding couple photoshoot', 'TBD', 5),
  ('02:00 PM', 'Arrive at Church', 'Arrive and prepare for ceremony', 'St. Sebastians Church, Moratuwa', 6),
  ('03:00 PM', 'Wedding Ceremony', 'Holy Mass & Wedding Ceremony', 'St. Sebastians Church, Moratuwa', 7),
  ('04:30 PM', 'Refreshments', 'Post-ceremony refreshments for guests', 'Church Grounds', 8),
  ('05:30 PM', 'Family Lunch', 'Intimate family lunch', 'TBD', 9);

-- Seed some planning milestones
insert into timeline_milestones (title, description, target_date, is_completed) values
  ('Book Church', 'Confirm booking at St. Sebastians Church, Moratuwa', '2026-06-01', false),
  ('Book Photographer', 'Finalize photography & videography team', '2026-06-15', false),
  ('Send Invitations', 'Design, print, and distribute wedding invitations', '2026-07-15', false),
  ('Book Catering', 'Finalize menu and catering for refreshments & family lunch', '2026-07-01', false),
  ('Attire Shopping', 'Wedding dress & suit shopping', '2026-07-15', false),
  ('Decor & Flowers', 'Finalize church decoration and floral arrangements', '2026-08-01', false),
  ('Hair & Makeup Trial', 'Trial session for bridal hair and makeup', '2026-08-15', false),
  ('Cake Tasting', 'Choose wedding cake design and flavours', '2026-08-01', false),
  ('Final Rehearsal', 'Church rehearsal with wedding party', '2026-10-03', false),
  ('Final Payments', 'Settle all remaining vendor payments', '2026-10-05', false),
  ('Wedding Day!', 'The big day - Amaya & Shavin', '2026-10-10', false);
