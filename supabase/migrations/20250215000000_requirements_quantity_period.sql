-- Requirements: quantity, period (days), and unit rate for one-time T&M billing.
-- client_price remains the total (source of truth); these columns support invoice line breakdown and display.

ALTER TABLE requirements
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS period_days INTEGER,
  ADD COLUMN IF NOT EXISTS unit_rate NUMERIC(14, 2);

COMMENT ON COLUMN requirements.quantity IS 'e.g. headcount or number of units; used with period_days for T&M';
COMMENT ON COLUMN requirements.period_days IS 'e.g. days supplied; one-time T&M only';
COMMENT ON COLUMN requirements.unit_rate IS 'rate per unit per period (or per unit for goods); optional when client_price is total';
