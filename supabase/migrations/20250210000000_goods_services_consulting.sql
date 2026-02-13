-- Goods, Services, Consulting + Vendor locations + Catalog–Vendor many-to-many
-- Catalog: catalog_type (goods | services | consulting), delivery (vendor | in_house)
-- Requirements: delivery (vendor | in_house) — vendor assignment only when delivery = vendor
-- Vendors: multiple locations (vendor_locations), grouped by city
-- catalog_vendor_availability: which vendors can fulfil which catalog items (goods/services)

-- =============================================================================
-- SERVICE_CATALOG: type and delivery
-- =============================================================================
ALTER TABLE service_catalog
  ADD COLUMN IF NOT EXISTS catalog_type TEXT NOT NULL DEFAULT 'services'
    CHECK (catalog_type IN ('goods', 'services', 'consulting')),
  ADD COLUMN IF NOT EXISTS delivery TEXT NOT NULL DEFAULT 'vendor'
    CHECK (delivery IN ('vendor', 'in_house'));

COMMENT ON COLUMN service_catalog.catalog_type IS 'goods | services (vendor-sourced) | consulting (in-house)';
COMMENT ON COLUMN service_catalog.delivery IS 'vendor = fulfilled by vendor; in_house = consulting by Cornerstone';

-- After both columns exist: consulting items are in-house
UPDATE service_catalog SET delivery = 'in_house' WHERE catalog_type = 'consulting';

-- =============================================================================
-- VENDOR LOCATIONS (multiple per vendor, city for grouping)
-- =============================================================================
CREATE TABLE IF NOT EXISTS vendor_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  state TEXT,
  postal_code TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_locations_vendor_id ON vendor_locations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_locations_city ON vendor_locations(city);

ALTER TABLE vendor_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read write vendor_locations" ON vendor_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER vendor_locations_updated_at
  BEFORE UPDATE ON vendor_locations FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- =============================================================================
-- CATALOG_VENDOR_AVAILABILITY (many-to-many: catalog item <> vendors who can provide it)
-- =============================================================================
CREATE TABLE IF NOT EXISTS catalog_vendor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_catalog_id UUID NOT NULL REFERENCES service_catalog(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(service_catalog_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_vendor_availability_catalog ON catalog_vendor_availability(service_catalog_id);
CREATE INDEX IF NOT EXISTS idx_catalog_vendor_availability_vendor ON catalog_vendor_availability(vendor_id);

ALTER TABLE catalog_vendor_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read write catalog_vendor_availability" ON catalog_vendor_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- REQUIREMENTS: delivery (vendor | in_house)
-- =============================================================================
ALTER TABLE requirements
  ADD COLUMN IF NOT EXISTS delivery TEXT NOT NULL DEFAULT 'vendor'
    CHECK (delivery IN ('vendor', 'in_house'));

COMMENT ON COLUMN requirements.delivery IS 'vendor = fulfilled by assigned vendor; in_house = consulting by Cornerstone';
