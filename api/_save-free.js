import { createClient } from '@supabase/supabase-js'
import posthog from './_posthog.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { scanData, reportData, websiteUrl, handles } = req.body

  if (!scanData || !reportData || !websiteUrl) {
    return res.status(400).json({ error: 'Missing required fields: scanData, reportData, websiteUrl' })
  }

  // Save to both tables in parallel
  const [premiumResult, reportResult] = await Promise.all([
    supabase
      .from('premium_reports')
      .insert({
        scan_data:      scanData,
        report_data:    reportData,
        website_url:    websiteUrl,
        social_handles: handles || {},
      })
      .select('id')
      .single(),

    supabase
      .from('reports')
      .insert({
        scan_data:   scanData,
        report_data: reportData,
        website_url: websiteUrl,
      })
      .select('id')
      .single(),
  ])

  if (premiumResult.error) {
    console.error('premium_reports insert error:', premiumResult.error.message)
    posthog.capture({ distinctId: websiteUrl, event: 'report_save_failed', properties: { error: premiumResult.error.message } })
    return res.status(500).json({ error: premiumResult.error.message })
  }

  if (reportResult.error) {
    console.error('reports insert error:', reportResult.error.message)
    posthog.capture({ distinctId: websiteUrl, event: 'report_save_failed', properties: { error: reportResult.error.message } })
    return res.status(500).json({ error: reportResult.error.message })
  }

  posthog.capture({
    distinctId: websiteUrl,
    event: 'report_saved',
    properties: { report_id: reportResult.data.id, website_url: websiteUrl },
  })

  return res.status(200).json({ id: premiumResult.data.id })
}