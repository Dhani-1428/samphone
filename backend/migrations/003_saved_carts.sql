-- Saved carts for abandoned-cart reminder emails
CREATE TABLE IF NOT EXISTS saved_carts (
  user_id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  items JSON NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  abandoned_email_sent_at DATETIME NULL,
  converted_at DATETIME NULL,
  INDEX idx_saved_carts_reminder (updated_at, abandoned_email_sent_at, converted_at)
);
