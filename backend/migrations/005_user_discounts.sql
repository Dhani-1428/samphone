-- Per-user personal pricing discounts
CREATE TABLE IF NOT EXISTS user_discounts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  discount_type ENUM('percentage', 'fixed') NOT NULL,
  discount_value DECIMAL(12, 2) NOT NULL,
  applies_to ENUM('all', 'category', 'product') NOT NULL DEFAULT 'all',
  target_ids JSON NULL,
  reason VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  created_by VARCHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_discounts_user (user_id),
  INDEX idx_user_discounts_active (user_id, is_active, expires_at)
);
