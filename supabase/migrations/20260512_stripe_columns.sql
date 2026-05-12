-- Add Stripe-related columns to agent_subscriptions table
ALTER TABLE agent_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS subscription_status    text,
  ADD COLUMN IF NOT EXISTS subscription_id        text,
  ADD COLUMN IF NOT EXISTS current_period_end     timestamptz,
  ADD COLUMN IF NOT EXISTS full_scan_purchased    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS full_scan_purchased_at timestamptz;
