-- Seed service_catalog: add your pricing dataset here.
-- Rates as NULL = TBC. Example rows:

INSERT INTO service_catalog (service_code, category, service_name, service_type, our_rate_min, our_rate_max, commission, default_client_rate) VALUES
  ('SVC-001', 'Consulting', 'Strategy Workshop', 'workshop', 50000, 75000, 0.10, 80000),
  ('SVC-002', 'Consulting', 'Hourly Advisory', 'hourly', 3000, 5000, 0.15, 4500)
ON CONFLICT (service_code) DO NOTHING;
