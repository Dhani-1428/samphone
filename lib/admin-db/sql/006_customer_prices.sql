-- Customer-specific pricing (priority: product → category → sale → regular)
-- Prompt table: customer_prices

CREATE TABLE IF NOT EXISTS customer_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  target_type price_target_type NOT NULL,
  product_id UUID REFERENCES products (id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories (id) ON DELETE CASCADE,
  woo_product_id INTEGER,
  rule_type price_rule_type NOT NULL,
  fixed_price_cents INTEGER CHECK (fixed_price_cents IS NULL OR fixed_price_cents >= 0),
  percent_bps INTEGER CHECK (percent_bps IS NULL OR (percent_bps >= 0 AND percent_bps <= 10000)),
  min_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_quantity >= 1),
  max_quantity INTEGER CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
  vat_display_mode vat_display_mode NOT NULL DEFAULT 'inclusive',
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT customer_prices_rule_values_chk CHECK (
    (rule_type = 'fixed' AND fixed_price_cents IS NOT NULL AND percent_bps IS NULL)
    OR (rule_type = 'percent' AND percent_bps IS NOT NULL AND fixed_price_cents IS NULL)
  ),
  CONSTRAINT customer_prices_target_chk CHECK (
    (target_type = 'product' AND (product_id IS NOT NULL OR woo_product_id IS NOT NULL) AND category_id IS NULL)
    OR (target_type = 'category' AND category_id IS NOT NULL AND product_id IS NULL AND woo_product_id IS NULL)
  ),
  CONSTRAINT customer_prices_valid_range_chk CHECK (
    valid_to IS NULL OR valid_from IS NULL OR valid_to > valid_from
  )
);

CREATE INDEX IF NOT EXISTS customer_prices_customer_product_idx
  ON customer_prices (customer_id, product_id)
  WHERE deleted_at IS NULL AND target_type = 'product' AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS customer_prices_customer_category_idx
  ON customer_prices (customer_id, category_id)
  WHERE deleted_at IS NULL AND target_type = 'category' AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS customer_prices_customer_woo_idx
  ON customer_prices (customer_id, woo_product_id)
  WHERE deleted_at IS NULL AND woo_product_id IS NOT NULL AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS customer_prices_validity_idx
  ON customer_prices (valid_from, valid_to)
  WHERE deleted_at IS NULL AND is_active = TRUE;

-- Pricing change audit (feeds admin pricing history UI)
CREATE TABLE IF NOT EXISTS pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(64) NOT NULL,
  entity_id UUID NOT NULL,
  customer_id UUID REFERENCES customers (id) ON DELETE SET NULL,
  action audit_action NOT NULL DEFAULT 'update',
  snapshot_json JSONB NOT NULL,
  actor_id UUID REFERENCES users (id) ON DELETE SET NULL,
  actor_email VARCHAR(320),
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pricing_history_entity_idx
  ON pricing_history (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pricing_history_customer_idx
  ON pricing_history (customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;
