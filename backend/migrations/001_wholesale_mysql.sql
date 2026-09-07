-- Wholesale Access System — MySQL migration
-- Run against your eCommerce database when migrating from in-memory/Mongo to MySQL.

-- ---------------------------------------------------------------------------
-- Users: wholesale account fields
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN isWholesale BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN wholesaleStatus ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN businessName VARCHAR(255) NULL,
  ADD COLUMN vatNumber VARCHAR(100) NULL,
  ADD COLUMN companyAddress TEXT NULL,
  ADD COLUMN rejectionReason TEXT NULL,
  ADD COLUMN approvedAt DATETIME NULL,
  ADD COLUMN approvedBy INT NULL,
  ADD CONSTRAINT fk_users_approved_by FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_users_wholesale_status ON users (wholesaleStatus);

-- ---------------------------------------------------------------------------
-- Products: retail + wholesale pricing
-- ---------------------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN retailPrice DECIMAL(10, 2) NULL,
  ADD COLUMN wholesalePrice DECIMAL(10, 2) NULL,
  ADD COLUMN minimumWholesaleQuantity INT NOT NULL DEFAULT 1,
  ADD COLUMN dealerOnly BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN wholesaleDiscount DECIMAL(5, 2) NULL,
  ADD COLUMN dealerTier ENUM('standard', 'silver', 'gold', 'platinum') NOT NULL DEFAULT 'standard';

-- Backfill retail from legacy price column
UPDATE products SET retailPrice = price WHERE retailPrice IS NULL;

-- ---------------------------------------------------------------------------
-- Notifications (optional — if not already present)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id)
);

-- ---------------------------------------------------------------------------
-- Dealer tier pricing (future: Silver / Gold / Platinum)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dealer_tier_discounts (
  tier ENUM('standard', 'silver', 'gold', 'platinum') PRIMARY KEY,
  discount_percent DECIMAL(5, 2) NOT NULL DEFAULT 12.00
);

INSERT INTO dealer_tier_discounts (tier, discount_percent) VALUES
  ('standard', 12.00),
  ('silver', 15.00),
  ('gold', 18.00),
  ('platinum', 22.00)
ON DUPLICATE KEY UPDATE discount_percent = VALUES(discount_percent);
