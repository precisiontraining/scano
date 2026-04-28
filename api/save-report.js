import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { scanData, reportData, websiteUrl } = req.body

  if (!scanData || !reportData || !websiteUrl) {
    return res.status(400).json({ error: 'Missing required fields: scanData, reportData, websiteUrl' })
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      scan_data:   scanData,
      report_data: reportData,
      website_url: websiteUrl,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Supabase insert error:', error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ id: data.id })
}