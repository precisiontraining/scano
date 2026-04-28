import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  const { id } = req.query

  if (!id) return res.status(400).json({ error: 'Report ID is required' })

  // Basic UUID format validation
  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid report ID format' })
  }

  const { data, error } = await supabase
    .from('reports')
    .select('id, website_url, scan_data, report_data, created_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    return res.status(404).json({ error: 'Report not found' })
  }

  return res.status(200).json(data)
}