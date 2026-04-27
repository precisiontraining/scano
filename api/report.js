export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { scanData, websiteUrl } = req.body

  if (!scanData) return res.status(400).json({ error: 'Scan data required' })

  const prompt = `You are a brutally honest but constructive business mentor analyzing a founder's digital presence. You've reviewed their data below. Write a direct, specific audit report — no fluff, no generic advice. Be like a smart friend who actually knows marketing.

Website: ${websiteUrl}
Overall Score: ${scanData.score}/100

WEBSITE DATA:
${scanData.website ? `
- Performance Score: ${scanData.website.performanceScore}/100
- SEO Score: ${scanData.website.seoScore}/100
- Accessibility: ${scanData.website.accessibilityScore}/100
- Core Web Vitals: FCP ${scanData.website.coreWebVitals.fcp}, LCP ${scanData.website.coreWebVitals.lcp}, CLS ${scanData.website.coreWebVitals.cls}
- Has HTTPS: ${scanData.website.technical.hasHttps}
- Has Meta Title: ${scanData.website.technical.metaTitle}
- Has Meta Description: ${scanData.website.technical.metaDescription}
- Mobile Optimized: ${scanData.website.technical.mobileOptimized}
- Issues found: ${scanData.website.issues.join(', ') || 'none'}
` : 'No website data available'}

TIKTOK DATA:
${scanData.tiktok ? `
- Followers: ${scanData.tiktok.followers}
- Average Views: ${scanData.tiktok.avgViews}
- Engagement Rate: ${scanData.tiktok.engagementRate}%
- Has Link in Bio: ${scanData.tiktok.hasLink}
- Bio: "${scanData.tiktok.bio}"
- Top video: "${scanData.tiktok.topVideos?.[0]?.desc}" (${scanData.tiktok.topVideos?.[0]?.views} views)
` : 'No TikTok data provided'}

INSTAGRAM DATA:
${scanData.instagram ? `
- Followers: ${scanData.instagram.followers}
- Engagement Rate: ${scanData.instagram.engagementRate}%
- Has Link in Bio: ${scanData.instagram.hasLink}
- Bio: "${scanData.instagram.bio}"
- Avg Likes per Post: ${scanData.instagram.avgLikes}
` : 'No Instagram data provided'}

YOUTUBE DATA:
${scanData.youtube ? `
- Subscribers: ${scanData.youtube.subscribers}
- Total Videos: ${scanData.youtube.videoCount}
` : 'No YouTube data provided'}

Write the report in this exact JSON structure (respond ONLY with valid JSON, no markdown):
{
  "headline": "One punchy sentence summarizing their biggest problem or strength (max 12 words)",
  "summary": "2-3 sentences. Be direct. What's working, what's broken, what's the pattern.",
  "websiteAnalysis": "3-4 sentences specific to their website data. Mention actual numbers.",
  "socialAnalysis": "3-4 sentences about their social presence. Mention actual numbers and patterns.",
  "topIssues": [
    {"severity": "critical", "title": "Short title", "description": "1-2 sentences. Specific fix."},
    {"severity": "critical", "title": "Short title", "description": "1-2 sentences. Specific fix."},
    {"severity": "important", "title": "Short title", "description": "1-2 sentences. Specific fix."},
    {"severity": "important", "title": "Short title", "description": "1-2 sentences. Specific fix."},
    {"severity": "quickwin", "title": "Short title", "description": "1-2 sentences. Can be done in 10 minutes."}
  ]
}`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://scano.io',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('OpenRouter error:', JSON.stringify(data))
      return res.status(500).json({ error: 'OpenRouter API error', details: data })
    }

    const text = data.choices?.[0]?.message?.content || ''
    console.log('Raw AI response:', text.slice(0, 200))

    // Extract JSON robustly — find first { and last }
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error('No JSON found in response:', text)
      return res.status(500).json({ error: 'No JSON in AI response', raw: text })
    }

    const jsonStr = text.slice(jsonStart, jsonEnd + 1)
    let report
    try {
      report = JSON.parse(jsonStr)
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message, 'String:', jsonStr.slice(0, 300))
      return res.status(500).json({ error: 'JSON parse failed', details: parseErr.message })
    }

    res.status(200).json({ report })
  } catch (e) {
    console.error('Report function error:', e.message)
    res.status(500).json({ error: 'Failed to generate report', details: e.message })
  }
}