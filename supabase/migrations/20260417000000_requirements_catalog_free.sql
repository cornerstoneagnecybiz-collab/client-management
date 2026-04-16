-- Migration: Remove catalog dependency from requirements
-- Requirements become self-describing with flexible pricing types.
-- The service_catalog and catalog_vendor_availability tables are left intact (legacy data).

-- Step 1: Add new columns
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS service_name TEXT NOT NULL DEFAULT '';
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS service_category TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'fixed';

-- Step 2: Populate service_name + service_category from existing catalog join
UPDATE requirements r
SET
  service_name = COALESCE(sc.service_name, r.title),
  service_category = sc.category,
  pricing_type = CASE
    WHEN r.quantity IS NOT NULL AND r.period_days IS NOT NULL AND r.unit_rate IS NOT NULL THEN 'qty_days_rate'
    WHEN r.quantity IS NOT NULL AND r.unit_rate IS NOT NULL THEN 'qty_rate'
    WHEN r.period_days IS NOT NULL AND r.unit_rate IS NOT NULL THEN 'days_rate'
    ELSE 'fixed'
  END
FROM service_catalog sc
WHERE r.service_catalog_id = sc.id;

-- Step 3: Fill any requirements not matched to a catalog entry
UPDATE requirements SET service_name = title WHERE service_name = '';

-- Step 4: Verify — this should return 0 rows before proceeding
-- SELECT id, title, service_name, pricing_type FROM requirements WHERE service_name = '';

-- Note: service_catalog_id column is intentionally left in place for now.
-- It can be dropped in a future migration once the transition is confirmed stable.
