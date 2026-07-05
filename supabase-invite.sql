-- ============================================================
-- Wedding Invitation Site — guest_items extensions
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE guest_items ADD COLUMN IF NOT EXISTS invite_token text UNIQUE;
ALTER TABLE guest_items ADD COLUMN IF NOT EXISTS confirmed_count integer;
ALTER TABLE guest_items ADD COLUMN IF NOT EXISTS rsvp_responded_at timestamptz;

-- Backfill a unique random token per existing row
UPDATE guest_items
SET invite_token = lower(substr(md5(random()::text || id::text), 1, 6))
WHERE invite_token IS NULL;
