-- Orders, line items, payments, refunds, invoices

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(32) NOT NULL,
  customer_id UUID REFERENCES customers (id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  shipping_cents INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  vat_cents INTEGER NOT NULL DEFAULT 0 CHECK (vat_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  vat_display_mode vat_display_mode NOT NULL DEFAULT 'inclusive',
  discount_id UUID REFERENCES discounts (id) ON DELETE SET NULL,
  billing_address_json JSONB,
  shipping_address_json JSONB,
  customer_email CITEXT,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(32),
  customer_notes TEXT,
  admin_notes TEXT,
  woo_order_id INTEGER,
  tracking_number VARCHAR(128),
  shipping_carrier VARCHAR(64),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  invoice_number VARCHAR(64),
  invoice_issued_at TIMESTAMPTZ,
  locale VARCHAR(8) NOT NULL DEFAULT 'pt-PT',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT orders_order_number_unique UNIQUE (order_number),
  CONSTRAINT orders_woo_unique UNIQUE (woo_order_id)
);

CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON orders (payment_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id UUID REFERENCES products (id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants (id) ON DELETE SET NULL,
  woo_product_id INTEGER,
  sku VARCHAR(64),
  product_name VARCHAR(512) NOT NULL,
  variant_name VARCHAR(255),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  unit_regular_price_cents INTEGER NOT NULL CHECK (unit_regular_price_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  vat_rate_bps INTEGER NOT NULL DEFAULT 2300,
  vat_cents INTEGER NOT NULL DEFAULT 0 CHECK (vat_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0),
  customer_price_rule_id UUID REFERENCES customer_prices (id) ON DELETE SET NULL,
  pricing_source VARCHAR(32) NOT NULL DEFAULT 'catalog',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items (product_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  from_status order_status,
  to_status order_status NOT NULL,
  note TEXT,
  changed_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_status_history_order_idx
  ON order_status_history (order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  reason TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  processed_by UUID REFERENCES users (id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_refunds_order_idx ON order_refunds (order_id);

-- Deferred FK after orders exist
ALTER TABLE discount_redemptions
  DROP CONSTRAINT IF EXISTS discount_redemptions_order_id_fkey;

ALTER TABLE discount_redemptions
  ADD CONSTRAINT discount_redemptions_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL;
