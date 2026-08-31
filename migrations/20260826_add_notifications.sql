CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens (user_id);

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  reminder_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  CONSTRAINT notification_logs_user_type_date_unique UNIQUE (user_id, type, reminder_date)
);
