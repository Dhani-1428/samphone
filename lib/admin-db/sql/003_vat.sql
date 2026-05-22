-- Portuguese IVA / VAT rules (invoice-ready)

CREATE TABLE IF NOT EXISTS vat_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(16) NOT NULL,
  name VARCHAR(128) NOT NULL,
  name_pt VARCHAR(128),
  rate_bps INTEGER NOT NULL CHECK (rate_bps >= 0 AND rate_bps <= 10000),
  vat_class vat_class NOT NULL DEFAULT 'standard',
  country_code CHAR(2) NOT NULL DEFAULT 'PT',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT vat_rules_code_country_unique UNIQUE (code, country_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS vat_rules_one_default_pt_idx
  ON vat_rules (country_code)
  WHERE is_default = TRUE AND deleted_at IS NULL AND country_code = 'PT';

CREATE INDEX IF NOT EXISTS vat_rules_active_idx
  ON vat_rules (country_code, is_active)
  WHERE deleted_at IS NULL;
