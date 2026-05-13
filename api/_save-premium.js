import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import posthog from './_posthog.js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
)

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
  : null

async function verifyGuestSession(sessionId) {
  if (!stripe || !sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) return false
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId)
    return s.payment_status === 'paid' && s.metadata?.type === 'full_scan'
  } catch (e) {
    console.error('verifyGuestSession failed:', e.message)
    return false
  }
}

async function checkPremiumAccess(req, res) {
  const sessionId = req.headers['x-session-id']
  if (sessionId) {
    if (await verifyGuestSession(sessionId)) return { id: `guest:${sessionId}`, guest: true }
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'login required' }); return null }

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) { res.status(401).json({ error: 'login required' }); return null }

  const { data: row } = await supabase
    .from('agent_subscriptions')
    .select('full_scan_purchased, subscription_status')
    .eq('user_id', user.id)
    .single()

  const allowed = row?.full_scan_purchased === true || row?.subscription_status === 'active'
  if (!allowed) { res.status(402).json({ error: 'payment required' }); return null }
  return user
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await checkPremiumAccess(req, res)
  if (!user) return

  const { scanData, reportData, websiteUrl, handles } = req.body

  if (!scanData || !reportData || !websiteUrl) {
    return res.status(400).json({ error: 'Missing required fields: scanData, reportData, websiteUrl' })
  }

  const { data, error } = await supabase
    .from('premium_reports')
    .insert({
      scan_data:      scanData,
      report_data:    reportData,
      website_url:    websiteUrl,
      social_handles: handles || {},
    })
    .select('id')
    .single()

  if (error) {
    console.error('premium_reports insert error:', error.message)
    posthog.capture({ distinctId: websiteUrl, event: 'premium_report_save_failed', properties: { error: error.message } })
    return res.status(500).json({ error: error.message })
  }

  posthog.capture({
    distinctId: websiteUrl,
    event: 'premium_report_saved',
    properties: { report_id: data.id, website_url: websiteUrl },
  })

  return res.status(200).json({ id: data.id })
}
