CREATE TABLE IF NOT EXISTS stripe_events (
  id          text PRIMARY KEY,
  type        text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
