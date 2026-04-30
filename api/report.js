export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { scanData, websiteUrl } = req.body
  if (!scanData) return res.status(400).json({ error: 'Scan data required' })

  const { website, content, tiktok, instagram, youtube, twitter, benchmarkData } = scanData

  const perfPercentile = website
    ? `${website.performanceScore}/100 — slower than ${100 - website.performanceScore}% of mobile pages`
    : null
  const tiktokEngContext = (tiktok && benchmarkData?.benchmarks?.length > 0)
    ? (() => {
        const b = benchmarkData.benchmarks.find(b => b.platform === 'TikTok' && b.metric === 'Engagement Rate')
        if (!b) return null
        const direction = b.direction === 'above'
          ? `${b.diff} above the ${benchmarkData.industryLabel} average of ${b.benchmark}`
          : `${b.diff} below the ${benchmarkData.industryLabel} average of ${b.benchmark}`
        return `${tiktok.engagementRate}% engagement — ${direction}`
      })()
    : null
  const igEngContext = (instagram && benchmarkData?.benchmarks?.length > 0)
    ? (() => {
        const b = benchmarkData.benchmarks.find(b => b.platform === 'Instagram' && b.metric === 'Engagement Rate')
        if (!b) return null
        const direction = b.direction === 'above'
          ? `${b.diff} above the ${benchmarkData.industryLabel} average of ${b.benchmark}`
          : `${b.diff} below the ${benchmarkData.industryLabel} average of ${b.benchmark}`
        return `${instagram.engagementRate}% engagement — ${direction}`
      })()
    : null
  const viewsContext = (tiktok?.avgViews && benchmarkData?.benchmarks?.length > 0)
    ? (() => {
        const b = benchmarkData.benchmarks.find(b => b.platform === 'TikTok' && b.metric === 'Avg. Views')
        if (!b) return null
        const direction = b.direction === 'above'
          ? `${b.diff} above average for ${benchmarkData.industryLabel}`
          : `${b.diff} below average for ${benchmarkData.industryLabel}`
        return `${tiktok.avgViews.toLocaleString()} avg views — ${direction}`
      })()
    : null

  // FIX 3: Tell the AI explicitly when the site is JS-rendered so it doesn't
  // invent "No Hero Headline" or "No H1" as critical issues from missing scraper data.
  const isSPA = content?.copy?.isSPA === true
  const spaNote = isSPA
    ? `\nIMPORTANT: This site is JavaScript-rendered (React/Vue/etc). The static scraper cannot read client-side DOM. Missing headline or H1 data is a SCRAPING LIMITATION — NOT a real website problem. Do NOT generate issues like "No Hero Headline", "Missing H1", or "No CTA" based on empty scraper fields. Base copy analysis only on data that is actually present.\n`
    : ''

  const prompt = `You are a data-driven performance analyst. Every sentence you write MUST follow this exact rule:

TONE AND LANGUAGE RULES — READ CAREFULLY:
Your audience is a business owner, NOT a marketer or developer. They have never heard of "canonical tags", "Open Graph", "LCP", or "CLS". Write like you're explaining to a smart friend who runs a bakery or a gym — not a tech conference.

MANDATORY for every issue or recommendation:
1. Say what the problem IS in plain English (no jargon)
2. Say why it MATTERS to their business (lost customers, lower Google ranking, etc.)
3. Say exactly what to DO to fix it — one concrete step

BANNED words and phrases (use the plain alternative):
- "Canonical" → "duplicate page protection"
- "Open Graph" → "social sharing preview"  
- "Schema.org" / "structured data" → "Google rich results"
- "LCP" → "page load speed" (you may say "your page takes X seconds to load")
- "FCP" → "time before anything appears on screen"
- "CLS" → "page layout jumping"
- "TBT" → "how long your page freezes"
- "JS-rendered" or "SPA" → never mention this to the user
- "engagement rate" → "how often people interact with your posts"
- "benchmark" → "compared to similar businesses"
- "deviation" → never use this word
- "percentile" → "out of 100 businesses like yours, X do better/worse"
- "metric" → "measurement" or just name the thing

NEVER use vague phrases like "consider improving" or "this could be better" or "may impact".
ALWAYS use specific numbers from the data.
${spaNote}
Website: ${websiteUrl}
Overall Score: ${scanData.score}/100
Industry: ${benchmarkData?.industryLabel || 'General Business'}

PERFORMANCE DATA:
${website ? `
- Mobile Performance: ${perfPercentile || website.performanceScore + '/100'}
- Accessibility: ${website.accessibilityScore}/100
- LCP: ${website.coreWebVitals?.lcp} (target: under 2.5s)
- FCP: ${website.coreWebVitals?.fcp} (target: under 1.8s)
- CLS: ${website.coreWebVitals?.cls} (target: under 0.1)
- TBT: ${website.coreWebVitals?.tbt}
- HTTPS: ${website.technical?.hasHttps} | Mobile viewport: ${website.technical?.mobileOptimized} | Intrusive popups: ${!website.technical?.noIntrusive}
` : 'Performance: not available'}

SEO DATA:
${content?.seo ? `
- Score: ${content.seo.score}/100
- Title: "${content.seo.title}" — ${content.seo.titleLength} chars (ideal: 30–65 chars)
- Meta desc: ${content.seo.metaDesc ? `"${content.seo.metaDesc.slice(0,100)}…" — ${content.seo.metaDescLength} chars (ideal: 120–160)` : 'MISSING'}
- H1s: ${content.seo.h1s.length} found (ideal: exactly 1)${content.seo.h1s.length > 0 ? ` — "${content.seo.h1s[0]}"` : ''}
- Alt coverage: ${content.seo.imgAltScore}% — ${content.seo.imgsWithoutAlt} image(s) missing alt text
- Canonical: ${content.seo.canonicalPresent ? 'present' : 'MISSING'}
- Open Graph: ${content.seo.ogTitlePresent ? 'present' : 'MISSING'}
- Structured data: ${content.seo.structuredData ? 'present' : 'MISSING'}
- Issues list: ${(content.seo.issues || []).join(' | ') || 'none'}
` : 'SEO: not available'}

COPY & UX DATA:
${content?.copy ? `
- Copy Score: ${content.copy.score}/100
- JS-rendered site: ${isSPA ? 'YES — headline/CTA data may be unavailable from static scrape' : 'NO'}
- Hero Headline: ${content.copy.heroHeadline ? `"${content.copy.heroHeadline}"` : isSPA ? 'NOT EXTRACTABLE (JS-rendered — do not flag as missing)' : 'MISSING'}
- Outcome-focused: ${content.copy.isOutcomeFocused ? 'YES' : content.copy.heroHeadline ? 'NO — currently describes the product, not the user\'s result' : isSPA ? 'UNKNOWN — JS-rendered site' : 'NO headline found'}
- CTA: ${content.copy.hasCTA ? `YES — found: ${content.copy.ctaButtons.join(', ')}` : isSPA ? 'NOT DETECTED (may exist in JS-rendered content)' : 'NO CTA detected'}
- Social proof: ${content.copy.hasSocialProof ? 'present' : 'MISSING'}
- Pricing visible: ${content.copy.hasPriceVisible ? 'YES' : 'NO'}
- Word count: ${content.copy.wordCount}
- Issues: ${(content.copy.issues || []).join(' | ') || 'none'}
` : 'Copy: not available'}

SOCIAL MEDIA + BENCHMARKS:
${tiktok ? `TikTok: ${tiktok.followers?.toLocaleString()} followers | ${viewsContext || tiktok.avgViews?.toLocaleString() + ' avg views'} | ${tiktokEngContext || tiktok.engagementRate + '% engagement'}${benchmarkData?.tiktokIsNewAccount ? ' | NOTE: NEW ACCOUNT (under 500 followers / under 15 videos) — do NOT flag low engagement as Critical. Treat as early-stage, focus on growth strategy instead.' : ''}` : 'TikTok: not provided'}
${instagram ? `Instagram: ${instagram.followers?.toLocaleString()} followers | ${instagram.avgLikes?.toLocaleString()} avg likes | ${igEngContext || instagram.engagementRate + '% engagement'}${benchmarkData?.instagramIsNewAccount ? ' | NOTE: NEW ACCOUNT (under 200 followers / under 10 posts) — do NOT flag as Critical. Focus on content consistency advice instead.' : ''}` : 'Instagram: not provided'}
${youtube ? `YouTube: ${youtube.subscribers?.toLocaleString()} subscribers` : 'YouTube: not provided'}
${twitter ? `X/Twitter: ${twitter.followers?.toLocaleString()} followers` : 'X: not provided'}

Benchmark comparisons available:
${benchmarkData?.benchmarks?.length > 0
  ? benchmarkData.benchmarks.map(b => `${b.platform} ${b.metric}: yours=${b.yours} | benchmark=${b.benchmark} | ${b.diff} ${b.direction} average`).join('\n')
  : 'No benchmark data (no social data provided)'}

Return ONLY valid JSON. No markdown. No explanation. Structure:
{
  "headline": "One sentence max 12 words. Plain English, no jargon. Must include a number. Example: 'Your site loses visitors because it takes 6 seconds to load.'",
  "summary": "Exactly 3 sentences in plain English. No jargon. Sentence 1: what the overall score means for their business in everyday language. Sentence 2: the single biggest problem — explained as a business consequence, not a technical fact. Sentence 3: the single most important thing to fix first, with a specific action.",
  "websiteAnalysis": "3 sentences in plain English. No acronyms unless immediately explained. Each sentence: name the problem in plain words, say what it costs the business, say exactly how to fix it.",
  "copyAnalysis": "2 sentences in plain English. Quote their actual headline if available. Say whether it tells visitors what they will GET or ACHIEVE — and if not, give a specific rewrite example that does.",
  "socialAnalysis": ${(tiktok || instagram || youtube) ? '"3 sentences. Each must reference a number, compare to industry benchmark, and state the exact next action."' : 'null'},
  "topIssues": [
    {
      "severity": "critical",
      "title": "Max 6 words, plain English — name the real-world problem, not the technical symptom. Bad: 'Fix LCP Score'. Good: 'Site Takes 6s to Load'",
      "description": "1–2 sentences. No jargon. Explain: what's wrong, what it costs the business, exactly how to fix it. Use a number from the data."
    },
    {
      "severity": "critical",
      "title": "Max 6 words, plain English",
      "description": "1–2 sentences. No jargon. What's wrong → business consequence → exact fix."
    },
    {
      "severity": "important",
      "title": "Max 6 words, plain English",
      "description": "1–2 sentences. No jargon. What's wrong → business consequence → exact fix."
    },
    {
      "severity": "important",
      "title": "Max 6 words, plain English",
      "description": "1–2 sentences. No jargon. What's wrong → business consequence → exact fix."
    },
    {
      "severity": "quickwin",
      "title": "Max 6 words — something fixable in under 15 minutes",
      "description": "Plain English. One specific action the business owner can take right now. Say what it will improve and roughly by how much."
    }
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
        max_tokens: 1600,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('OpenRouter error:', JSON.stringify(data))
      return res.status(500).json({ error: 'OpenRouter API error', details: data })
    }

    const text = data.choices?.[0]?.message?.content || ''
    console.log('Raw AI response (first 300):', text.slice(0, 300))

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