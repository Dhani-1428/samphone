-- Samphone app tables (users, orders, wholesale, notifications)
-- Run against u552904336_samappdb (same DB as the WooCommerce clone).
-- u552904336_appdb is retired — do not use it.

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL DEFAULT '',
  hashed_password VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  address TEXT,
  city VARCHAR(100) NOT NULL DEFAULT '',
  postal_code VARCHAR(20) NOT NULL DEFAULT '',
  is_wholesale TINYINT(1) NOT NULL DEFAULT 0,
  wholesale_status ENUM('pending', 'approved', 'rejected') NULL,
  business_name VARCHAR(255) NOT NULL DEFAULT '',
  vat_number VARCHAR(100) NOT NULL DEFAULT '',
  company_address TEXT,
  rejection_reason TEXT NULL,
  approved_at DATETIME NULL,
  approved_by VARCHAR(36) NULL,
  dealer_tier ENUM('standard', 'silver', 'gold', 'platinum') NOT NULL DEFAULT 'standard',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_wholesale_status (wholesale_status),
  INDEX idx_users_role (role)
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(32) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  customer_email VARCHAR(255) NOT NULL DEFAULT '',
  customer_name VARCHAR(255) NOT NULL DEFAULT '',
  items JSON NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  address TEXT,
  city VARCHAR(100) NOT NULL DEFAULT '',
  postal_code VARCHAR(20) NOT NULL DEFAULT '',
  payment_method VARCHAR(32) NOT NULL DEFAULT 'delivery',
  status VARCHAR(32) NOT NULL DEFAULT 'order_placed',
  tracking_number VARCHAR(32) NULL,
  carrier VARCHAR(128) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_created (created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  kind VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS stock_notifications (
  product_id VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id, email)
);

CREATE TABLE IF NOT EXISTS app_meta (
  meta_key VARCHAR(64) PRIMARY KEY,
  meta_value TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
