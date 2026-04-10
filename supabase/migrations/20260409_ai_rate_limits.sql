CREATE TABLE IF NOT EXISTS ai_rate_limits (
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_lookup
  ON ai_rate_limits (user_id, endpoint, window_start DESC);

CREATE TABLE IF NOT EXISTS ai_spend_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  input_tokens int NOT NULL,
  output_tokens int NOT NULL,
  cost_usd numeric(10,4) NOT NULL,
  called_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_spend_log_user_day
  ON ai_spend_log (user_id, called_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_spend_log_day
  ON ai_spend_log (called_at DESC);

-- RLS: only service role can read/write these tables
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_spend_log ENABLE ROW LEVEL SECURITY;
