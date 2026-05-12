import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function handleCheckout(req, res) {
  const { type, userId } = req.body

  if (type !== 'full_scan' && type !== 'subscription') {
    return res.status(400).json({ error: 'Invalid type. Must be full_scan or subscription' })
  }

  const APP_URL = process.env.VITE_APP_URL || 'https://www.velyr.io'

  try {
    let session
    if (type === 'full_scan') {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Velyr Full Scan Report',
              description: 'Complete website & social audit with all 5 priority actions, deep social analysis, caption rewrites, and benchmarks.',
            },
            unit_amount: 900,
          },
          quantity: 1,
        }],
        success_url: `${APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&type=full_scan`,
        cancel_url: `${APP_URL}/pricing`,
        client_reference_id: userId || null,
        metadata: { type: 'full_scan' },
      })
    } else {
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Velyr Growth Agent',
              description: 'Autonomous weekly improvements — Claude opens a GitHub PR every Monday for your highest-impact fix.',
            },
            unit_amount: 2900,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        success_url: `${APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&type=subscription`,
        cancel_url: `${APP_URL}/pricing`,
        client_reference_id: userId || null,
        metadata: { type: 'subscription' },
      })
    }

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return res.status(500).json({ error: err.message })
  }
}

async function handlePortal(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' })

  const { data: profile } = await supabase
    .from('agent_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return res.status(400).json({ error: 'No Stripe customer found for this user' })
  }

  const APP_URL = process.env.VITE_APP_URL || 'https://www.velyr.io'

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${APP_URL}/dashboard`,
    })
    return res.status(200).json({ url: portalSession.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    return res.status(500).json({ error: err.message })
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const action = req.query?.action || req.body?.action

  if (action === 'checkout') return handleCheckout(req, res)
  if (action === 'portal')   return handlePortal(req, res)

  return res.status(400).json({ error: 'Invalid action. Use ?action=checkout or ?action=portal' })
}
