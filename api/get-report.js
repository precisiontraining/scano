import { createClient } from '@supabase/supabase-js'
import posthog from './posthog.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  const { id, type } = req.query

  if (!id) return res.status(400).json({ error: 'Report ID is required' })

  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid report ID format' })
  }

  const isPremium = type === 'premium'
  const table     = isPremium ? 'premium_reports' : 'reports'

  const { data, error } = await supabase
    .from(table)
    .select('id, website_url, scan_data, report_data, created_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    return res.status(404).json({ error: 'Report not found' })
  }

  if (!isPremium) {
    posthog.capture({ distinctId: data.website_url, event: 'report_viewed', properties: { report_id: id } })
  }

  return res.status(200).json(data)
}