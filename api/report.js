export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { scanData, websiteUrl } = req.body
  if (!scanData) return res.status(400).json({ error: 'Scan data required' })

  const { website, content, tiktok, instagram, youtube, twitter, benchmarkData } = scanData

  const prompt = `You are a brutally honest but constructive business mentor. You have real data below. Write a specific, direct audit. No fluff. No generic advice. Every sentence must reference actual numbers or specific observations from the data.

Website: ${websiteUrl}
Overall Score: ${scanData.score}/100
Detected Industry: ${benchmarkData?.industryLabel || 'General Business'}

WEBSITE PERFORMANCE:
${website ? `
- Mobile Performance: ${website.performanceScore}/100
- Accessibility: ${website.accessibilityScore}/100  
- LCP: ${website.coreWebVitals?.lcp} | FCP: ${website.coreWebVitals?.fcp} | CLS: ${website.coreWebVitals?.cls}
- HTTPS: ${website.technical?.hasHttps} | Mobile optimized: ${website.technical?.mobileOptimized}
` : 'Not available'}

SEO ANALYSIS (deep scan):
${content?.seo ? `
- SEO Score: ${content.seo.score}/100
- Page Title: "${content.seo.title}" (${content.seo.titleLength} chars${content.seo.titleLength < 30 ? ' — TOO SHORT' : content.seo.titleLength > 65 ? ' — TOO LONG' : ' — good length'})
- Meta Description: ${content.seo.metaDesc ? `"${content.seo.metaDesc.slice(0,100)}..." (${content.seo.metaDescLength} chars)` : 'MISSING'}
- H1 tags: ${content.seo.h1s.length} found${content.seo.h1s.length > 0 ? `: "${content.seo.h1s[0]}"` : ''}
- H2 tags: ${content.seo.h2s.length} found${content.seo.h2s.length > 0 ? `: ${content.seo.h2s.slice(0,3).map(h => `"${h}"`).join(', ')}` : ''}
- Images without alt text: ${content.seo.imgsWithoutAlt} (alt coverage: ${content.seo.imgAltScore}%)
- Canonical tag: ${content.seo.canonicalPresent ? 'present' : 'MISSING'}
- Open Graph tags: ${content.seo.ogTitlePresent ? 'present' : 'MISSING'}
- Structured data: ${content.seo.structuredData ? 'present' : 'not found'}
- SEO issues: ${content.seo.issues.join('; ') || 'none'}
` : 'Not available'}

WEBSITE COPY & UX ANALYSIS:
${content?.copy ? `
- Copy Score: ${content.copy.score}/100
- Hero Headline: "${content.copy.heroHeadline}"
- Headline outcome-focused: ${content.copy.isOutcomeFocused ? 'YES' : 'NO — currently product/feature focused'}
- Clear CTA present: ${content.copy.hasCTA ? 'YES' : 'NO'}
- CTA button text found: ${content.copy.ctaButtons.length > 0 ? content.copy.ctaButtons.join(', ') : 'none detected'}
- Social proof visible: ${content.copy.hasSocialProof ? 'YES' : 'NO'}
- Pricing visible: ${content.copy.hasPriceVisible ? 'YES' : 'NO'}
- Page word count: ${content.copy.wordCount}
- Copy issues: ${content.copy.issues.join('; ') || 'none'}
` : 'Not available'}

SOCIAL MEDIA DATA (user-provided):
${tiktok ? `TikTok: ${tiktok.followers?.toLocaleString()} followers | ${tiktok.avgViews?.toLocaleString()} avg views | ${tiktok.engagementRate}% engagement` : 'TikTok: not provided'}
${instagram ? `Instagram: ${instagram.followers?.toLocaleString()} followers | ${instagram.avgLikes?.toLocaleString()} avg likes | ${instagram.engagementRate}% engagement` : 'Instagram: not provided'}
${youtube ? `YouTube: ${youtube.subscribers?.toLocaleString()} subscribers | ${youtube.totalViews?.toLocaleString()} avg views` : 'YouTube: not provided'}
${twitter ? `X/Twitter: ${twitter.followers?.toLocaleString()} followers` : 'Twitter: not provided'}

INDUSTRY BENCHMARKS (${benchmarkData?.industryLabel}):
${benchmarkData?.benchmarks?.length > 0 ? benchmarkData.benchmarks.map(b =>
  `${b.platform} ${b.metric}: yours ${b.yours} vs benchmark ${b.benchmark} — ${b.diff} ${b.direction} average`
).join('\n') : 'No benchmark comparison available (no social data provided)'}

Write the report in this EXACT JSON structure. Respond ONLY with valid JSON, no markdown, no extra text:
{
  "headline": "One punchy sentence — max 12 words. Reference a specific number or finding.",
  "summary": "3 sentences. Be direct and specific. Reference actual numbers from the data. Mention the industry benchmark if relevant.",
  "websiteAnalysis": "3-4 sentences. Reference specific scores and numbers. Call out the headline copy specifically if it's weak. Mention SEO issues by name.",
  "copyAnalysis": "2-3 sentences specifically about their copy and UX. Quote their actual headline. Be direct about whether it works or not.",
  "socialAnalysis": "${(tiktok || instagram || youtube) ? '3-4 sentences about social presence. Compare to benchmarks where available. Mention specific numbers.' : 'null — write null here since no social data was provided'}",
  "topIssues": [
    {"severity": "critical", "title": "Short specific title", "description": "1-2 sentences. Name the exact problem and exact fix. Reference actual data."},
    {"severity": "critical", "title": "Short specific title", "description": "1-2 sentences. Name the exact problem and exact fix."},
    {"severity": "important", "title": "Short specific title", "description": "1-2 sentences. Specific and actionable."},
    {"severity": "important", "title": "Short specific title", "description": "1-2 sentences. Specific and actionable."},
    {"severity": "quickwin", "title": "Short specific title", "description": "Can be done in under 15 minutes. Very specific instruction."}
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
        max_tokens: 1400,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('OpenRouter error:', JSON.stringify(data))
      return res.status(500).json({ error: 'OpenRouter API error', details: data })
    }

    const text = data.choices?.[0]?.message?.content || ''
    console.log('Raw AI response (first 200):', text.slice(0, 200))

    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      return res.status(500).json({ error: 'No JSON in AI response', raw: text })
    }

    let report
    try {
      report = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message)
      return res.status(500).json({ error: 'JSON parse failed', details: parseErr.message })
    }

    res.status(200).json({ report })
  } catch (e) {
    console.error('Report function error:', e.message)
    res.status(500).json({ error: 'Failed to generate report', details: e.message })
  }
}