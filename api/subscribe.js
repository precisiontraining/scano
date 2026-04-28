import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { reportId, email } = req.body

  if (!reportId || !email) {
    return res.status(400).json({ error: 'reportId and email are required' })
  }

  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
  if (!uuidRegex.test(reportId)) {
    return res.status(400).json({ error: 'Invalid report ID' })
  }

  const { error } = await supabase
    .from('reports')
    .update({ email: email.toLowerCase().trim() })
    .eq('id', reportId)

  if (error) {
    console.error('Supabase update error:', error.message)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ ok: true })
}