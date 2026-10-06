-- ============================================================
-- Wedding-day vendor contacts: the "Vendors" tab on the Wedding Day page
-- and on the read-only vendor link. Run once in the Supabase SQL Editor.
-- The seed only runs while the table is empty, so re-running is safe.
-- ============================================================

create table if not exists wedding_vendors (
  id uuid default gen_random_uuid() primary key,
  section text not null default '',        -- group heading: "Photo & video", "Church"…
  role text not null default '',           -- what they do: "Photographer"
  name text not null,                      -- business / person
  contact_person text not null default '',
  phone text not null default '',          -- one or more numbers, separated by ·
  location_url text not null default '',   -- Google Maps link
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz default now()
);

alter table wedding_vendors enable row level security;
drop policy if exists "Allow all access to wedding_vendors" on wedding_vendors;
create policy "Allow all access to wedding_vendors"
  on wedding_vendors for all using (true) with check (true);

insert into wedding_vendors (section, role, name, contact_person, phone, location_url, notes, sort_order)
select * from (values
  ('Photo & video', 'Photographer', 'Eterno Weddings', 'Disitha', '+94 71 358 2260', '', '', 10),
  ('Photo & video', 'Videographer', 'Marriage Diaries', '', '077 354 4114 · 070 446 3000', '', '', 20),
  ('Photo & video', 'Photoshoot location', 'Lily Pod Villa, Bolgoda, Moratuwa', '', '+94 77 208 5314', 'https://maps.app.goo.gl/qcZ83RKMJWmUpPPB7', '', 30),
  ('Getting ready', 'Bride & bridesmaids hair and makeup', 'Kavin Perera Bridal Salon, Pannipitiya', '', '', 'https://maps.app.goo.gl/F39Y3uy17SD6SuEC6', '', 40),
  ('Getting ready', 'Groom & groomsmen hair and makeup', 'Hair Avenue, Moratuwa', '', '071 033 9000', 'https://maps.app.goo.gl/5x676zd7Jo7iqN5QA', '', 50),
  ('Transport', 'Wedding cars', 'Amarasinghe Luxury Wedding Cars', '', '+94 71 188 7493', '', '', 60),
  ('Church', 'Church', 'St. Sebastian''s Church, Moratuwa', '', '', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 70),
  ('Church', 'Flower arrangements', 'Malshan Flora', '', '+94 77 311 7270', '', 'Also does the dinner backdrop', 80),
  ('Church', 'Church sound', 'Sounds by Harsha', '', '+94 71 918 7252', '', '', 90),
  ('Church', 'Choir', 'Voice Culture (Moratuwa)', 'Akila', '+94 70 369 9390', '', '', 100),
  ('Refreshments', 'Food packs', 'Little Star, Mount Lavinia', 'Pulith', '+94 77 975 2231', '', '', 110),
  ('Refreshments', 'Iced coffee', 'Oven Fresh, Moratuwa', '', '', '', '', 120),
  ('Refreshments', 'Cakes & wine', 'Bride''s mother', '', '', '', '', 130),
  ('Intimate dinner', 'Venue', 'Plates Restaurant, Cinnamon Grand', 'Sameera', '+94 77 536 7896', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', 'Backdrop by Malshan Flora; table centrepieces by a friend', 140),
  ('Intimate dinner', 'Music', 'Accede', '', '+94 71 438 9289', '', '', 150)
) as seed(section, role, name, contact_person, phone, location_url, notes, sort_order)
where not exists (select 1 from wedding_vendors);
