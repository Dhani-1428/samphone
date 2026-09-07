-- DPD shipment records (labels stored on local disk under DPD_LABEL_STORAGE_DIR)
CREATE TABLE IF NOT EXISTS shipments (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  carrier VARCHAR(32) NOT NULL DEFAULT 'dpd',
  num_guia VARCHAR(64) NULL,
  label_path VARCHAR(512) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'created',
  raw_response JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shipments_num_guia (num_guia),
  INDEX idx_shipments_order (order_id),
  INDEX idx_shipments_status (status)
);
