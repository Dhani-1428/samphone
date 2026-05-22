-- Portugal defaults: IVA rates + default warehouse + owner placeholder
-- Run after schema; change owner email/password in Step 5

INSERT INTO vat_rules (code, name, name_pt, rate_bps, vat_class, country_code, is_default)
VALUES
  ('PT_STD', 'Standard IVA 23%', 'IVA Normal 23%', 2300, 'standard', 'PT', TRUE),
  ('PT_INT', 'Intermediate IVA 13%', 'IVA Intermédio 13%', 1300, 'intermediate', 'PT', FALSE),
  ('PT_RED', 'Reduced IVA 6%', 'IVA Reduzido 6%', 600, 'reduced', 'PT', FALSE),
  ('PT_EXE', 'Exempt 0%', 'Isento 0%', 0, 'exempt', 'PT', FALSE)
ON CONFLICT (code, country_code) DO NOTHING;

INSERT INTO warehouses (code, name, city, postal_code, country_code, is_default)
VALUES ('LIS-01', 'Lisboa Principal', 'Lisboa', '1000-001', 'PT', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Demo customers for customer-specific pricing (João / Maria / Dealer)
INSERT INTO customers (email, first_name, last_name, customer_type, gdpr_consent_at)
VALUES
  ('joao@example.pt', 'João', 'Silva', 'b2b', NOW()),
  ('maria@example.pt', 'Maria', 'Santos', 'retail', NOW()),
  ('dealer@samphone.pt', 'Dealer', 'Partner', 'dealer', NOW())
ON CONFLICT (email) DO NOTHING;
