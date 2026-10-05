-- ============================================================
-- Wedding-day agenda (the Wedding Day page, route /schedule, and the
-- read-only vendor link /agenda/<key>). Run once in the Supabase SQL Editor.
--
-- Seeded from the "Agenda" and "Pathum" sheets, merged and put in time order.
-- The seed only runs while the table is empty, so re-running this is safe
-- and never overwrites edits made in the planner.
-- ============================================================

create table if not exists agenda_items (
  id uuid default gen_random_uuid() primary key,
  start_time time not null,
  end_time time,                                  -- only for time blocks
  kind text not null default 'step' check (kind in ('step', 'block')),
  who text not null default '',                   -- the party: "Bride's parents", "Retinue"…
  event text not null,                            -- what happens: "Leave home", "Wedding Mass"
  vehicle text not null default '',               -- drives the vehicle filter buttons
  contact text not null default '',               -- names / phone numbers to call
  location_name text not null default '',
  location_url text not null default '',          -- Google Maps link
  notes text not null default '',
  sort_order int not null default 0,              -- tie-break for equal times
  created_at timestamptz default now()
);

create index if not exists agenda_items_time_idx on agenda_items (start_time, sort_order);

-- Same allow-all RLS as every other planner table.
alter table agenda_items enable row level security;
drop policy if exists "Allow all access to agenda_items" on agenda_items;
create policy "Allow all access to agenda_items"
  on agenda_items for all using (true) with check (true);

insert into agenda_items
  (start_time, end_time, kind, who, event, vehicle, contact, location_name, location_url, notes, sort_order)
