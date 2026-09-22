-- ============================================================
-- Budget columns: expected amount, pax, payment method
-- Run this in the Supabase SQL Editor on an existing project.
-- contact is left in place so existing phone numbers are kept;
-- the planner no longer shows or edits it.
-- ============================================================

ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS expected_budget numeric;
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS price_per_pax numeric;
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS pax_count numeric;
ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE budget_items DROP CONSTRAINT IF EXISTS budget_items_payment_method_check;
ALTER TABLE budget_items
  ADD CONSTRAINT budget_items_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('debit', 'credit', 'cash'));
