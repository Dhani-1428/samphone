-- Warehouses, stock levels, movement logs
-- Prompt table: inventory_logs

CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255),
  city VARCHAR(128),
  postal_code VARCHAR(16),
  country_code CHAR(2) NOT NULL DEFAULT 'PT',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT warehouses_code_unique UNIQUE (code)
);

CREATE UNIQUE INDEX IF NOT EXISTS warehouses_one_default_idx
  ON warehouses (is_default)
  WHERE is_default = TRUE AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS inventory_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id) ON DELETE CASCADE,
  product_id UUID REFERENCES products (id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants (id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_stock_target_chk CHECK (
    (product_id IS NOT NULL AND variant_id IS NULL)
    OR (variant_id IS NOT NULL)
  ),
  CONSTRAINT inventory_stock_qty_chk CHECK (quantity >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_stock_warehouse_product_idx
  ON inventory_stock (warehouse_id, product_id)
  WHERE variant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_stock_warehouse_variant_idx
  ON inventory_stock (warehouse_id, variant_id)
  WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS inventory_stock_low_idx
  ON inventory_stock (warehouse_id, quantity)
  WHERE quantity <= reorder_level;

CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses (id) ON DELETE CASCADE,
  product_id UUID REFERENCES products (id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants (id) ON DELETE SET NULL,
  movement_type inventory_movement_type NOT NULL,
  quantity_delta INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reference_type VARCHAR(64),
  reference_id UUID,
  order_id UUID REFERENCES orders (id) ON DELETE SET NULL,
  note TEXT,
  performed_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_logs_warehouse_created_idx
  ON inventory_logs (warehouse_id, created_at DESC);

CREATE INDEX IF NOT EXISTS inventory_logs_product_idx
  ON inventory_logs (product_id, created_at DESC)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS inventory_logs_reference_idx
  ON inventory_logs (reference_type, reference_id);
