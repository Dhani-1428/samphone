-- Coupons, flash sales, promotions
-- Prompt table: discounts

CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  name_pt VARCHAR(255),
  discount_type discount_type NOT NULL,
  customer_id UUID REFERENCES customers (id) ON DELETE CASCADE,
  product_id UUID REFERENCES products (id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories (id) ON DELETE CASCADE,
  percent_bps INTEGER CHECK (percent_bps IS NULL OR (percent_bps >= 0 AND percent_bps <= 10000)),
  fixed_amount_cents INTEGER CHECK (fixed_amount_cents IS NULL OR fixed_amount_cents >= 0),
  min_order_cents INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  stackable BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT discounts_code_unique UNIQUE (code),
  CONSTRAINT discounts_valid_range_chk CHECK (
    valid_to IS NULL OR valid_from IS NULL OR valid_to > valid_from
  ),
  CONSTRAINT discounts_value_chk CHECK (
    percent_bps IS NOT NULL OR fixed_amount_cents IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS discounts_active_idx
  ON discounts (discount_type, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS discounts_customer_idx
  ON discounts (customer_id)
  WHERE deleted_at IS NULL AND customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS discounts_code_active_idx
  ON discounts (code)
  WHERE deleted_at IS NULL AND code IS NOT NULL AND is_active = TRUE;

CREATE TABLE IF NOT EXISTS discount_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id UUID NOT NULL REFERENCES discounts (id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers (id) ON DELETE SET NULL,
  order_id UUID,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS discount_redemptions_discount_idx
  ON discount_redemptions (discount_id, redeemed_at DESC);
