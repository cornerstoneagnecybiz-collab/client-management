-- Billing period for monthly invoices: which month this invoice is for (e.g. March 2025).
-- Null for project/milestone. Prevents duplicate monthly invoices per project per month.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS billing_month DATE;

COMMENT ON COLUMN invoices.billing_month IS 'First-of-month date for monthly invoices (e.g. 2025-03-01); null for project/milestone';

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_project_billing_month_monthly
  ON invoices (project_id, billing_month)
  WHERE type = 'monthly' AND billing_month IS NOT NULL;
