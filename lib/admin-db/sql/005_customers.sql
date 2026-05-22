-- Storefront customers (B2C / B2B / dealer) + GDPR

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(128),
  last_name VARCHAR(128),
  company_name VARCHAR(255),
  customer_type customer_type NOT NULL DEFAULT 'retail',
  phone VARCHAR(32),
  locale VARCHAR(8) NOT NULL DEFAULT 'pt-PT',
  vat_number VARCHAR(32),
  is_vat_exempt BOOLEAN NOT NULL DEFAULT FALSE,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_reason TEXT,
  gdpr_consent_at TIMESTAMPTZ,
  gdpr_marketing_consent_at TIMESTAMPTZ,
  gdpr_data_processing_consent_at TIMESTAMPTZ,
  data_export_requested_at TIMESTAMPTZ,
  data_deletion_requested_at TIMESTAMPTZ,
  woo_customer_id INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT customers_email_unique UNIQUE (email),
  CONSTRAINT customers_woo_unique UNIQUE (woo_customer_id)
);

CREATE INDEX IF NOT EXISTS customers_type_idx ON customers (customer_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS customers_blocked_idx ON customers (is_blocked) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS customers_search_idx
  ON customers USING gin (
    to_tsvector('simple', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email::text, ''))
  );

CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  label VARCHAR(64) NOT NULL DEFAULT 'billing',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  full_name VARCHAR(255),
  company VARCHAR(255),
  line1 VARCHAR(255) NOT NULL,
  line2 VARCHAR(255),
  city VARCHAR(128) NOT NULL,
  postal_code VARCHAR(16) NOT NULL,
  region VARCHAR(128),
  country_code CHAR(2) NOT NULL DEFAULT 'PT',
  phone VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS customer_addresses_customer_idx
  ON customer_addresses (customer_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS customer_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  activity_type VARCHAR(64) NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_activity_customer_created_idx
  ON customer_activity (customer_id, created_at DESC);
