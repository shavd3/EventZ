-- ============================================================
-- Wedding Assignments (Roles & Responsibilities)
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS wedding_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  responsibilities text[] NOT NULL DEFAULT '{}',
  assignee text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wedding_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_wedding_roles" ON wedding_roles
  FOR ALL USING (true) WITH CHECK (true);
