-- Admin audit trail + GDPR request log
-- Prompt table: admin_logs

CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  user_email VARCHAR(320),
  action audit_action NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id UUID,
  description TEXT,
  before_json JSONB,
  after_json JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_logs_user_created_idx
  ON admin_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_logs_entity_idx
  ON admin_logs (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_logs_action_created_idx
  ON admin_logs (action, created_at DESC);

CREATE TABLE IF NOT EXISTS gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  request_type VARCHAR(32) NOT NULL CHECK (request_type IN ('export', 'deletion', 'rectification')),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  processed_by UUID REFERENCES users (id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  export_file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gdpr_requests_customer_status_idx
  ON gdpr_requests (customer_id, status);
