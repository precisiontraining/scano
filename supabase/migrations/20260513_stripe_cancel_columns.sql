ALTER TABLE agent_subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;
