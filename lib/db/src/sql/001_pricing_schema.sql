-- Samphone Customer Specific Pricing — PostgreSQL schema
-- Portugal EUR / IVA — GDPR-ready timestamps (UTC)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- VAT rules (Portuguese IVA)
CREATE TABLE IF NOT EXISTS vat_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(8) NOT NULL,
  name VARCHAR(128) NOT NULL,
  rate_bps INTEGER NOT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'PT',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  customer_type VARCHAR(32) NOT NULL DEFAULT 'retail',
  locale VARCHAR(8) NOT NULL DEFAULT 'pt-PT',
  vat_number VARCHAR(32),
  gdpr_consent_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers (email);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  woo_category_id INTEGER UNIQUE,
  slug VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  woo_product_id INTEGER UNIQUE,
  sku VARCHAR(64),
  name VARCHAR(512) NOT NULL,
  category_id UUID REFERENCES categories(id),
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  vat_rule_id UUID REFERENCES vat_rules(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS products_woo_idx ON products (woo_product_id);

CREATE TABLE IF NOT EXISTS customer_product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  woo_product_id INTEGER,
  rule_type VARCHAR(32) NOT NULL,
  fixed_price_cents INTEGER,
  percent_bps INTEGER,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  max_quantity INTEGER,
  vat_mode VARCHAR(16) NOT NULL DEFAULT 'inclusive',
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS cpp_customer_product_idx ON customer_product_prices (customer_id, product_id);
CREATE INDEX IF NOT EXISTS cpp_customer_woo_idx ON customer_product_prices (customer_id, woo_product_id);

CREATE TABLE IF NOT EXISTS customer_category_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  rule_type VARCHAR(32) NOT NULL,
  fixed_price_cents INTEGER,
  percent_bps INTEGER,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ccd_customer_category_idx ON customer_category_discounts (customer_id, category_id);

CREATE TABLE IF NOT EXISTS global_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  percent_bps INTEGER NOT NULL,
  category_ids_json TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(64) NOT NULL,
  entity_id UUID NOT NULL,
  customer_id UUID REFERENCES customers(id),
  action VARCHAR(32) NOT NULL,
  snapshot_json TEXT NOT NULL,
  actor_id UUID,
  actor_email VARCHAR(320),
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pricing_history_entity_idx ON pricing_history (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'pricing_manager',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
