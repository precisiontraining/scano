import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = { api: { bodyParser: false } }

const STATE_MAP = {
  active:             'active',
  trialing:           'active',
  past_due:           'past_due',
  unpaid:             'past_due',
  canceled:           'cancelled',
  incomplete:         'incomplete',
  incomplete_expired: 'cancelled',
  paused:             'paused',
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// As of Stripe API version 2025-04-30.basil, `current_period_end` was removed
// from the Subscription object and lives on each SubscriptionItem instead.
// We're pinned to 2026-04-22.dahlia, so always read from items.data[0]; the
// top-level field is kept as a fallback only for legacy event replays.
function periodEndIso(sub) {
  const ts = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end
  return ts ? new Date(ts * 1000).toISOString() : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sig = req.headers['stripe-signature']
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' })

  let event
  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  // Idempotency: reject duplicate event deliveries
  const { error: dupErr } = await supabase
    .from('stripe_events')
    .insert({ id: event.id, type: event.type })

  if (dupErr?.code === '23505') {
    return res.status(200).json({ duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.client_reference_id
        const type = session.metadata?.type

        if (session.mode === 'payment' || type === 'full_scan') {
          if (userId) {
            await supabase
              .from('agent_subscriptions')
              .upsert({
                user_id: userId,
                full_scan_purchased: true,
                full_scan_purchased_at: new Date().toISOString(),
              }, { onConflict: 'user_id' })
          }
        } else if (session.mode === 'subscription') {
          const subscriptionId = session.subscription
          const customerId = session.customer

          if (userId && subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            await supabase
              .from('agent_subscriptions')
              .upsert({
                user_id: userId,
                stripe_customer_id: customerId,
                subscription_id: subscription.id,
                subscription_status: 'active',
                current_period_end: periodEndIso(subscription),
                cancel_at_period_end: subscription.cancel_at_period_end === true,
              }, { onConflict: 'user_id' })
          }
        }
        break
      }

      case 'customer.subscription.created': {
        const s = event.data.object
        // No user_id lookup here — this event has no metadata. The row was
        // already created (or will be created) by checkout.session.completed,
        // keyed on stripe_customer_id. If the row doesn't exist yet (event
        // ordering can vary), this UPDATE is a no-op and the
        // checkout.session.completed handler will fill in the rest.
        await supabase.from('agent_subscriptions').update({
          subscription_status:  STATE_MAP[s.status] ?? s.status,
          subscription_id:      s.id,
          current_period_end:   periodEndIso(s),
          cancel_at_period_end: s.cancel_at_period_end === true,
        }).eq('stripe_customer_id', s.customer)
        break
      }

      case 'customer.subscription.updated': {
        const s = event.data.object
        await supabase.from('agent_subscriptions').update({
          subscription_status:  STATE_MAP[s.status] ?? s.status,
          subscription_id:      s.id,
          current_period_end:   periodEndIso(s),
          cancel_at_period_end: s.cancel_at_period_end === true,
          canceled_at:          s.canceled_at
            ? new Date(s.canceled_at * 1000).toISOString()
            : null,
        }).eq('stripe_customer_id', s.customer)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await supabase
          .from('agent_subscriptions')
          .update({
            subscription_status: 'cancelled',
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : new Date().toISOString(),
          })
          .eq('stripe_customer_id', subscription.customer)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        await supabase
          .from('agent_subscriptions')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', invoice.customer)
        break
      }

      case 'invoice.payment_succeeded': {
        const inv = event.data.object
        if (['subscription_cycle', 'subscription_create'].includes(inv.billing_reason)) {
          await supabase
            .from('agent_subscriptions')
            .update({ subscription_status: 'active' })
            .eq('stripe_customer_id', inv.customer)
            .neq('subscription_status', 'cancelled')
        }
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error(`event ${event.id} ${event.type} failed:`, err?.message || String(err))
    if (err?.stack) console.error(err.stack)
    await supabase.from('stripe_events').delete().eq('id', event.id)
    return res.status(500).json({ error: 'processing failed' })
  }

  return res.status(200).json({ received: true, id: event.id })
}
