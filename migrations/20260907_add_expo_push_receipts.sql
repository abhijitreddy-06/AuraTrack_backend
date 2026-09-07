CREATE TABLE IF NOT EXISTS expo_push_receipts (
  id UUID PRIMARY KEY,
  ticket_id VARCHAR(255) NOT NULL UNIQUE,
  token VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS expo_push_receipts_pending_idx
  ON expo_push_receipts (created_at)
  WHERE checked_at IS NULL;