select start_time::time, end_time::time, kind, who, event, vehicle, contact, location_name, location_url, notes, sort_order from (values
  ('03:30', null, 'step', 'Bride & Maid of Honour', 'Leave home', 'KDH High Roof', 'Shenali +94 77 454 9883 · Shermila +94 72 230 7893', 'Bride''s home', 'https://maps.app.goo.gl/DEqwZcTfr9ddk39u8', '', 10),
  ('03:35', null, 'step', 'Bridesmaid 1 – Lavanya', 'Pick up from home', 'KDH High Roof', '', 'Lavanya''s home', 'https://maps.app.goo.gl/Am4zJVf6mQdm3ntN7', '', 20),
  ('03:45', null, 'step', 'Bridesmaid 2 – Timi', 'Pick up from home', 'KDH High Roof', '', '46 Ebert Lane, Moratuwa', 'https://maps.app.goo.gl/L7wbbqJYmekoeKVC7', '', 30),
  ('04:30', null, 'step', 'Bride, Maid of Honour & bridesmaids', 'Arrive at Kavin Saloon', 'KDH High Roof', '', 'Kavin Perera Brides & Beauty, Pannipitiya', 'https://maps.app.goo.gl/F39Y3uy17SD6SuEC6', '', 40),
  ('04:30', '09:30', 'block', '', 'Bride''s side – saloon dressing', '', '', 'Kavin Perera Brides & Beauty, Pannipitiya', 'https://maps.app.goo.gl/F39Y3uy17SD6SuEC6', '', 50),
  ('05:45', null, 'step', 'Bride''s mother', 'Pick up from home', 'Pathum Vehicle', '', 'Bride''s home', 'https://maps.app.goo.gl/DEqwZcTfr9ddk39u8', '', 60),
  ('06:30', null, 'step', 'Bride''s mother', 'Arrive at Kavin Saloon', 'Pathum Vehicle', '', 'Kavin Perera Brides & Beauty, Pannipitiya', 'https://maps.app.goo.gl/F39Y3uy17SD6SuEC6', '', 70),
  ('07:40', null, 'step', 'Groom', 'Leave home', 'Eshan Vehicle', 'Heshan +94 77 267 2644 · Eshan +94 77 323 3602', 'Groom''s home', 'https://maps.app.goo.gl/Am4zJVf6mQdm3ntN7', '', 80),
  ('07:45', null, 'step', 'Groomsman 1 – Shahen', 'Pick up from home', 'Eshan Vehicle', '', 'Shahen''s home', 'https://maps.app.goo.gl/DEqwZcTfr9ddk39u8', '', 90),
  ('07:55', null, 'step', 'Groomsman 2 & Best man (Praneeth & Nithilla)', 'Pick up from home', 'Eshan Vehicle', '', 'Home – pin to be confirmed', '', '', 100),
  ('08:00', null, 'step', 'Groom''s party', 'Arrive at Hair Avenue', 'Eshan Vehicle', '', 'Hair Avenue, Moratuwa', 'https://maps.app.goo.gl/5x676zd7Jo7iqN5QA', '', 110),
  ('08:00', '09:30', 'block', '', 'Groom''s side – saloon dressing', '', '', 'Hair Avenue, Moratuwa', 'https://maps.app.goo.gl/5x676zd7Jo7iqN5QA', '', 120),
  ('09:30', null, 'step', 'Bride + Sithara', 'Leave the saloon', 'Bride''s Prado', 'Event Coordinator', 'Kavin Perera Brides & Beauty, Pannipitiya', 'https://maps.app.goo.gl/F39Y3uy17SD6SuEC6', '', 130),
  ('09:30', null, 'step', 'Bridesmaids + bride''s mother', 'Leave the saloon', 'KDH High Roof', '', 'Kavin Perera Brides & Beauty, Pannipitiya', 'https://maps.app.goo.gl/F39Y3uy17SD6SuEC6', '', 140),
  ('10:00', null, 'step', 'Groom & groomsmen', 'Leave the saloon', 'KDH High Roof', '', 'Hair Avenue, Moratuwa', 'https://maps.app.goo.gl/5x676zd7Jo7iqN5QA', '', 150),
  ('10:00', null, 'step', 'Lily Pod luggage', 'Pick up from Heshan''s home', 'Pathum Vehicle', '', 'Heshan''s home', '', '', 160),
  ('10:30', null, 'step', 'Bride', 'Arrive at Lily Pod', 'Bride''s Prado', '', 'Lily Pod, Bolgoda', 'https://maps.app.goo.gl/qcZ83RKMJWmUpPPB7', '', 170),
  ('10:30', null, 'step', 'Bridesmaids', 'Arrive at Lily Pod', 'KDH High Roof', '', 'Lily Pod, Bolgoda', 'https://maps.app.goo.gl/qcZ83RKMJWmUpPPB7', '', 180),
  ('10:30', null, 'step', 'Groom & groomsmen', 'Arrive at Lily Pod', 'KDH High Roof', '', 'Lily Pod, Bolgoda', 'https://maps.app.goo.gl/qcZ83RKMJWmUpPPB7', '', 190),
  ('10:30', null, 'step', 'Lily Pod luggage', 'Drop at Lily Pod', 'Pathum Vehicle', '', 'Lily Pod, Bolgoda', 'https://maps.app.goo.gl/qcZ83RKMJWmUpPPB7', 'Champagne & glasses, retinue refreshments, detail-shot boxes, milk glass and flowers, other required bags', 200),
  ('10:30', '14:00', 'block', '', 'Photoshoot', '', '', 'Lily Pod, Bolgoda', 'https://maps.app.goo.gl/qcZ83RKMJWmUpPPB7', '', 210),
  ('11:00', null, 'step', 'Used luggage', 'Take back home', 'Pathum Vehicle', '', 'Home', '', 'Picked up from Lily Pod', 220),
  ('11:05', null, 'step', 'Heshan', 'Pick up from home', 'Pathum Vehicle', '', 'Heshan''s home', '', '', 230),
  ('11:10', null, 'step', 'Heshan', 'Drop at Central Saloon', 'Pathum Vehicle', '', 'Central Saloon', '', '', 240),
  ('11:30', null, 'step', '2 kids', 'Arrive at Lily Pod', 'Personal Vehicle', '', 'Lily Pod, Bolgoda', 'https://maps.app.goo.gl/qcZ83RKMJWmUpPPB7', '', 250),
  ('12:00', null, 'step', 'Heshan', 'Drop back home', 'Pathum Vehicle', '', 'Heshan''s home', '', '', 260),
  ('12:30', null, 'step', 'Bride''s parents', 'Pick up from home', 'Groom''s Prado', '', 'Bride''s home', 'https://maps.app.goo.gl/DEqwZcTfr9ddk39u8', '', 270),
  ('13:00', null, 'step', 'Bride''s parents', 'Arrive at Lily Pod', 'Groom''s Prado', '', 'Lily Pod, Bolgoda', 'https://maps.app.goo.gl/qcZ83RKMJWmUpPPB7', '', 280),
  ('14:30', null, 'step', 'Cake boxes & wine bottles', 'Pick up from Heshan''s home', 'Pathum Vehicle', '', 'Heshan''s home', '', '', 290),
  ('14:45', null, 'step', 'Groom', 'Leave Lily Pod', 'Groom''s Prado', 'Event Coordinator', 'Lily Pod, Bolgoda', 'https://maps.app.goo.gl/qcZ83RKMJWmUpPPB7', '', 300),
  ('14:45', null, 'step', 'Retinue + Sithara', 'Leave Lily Pod', 'KDH High Roof', '', 'Lily Pod, Bolgoda', 'https://maps.app.goo.gl/qcZ83RKMJWmUpPPB7', '', 310),
  ('14:50', null, 'step', 'Bride & parents', 'Leave Lily Pod', 'Bride''s Prado', '', 'Lily Pod, Bolgoda', 'https://maps.app.goo.gl/qcZ83RKMJWmUpPPB7', '', 320),
  ('15:00', null, 'step', 'Cake boxes & wine bottles', 'Drop at the church', 'Pathum Vehicle', '', 'St. Sebastian''s Church, Moratuwa', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 330),
  ('15:10', null, 'step', 'Wedding rings & necklace', 'Arrive at the church', 'Eshan Vehicle', '', 'St. Sebastian''s Church, Moratuwa', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 340),
  ('15:15', null, 'step', 'Groom', 'Arrive at the church', 'Groom''s Prado', '', 'St. Sebastian''s Church, Moratuwa', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 350),
  ('15:15', null, 'step', 'Retinue', 'Arrive at the church', 'KDH High Roof', '', 'St. Sebastian''s Church, Moratuwa', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 360),
  ('15:20', null, 'step', 'Groom & groomsmen', 'Walk to the altar', '', '', 'St. Sebastian''s Church, Moratuwa', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 370),
  ('15:25', null, 'step', 'Bridesmaids, bride & parents', 'Walk to the altar', '', '', 'St. Sebastian''s Church, Moratuwa', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 380),
  ('15:30', '17:00', 'block', '', 'Wedding Mass', '', '', 'St. Sebastian''s Church, Moratuwa', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 390),
  ('16:00', null, 'step', 'Iced coffee', 'Pick up from Oven Fresh', 'Pathum Vehicle', '', 'Oven Fresh', '', '', 400),
  ('16:30', null, 'step', 'Iced coffee', 'Drop at the church', 'Pathum Vehicle', '', 'St. Sebastian''s Church, Moratuwa', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 410),
  ('17:00', null, 'step', 'Wedding cake', 'Pick up from Cake Structure (Mount)', 'Pathum Vehicle', '', 'Cake Structure, Mount', '', '', 420),
  ('17:00', '17:50', 'block', '', 'Church snacks & photos', '', '', 'St. Sebastian''s Church, Moratuwa', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 430),
  ('17:10', null, 'step', 'Couple & guests', 'Photos at the church entrance', '', '', 'St. Sebastian''s Church, Moratuwa', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 440),
  ('17:10', null, 'step', 'Guests', 'Church refreshments begin', '', '', 'St. Sebastian''s Church, Moratuwa', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 450),
  ('17:45', null, 'step', 'Wedding cake', 'Drop at Cinnamon Grand', 'Pathum Vehicle', '', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', 'Collected by Sameera / Deco Aunty', 460),
  ('18:00', null, 'step', 'Couple', 'Leave the church', 'Groom''s Prado', 'Event Coordinator', 'St. Sebastian''s Church, Moratuwa', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 470),
  ('18:00', null, 'step', 'Retinue', 'Leave the church', 'KDH High Roof', '', 'St. Sebastian''s Church, Moratuwa', 'https://maps.app.goo.gl/9qtWtsUxTvBZZNCX6', '', 480),
  ('18:40', null, 'step', 'Couple', 'Arrive at Cinnamon Grand (room)', 'Groom''s Prado', '', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', '', 490),
  ('18:50', null, 'step', 'Bride''s family', 'Arrive at Cinnamon Grand (Plates)', 'Bride''s Prado', '', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', '', 500),
  ('18:50', null, 'step', 'Groom''s family', 'Arrive at Cinnamon Grand (Plates)', 'KDH Low Roof', '', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', '', 510),
  ('19:00', null, 'step', 'Retinue', 'Start ushering guests', '', '', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', '', 520),
  ('19:00', '23:00', 'block', '', 'Dinner buffet with drinks', '', '', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', '', 530),
  ('19:30', null, 'step', 'Band – Accede', 'Band starts', '', 'Event Coordinator', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', '', 540),
  ('20:00', null, 'step', 'Couple', 'Grand entrance at Plates', '', '', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', '', 550),
  ('20:00', null, 'step', 'Couple', 'Cutting of the wedding cake', '', '', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', '', 560),
  ('20:10', null, 'step', 'Shahen Perera', 'Welcome speech & toast', '', '', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', '', 570),
  ('20:30', null, 'step', 'Couple', 'First dance', '', '', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', '', 580),
  ('20:35', null, 'step', 'Guests', 'Dinner & drinks', '', '', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', '', 590),
  ('23:30', null, 'step', 'Band – Accede', 'Band ends', '', '', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', '', 600),
  ('23:30', null, 'step', 'Couple', 'Going away', 'Groom''s Prado', '', 'Cinnamon Grand, Colombo', 'https://maps.app.goo.gl/BytunAszPq1gGvE3A', '', 610)
) as seed(start_time, end_time, kind, who, event, vehicle, contact, location_name, location_url, notes, sort_order)
where not exists (select 1 from agenda_items);
