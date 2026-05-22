-- Categories, brands, products, variants, images

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_pt VARCHAR(255),
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT brands_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS brands_active_sort_idx
  ON brands (sort_order)
  WHERE deleted_at IS NULL AND is_active = TRUE;

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES categories (id) ON DELETE SET NULL,
  woo_category_id INTEGER,
  slug VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_pt VARCHAR(255),
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  depth INTEGER NOT NULL DEFAULT 0,
  path VARCHAR(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT categories_slug_unique UNIQUE (slug),
  CONSTRAINT categories_woo_unique UNIQUE (woo_category_id)
);

CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories (parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS categories_path_idx ON categories (path) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  woo_product_id INTEGER,
  sku VARCHAR(64) NOT NULL,
  barcode VARCHAR(64),
  slug VARCHAR(255) NOT NULL,
  name VARCHAR(512) NOT NULL,
  name_pt VARCHAR(512),
  short_description TEXT,
  description TEXT,
  category_id UUID REFERENCES categories (id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands (id) ON DELETE SET NULL,
  status product_status NOT NULL DEFAULT 'draft',
  regular_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (regular_price_cents >= 0),
  sale_price_cents INTEGER CHECK (sale_price_cents IS NULL OR sale_price_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  vat_rule_id UUID REFERENCES vat_rules (id) ON DELETE SET NULL,
  vat_display_mode vat_display_mode NOT NULL DEFAULT 'inclusive',
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  manage_stock BOOLEAN NOT NULL DEFAULT TRUE,
  weight_grams INTEGER,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  meta_title VARCHAR(255),
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT products_sku_unique UNIQUE (sku),
  CONSTRAINT products_slug_unique UNIQUE (slug),
  CONSTRAINT products_woo_unique UNIQUE (woo_product_id),
  CONSTRAINT products_sale_lte_regular_chk CHECK (
    sale_price_cents IS NULL OR sale_price_cents <= regular_price_cents
  )
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS products_brand_idx ON products (brand_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS products_status_idx ON products (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS products_low_stock_idx
  ON products (stock_quantity)
  WHERE deleted_at IS NULL AND manage_stock = TRUE AND status = 'active';

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS product_images_product_idx
  ON product_images (product_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_primary_idx
  ON product_images (product_id)
  WHERE is_primary = TRUE AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  sku VARCHAR(64) NOT NULL,
  barcode VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  option_color VARCHAR(64),
  option_storage VARCHAR(64),
  option_other JSONB NOT NULL DEFAULT '{}',
  regular_price_cents INTEGER,
  sale_price_cents INTEGER,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT product_variants_sku_unique UNIQUE (sku)
);

CREATE INDEX IF NOT EXISTS product_variants_product_idx
  ON product_variants (product_id, sort_order)
  WHERE deleted_at IS NULL;
