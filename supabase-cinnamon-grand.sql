-- ============================================================
-- Cinnamon Grand Guests  (Intimate October 10th - Plates)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS cinnamon_grand_guests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  side text NOT NULL DEFAULT 'groom' CHECK (side IN ('bride', 'groom')),
  rsvp_status text NOT NULL DEFAULT 'pending'
    CHECK (rsvp_status IN ('pending', 'confirmed', 'declined')),
  meal_preference text NOT NULL DEFAULT '',
  save_the_date_sent boolean NOT NULL DEFAULT false,
  invitation_sent boolean NOT NULL DEFAULT false,
  category text NOT NULL DEFAULT '',
  count integer NOT NULL DEFAULT 1,
  address text NOT NULL DEFAULT '',
  gifted_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cinnamon_grand_guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_cinnamon_grand_guests" ON cinnamon_grand_guests
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Seed data — Groom's Side  (27 guests total)
-- ============================================================
INSERT INTO cinnamon_grand_guests (
  first_name, last_name, side, category, address,
  gifted_amount, count, rsvp_status,
  save_the_date_sent, invitation_sent, meal_preference
) VALUES
  ('Eshan',   '',        'groom', '', '', 0, 6, 'pending', false, false, ''),
  ('Nishan',  '',        'groom', '', '', 0, 3, 'pending', false, false, ''),
  ('Shanka',  '',        'groom', '', '', 0, 4, 'pending', false, false, ''),
  ('Dulakshi','',        'groom', '', '', 0, 6, 'pending', false, false, ''),
  ('Praveen', '',        'groom', '', '', 0, 2, 'pending', false, false, ''),
  ('Ajith',   '',        'groom', '', 'Kandy', 0, 3, 'pending', false, false, ''),
  ('Couple',  '',        'groom', '', '', 0, 2, 'pending', false, false, ''),
  ('Nithila', '',        'groom', '', '', 0, 1, 'pending', false, false, '');

-- ============================================================
-- 3. Seed data — Bride's Side  (31 guests total)
-- ============================================================
INSERT INTO cinnamon_grand_guests (
  first_name, last_name, side, category, address,
  gifted_amount, count, rsvp_status,
  save_the_date_sent, invitation_sent, meal_preference
) VALUES
  ('Heshan',              '',  'bride', '', '', 0, 3,  'pending', false, false, ''),
  ('Oliver',              '',  'bride', '', '', 0, 2,  'pending', false, false, ''),
  ('Violet',              '',  'bride', '', '', 0, 1,  'pending', false, false, ''),
  ('Ayoma',               '',  'bride', '', '', 0, 1,  'pending', false, false, ''),
  ('Praveen',             '',  'bride', '', '', 0, 4,  'pending', false, false, ''),
  ('Jude',                '',  'bride', '', '', 0, 4,  'pending', false, false, ''),
  ('Shanake',             '',  'bride', '', '', 0, 1,  'pending', false, false, ''),
  ('Anthony',             '',  'bride', '', '', 0, 3,  'pending', false, false, ''),
  ('Nuwan',               '',  'bride', '', '', 0, 1,  'pending', false, false, ''),
  ('Priyal',              '',  'bride', '', '', 0, 2,  'pending', false, false, ''),
  ('Sudu & Loku Achchi',  '',  'bride', '', '', 0, 2,  'pending', false, false, ''),
  ('Joy Seeya',           '',  'bride', '', '', 0, 1,  'pending', false, false, ''),
  ('Karo',                '',  'bride', '', '', 0, 1,  'pending', false, false, ''),
  ('Dinethra',            '',  'bride', '', '', 0, 2,  'pending', false, false, ''),
  ('Dimuthu',             '',  'bride', '', '', 0, 1,  'pending', false, false, ''),
  ('Rosy',                '',  'bride', '', '', 0, 2,  'pending', false, false, '');
