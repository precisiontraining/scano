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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
  if (!uuidRegex.test(reportId)) {
    return res.status(400).json({ error: 'Invalid report ID' })
  }

  // Save email to Supabase + fetch report data for email content
  const { data: report, error: dbError } = await supabase
    .from('reports')
    .update({ email: email.toLowerCase().trim() })
    .eq('id', reportId)
    .select('website_url, scan_data')
    .single()

  if (dbError) {
    console.error('Supabase update error:', dbError.message)
    return res.status(500).json({ error: dbError.message })
  }

  const reportUrl  = `https://scano.io/report/${reportId}`
  const websiteUrl = report?.website_url || 'your website'
  const score      = report?.scan_data?.score ?? '—'
  const scoreColor = score >= 70 ? '#2a5c45' : score >= 40 ? '#d68910' : '#c0392b'
  const scoreLabel = score >= 70 ? 'Strong' : score >= 40 ? 'Needs Work' : 'Critical Issues'

  // Send email via Mailjet
  try {
    const mailjetRes = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`
        ).toString('base64'),
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: 'hello@scano.io',
              Name:  'Scano',
            },
            To: [{ Email: email }],
            Subject: `Your Scano audit — ${websiteUrl} scored ${score}/100`,
            HTMLPart: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f7f4ef;font-family:'Helvetica Neue',Arial,sans-serif;font-weight:300;color:#1c1917;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">

    <div style="margin-bottom:40px;">
      <span style="font-size:22px;font-weight:500;letter-spacing:-.01em;color:#1c1917;">Scano</span>
    </div>

    <div style="background:#ffffff;border:1px solid rgba(28,25,23,0.08);border-radius:16px;padding:36px;margin-bottom:24px;">
      <p style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#a09890;font-weight:400;margin:0 0 10px;">Your audit report</p>
      <p style="font-size:18px;font-weight:400;color:#1c1917;margin:0 0 16px;">${websiteUrl}</p>
      <p style="font-size:48px;font-weight:300;color:${scoreColor};margin:0 0 4px;line-height:1;">
        ${score}<span style="font-size:20px;color:#a09890;">/100</span>
      </p>
      <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${scoreColor};margin:0 0 28px;font-weight:400;">${scoreLabel}</p>
      <a href="${reportUrl}"
        style="display:inline-block;background:#1c1917;color:#f7f4ef;text-decoration:none;border-radius:10px;padding:14px 28px;font-size:14px;font-weight:500;letter-spacing:.02em;">
        View your full report →
      </a>
    </div>

    <p style="font-size:13px;color:#6b6460;line-height:1.75;margin:0 0 32px;">
      Bookmark this link — your report is always available here:<br>
      <a href="${reportUrl}" style="color:#2a5c45;word-break:break-all;">${reportUrl}</a>
    </p>

    <div style="border-top:1px solid rgba(28,25,23,0.08);padding-top:24px;">
      <p style="font-size:12px;color:#a09890;margin:0;line-height:1.6;">
        © 2026 Scano &nbsp;·&nbsp; You received this because you requested your audit on
        <a href="https://scano.io" style="color:#a09890;">scano.io</a>
      </p>
    </div>

  </div>
</body>
</html>`,
            TextPart: `Your Scano audit for ${websiteUrl}\n\nScore: ${score}/100 — ${scoreLabel}\n\nView your full report:\n${reportUrl}\n\n---\nScano · scano.io`,
          },
        ],
      }),
    })

    const mailData = await mailjetRes.json()
    if (!mailjetRes.ok) {
      console.error('Mailjet error:', JSON.stringify(mailData))
    } else {
      console.log('Report email sent to:', email)
    }
  } catch (e) {
    console.error('Email send error:', e.message)
    // Return ok anyway — email is saved in DB, sending failure is non-blocking
  }

  return res.status(200).json({ ok: true })
}