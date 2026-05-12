import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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
