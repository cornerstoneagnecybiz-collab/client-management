-- Track which requirements are included in which invoice.
-- Populated when an invoice is issued so "Suggest from fulfilled" excludes already-invoiced requirements.

CREATE TABLE invoice_requirements (
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  PRIMARY KEY (invoice_id, requirement_id)
);

CREATE INDEX idx_invoice_requirements_requirement_id ON invoice_requirements(requirement_id);

ALTER TABLE invoice_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read write invoice_requirements" ON invoice_requirements FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE invoice_requirements IS 'Snapshot of fulfilled requirement IDs per invoice; filled when invoice is issued';

-- Backfill: link existing issued/paid invoices to current fulfilled requirements (best-effort snapshot)
INSERT INTO invoice_requirements (invoice_id, requirement_id)
  SELECT i.id, r.id
  FROM invoices i
  JOIN requirements r ON r.project_id = i.project_id AND r.fulfilment_status = 'fulfilled'
  WHERE i.status IN ('issued', 'paid');
