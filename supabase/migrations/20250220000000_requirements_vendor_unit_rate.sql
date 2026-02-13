-- Vendor unit rate for one-time T&M: expected_vendor_cost = quantity × period_days × vendor_unit_rate (same formula as client price).

ALTER TABLE requirements
  ADD COLUMN IF NOT EXISTS vendor_unit_rate NUMERIC(14, 2);

COMMENT ON COLUMN requirements.vendor_unit_rate IS 'Vendor rate per unit per period; used with quantity and period_days to compute expected_vendor_cost';
