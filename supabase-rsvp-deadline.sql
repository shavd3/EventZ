-- RSVP deadline for personal invite links.
-- Existing rows stay NULL, which the invitation site reads as 20 September 2026
-- (the date already sent). Links created after this column exists stamp 2026-10-01.

ALTER TABLE guest_items ADD COLUMN IF NOT EXISTS rsvp_deadline date;
