import { createClient } from '@supabase/supabase-js'
import posthog from './_posthog.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v)
const isStr = v => typeof v === 'string' && v.length > 0

function validatePayload({ scanData, reportData, websiteUrl }) {
  if (!isStr(websiteUrl)) return 'websiteUrl is required'
  try {
    const u = new URL(websiteUrl)
    if (!['http:', 'https:'].includes(u.protocol)) return 'websiteUrl must use http(s)'
  } catch { return 'websiteUrl is not a valid URL' }

  if (!isObj(scanData)) return 'scanData must be an object'
  if (typeof scanData.score !== 'number' || scanData.score < 0 || scanData.score > 100) return 'scanData.score must be a number between 0 and 100'
  if (!isStr(scanData.scannedAt)) return 'scanData.scannedAt is required'

  if (!isObj(reportData)) return 'reportData must be an object'
  if (!isStr(reportData.headline)) return 'reportData.headline is required'
  if (!isStr(reportData.summary)) return 'reportData.summary is required'
  if (!Array.isArray(reportData.topIssues)) return 'reportData.topIssues must be an array'

  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { scanData, reportData, websiteUrl, handles } = req.body

  const validationError = validatePayload({ scanData, reportData, websiteUrl })
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  const reportResult = await supabase
    .from('reports')
    .insert({
      scan_data:   scanData,
      report_data: reportData,
      website_url: websiteUrl,
    })
    .select('id')
    .single()

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

  return res.status(200).json({ id: reportResult.data.id })
}