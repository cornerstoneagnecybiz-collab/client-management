-- Clear all app data except service_catalog (catalog).
-- Run once when switching from test data to real use.
-- Order respects foreign keys (children before parents).

DELETE FROM activity_log;
DELETE FROM notifications;
DELETE FROM ledger_entries;
DELETE FROM invoice_requirements;
DELETE FROM payments_received;
DELETE FROM vendor_payouts;
DELETE FROM invoices;
DELETE FROM requirements;
DELETE FROM project_notes;
DELETE FROM project_documents;
DELETE FROM projects;
DELETE FROM catalog_vendor_availability;
DELETE FROM vendor_locations;
DELETE FROM clients;
DELETE FROM vendors;

-- service_catalog is intentionally left intact.
