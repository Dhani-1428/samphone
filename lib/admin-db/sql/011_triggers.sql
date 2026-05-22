-- Auto-update updated_at on row changes

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users',
    'vat_rules',
    'brands',
    'categories',
    'products',
    'product_images',
    'product_variants',
    'customers',
    'customer_addresses',
    'customer_prices',
    'discounts',
    'orders',
    'order_items',
    'order_refunds',
    'warehouses',
    'inventory_stock',
    'gdpr_requests'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t,
      t
    );
  END LOOP;
END $$;
