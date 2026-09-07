-- Public (B2C) accessory prices — personal accounts only.
-- Business accounts keep live WooCommerce / wholesale cost from postmeta.
-- Run against u552904336_samappdb. Safe to re-run (ALTER may error if columns exist).

-- ADD these if missing (ignore duplicate-column errors):
-- ALTER TABLE samphone_b2c_pricing ADD COLUMN public_price DECIMAL(12,2) NULL;
-- ALTER TABLE samphone_b2c_pricing ADD COLUMN business_price DECIMAL(12,2) NULL;

CREATE TABLE IF NOT EXISTS samphone_b2c_pricing (
  product_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  b2c_price DECIMAL(12,2) NULL,
  public_price DECIMAL(12,2) NULL,
  business_price DECIMAL(12,2) NULL,
  markup DECIMAL(10,4) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS samphone_public_price_bands (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  cost_min DECIMAL(12,2) NOT NULL,
  cost_max DECIMAL(12,2) NOT NULL,
  public_price DECIMAL(12,2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_band_range (cost_min, cost_max)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO samphone_public_price_bands (cost_min, cost_max, public_price, sort_order) VALUES
  (0.00, 1.90, 4.90, 0),
  (1.90, 2.50, 6.90, 1),
  (2.50, 3.00, 7.90, 2),
  (3.00, 4.00, 8.90, 3),
  (4.00, 5.00, 9.90, 4),
  (5.00, 7.00, 12.90, 5),
  (7.00, 8.00, 14.90, 6),
  (8.00, 9.00, 17.50, 7),
  (9.00, 10.00, 19.90, 8),
  (10.00, 12.00, 22.50, 9),
  (12.00, 15.00, 24.90, 10),
  (15.00, 18.00, 29.90, 11),
  (18.00, 23.00, 34.90, 12),
  (23.00, 30.00, 44.90, 13),
  (30.00, 35.00, 49.90, 14),
  (35.00, 40.00, 59.90, 15),
  (40.00, 45.00, 69.90, 16),
  (45.00, 50.00, 79.90, 17),
  (50.00, 60.00, 89.90, 18),
  (60.00, 70.00, 99.90, 19),
  (70.00, 80.00, 119.90, 20),
  (80.00, 90.00, 129.90, 21)
ON DUPLICATE KEY UPDATE
  public_price = VALUES(public_price),
  sort_order = VALUES(sort_order);
