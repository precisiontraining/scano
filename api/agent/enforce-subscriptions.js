import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('agent_subscriptions')
    .update({ subscription_status: 'cancelled' })
    .eq('cancel_at_period_end', true)
    .lt('current_period_end', now)
    .eq('subscription_status', 'active')

  if (error) {
    console.error('enforce-subscriptions error:', error)
    return res.status(500).json({ error: error.message })
  }

  return res.json({ ok: true, ran_at: now })
}
