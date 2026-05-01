export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { scanData, websiteUrl } = req.body
  if (!scanData) return res.status(400).json({ error: 'scanData required' })

  const { website, content, tiktok, instagram, youtube, twitter, benchmarkData } = scanData
  const isSPA = content?.copy?.isSPA === true

  // Build social context strings
  const tiktokCtx = tiktok ? `TikTok @handle: ${tiktok.followers?.toLocaleString()} followers | ${tiktok.avgViews?.toLocaleString()} avg views | ${tiktok.engagementRate}% engagement${benchmarkData?.tiktokIsNewAccount ? ' [NEW ACCOUNT — under 500 followers]' : ''}` : 'TikTok: not provided'
  const igCtx = instagram ? `Instagram: ${instagram.followers?.toLocaleString()} followers | ${instagram.avgLikes?.toLocaleString()} avg likes | ${instagram.engagementRate}% engagement${benchmarkData?.instagramIsNewAccount ? ' [NEW ACCOUNT — under 200 followers]' : ''}` : 'Instagram: not provided'

  const tiktokTopVideos = tiktok?.topVideos?.length
    ? tiktok.topVideos.slice(0, 5).map((v, i) => `  Video ${i+1}: "${v.caption.slice(0,120)}" — ${v.views?.toLocaleString()} views, ${v.likes?.toLocaleString()} likes`).join('\n')
    : null
  const igTopPosts = instagram?.topPosts?.length
    ? instagram.topPosts.slice(0, 5).map((p, i) => `  Post ${i+1}: "${p.caption.slice(0,120)}" — ${p.likes?.toLocaleString()} likes, ${p.comments} comments`).join('\n')
    : null

  const hasSocial = tiktok || instagram || youtube || twitter

  const prompt = `You are a premium business analyst. Your client is a business owner — NOT a developer or marketer. Write everything in plain English a non-technical person can act on immediately.

BANNED WORDS — never use these: "canonical", "Open Graph", "LCP", "FCP", "CLS", "TBT", "engagement rate", "benchmark", "percentile", "deviation", "metric", "SPA", "JS-rendered", "structured data", "schema.org"

USE THESE INSTEAD:
- LCP/page load → "how long your site takes to load"
- engagement rate → "how often people like or comment"
- benchmark → "compared to similar businesses"
- canonical → "duplicate page protection"

TONE: Talk WITH the user, not about them. "Your site takes 6 seconds to load — that's 3x slower than Google wants" is good. "The LCP metric indicates suboptimal performance" is banned.

NEW ACCOUNT RULE: If a social account has under 500 followers or under 15 posts, NEVER mark it as Critical. Instead give encouraging, realistic growth advice.

---
WEBSITE: ${websiteUrl}
OVERALL SCORE: ${scanData.score}/100
INDUSTRY: ${benchmarkData?.industryLabel || 'General Business'}

WEBSITE SPEED & TECH:
${website ? `- Loads in: ${website.coreWebVitals?.lcp} (Google wants under 2.5s)
- Performance score: ${website.performanceScore}/100
- Accessibility: ${website.accessibilityScore}/100
- Time before content appears: ${website.coreWebVitals?.fcp}
- Layout jumping: ${website.coreWebVitals?.cls}
- Mobile-friendly: ${website.technical?.mobileOptimized}
- Secure (HTTPS): ${website.technical?.hasHttps}` : 'Not available'}

SEO & CONTENT:
${content?.seo ? `- SEO score: ${content.seo.score}/100
- Page title: "${content.seo.title}" (${content.seo.titleLength} characters — ideal is 30–65)
- Meta description: ${content.seo.metaDesc ? `"${content.seo.metaDesc.slice(0,120)}" (${content.seo.metaDescLength} chars — ideal 120–160)` : 'MISSING'}
- Main headline (H1): ${content.seo.h1s.length > 0 ? `"${content.seo.h1s[0]}"` : 'MISSING'}
- Images without description: ${content.seo.imgsWithoutAlt} missing` : 'Not available'}

WEBSITE COPY:
${content?.copy ? `- Copy score: ${content.copy.score}/100
- Hero headline: ${content.copy.heroHeadline ? `"${content.copy.heroHeadline}"` : isSPA ? 'Could not read (JavaScript site)' : 'MISSING'}
- Outcome-focused headline: ${content.copy.isOutcomeFocused ? 'YES' : 'NO'}
- Clear call-to-action button: ${content.copy.hasCTA ? `YES — "${content.copy.ctaButtons?.join('", "')}"` : 'NO'}
- Social proof (reviews/testimonials): ${content.copy.hasSocialProof ? 'YES' : 'NO'}
- Pricing visible: ${content.copy.hasPriceVisible ? 'YES' : 'NO'}
- Word count: ${content.copy.wordCount}` : 'Not available'}

SOCIAL MEDIA:
${tiktokCtx}
${tiktok?.topVideos?.length ? `TikTok top videos:\n${tiktokTopVideos}` : ''}
${igCtx}
${instagram?.topPosts?.length ? `Instagram top posts:\n${igTopPosts}` : ''}
${youtube ? `YouTube: ${youtube.subscribers?.toLocaleString()} subscribers | ${youtube.avgViews?.toLocaleString()} avg views` : 'YouTube: not provided'}
${twitter ? `X/Twitter: ${twitter.followers?.toLocaleString()} followers` : 'X: not provided'}

BENCHMARK COMPARISONS:
${benchmarkData?.benchmarks?.length > 0 ? benchmarkData.benchmarks.map(b => `${b.platform} ${b.metric}: yours=${b.yours} vs industry avg=${b.benchmark} (${b.diff} ${b.direction} average)`).join('\n') : 'No benchmark data'}
---

Return ONLY valid JSON (no markdown, no explanation):

{
  "headline": "One plain-English sentence under 12 words showing the biggest opportunity. Include a number.",
  "summary": "3 sentences. Sentence 1: what their score means for their business in everyday language. Sentence 2: the single biggest problem explained as a business consequence. Sentence 3: the most important first action.",
  "websiteAnalysis": "3 plain-English sentences about their website. Each: name the problem simply, explain the business impact, give the exact fix.",
  "copyAnalysis": "2 sentences. If headline exists, quote it. Say whether it tells visitors what they GAIN — and if not, give a specific rewrite example.",
  "copyRewrite": {
    "headlineOriginal": "their current headline or empty string if none",
    "headlineRewritten": "A better headline that focuses on what the customer gains — concrete and specific to their business",
    "ctaOriginal": "their current CTA button text or empty string",
    "ctaRewritten": "A more compelling CTA that creates urgency or shows benefit"
  },
  "brandClarity": {
    "score": 7,
    "verdict": "One sentence: can a stranger understand in 5 seconds what this business does and who it's for?",
    "improvement": "One specific thing to add or change to make it instantly clear"
  },
  "socialAnalysis": ${hasSocial ? '"3 plain-English sentences about their social media. Each: state what the data shows, what it means for their business, what to do about it."' : 'null'},
  "hookAnalysis": ${tiktok?.topVideos?.length || instagram?.topPosts?.length ? `[
    {
      "platform": "tiktok or instagram",
      "caption": "first 80 chars of the post caption",
      "views": 0,
      "likes": 0,
      "verdict": "works or needs-work",
      "reason": "One sentence: why this post did well or didn't — be specific about the hook or caption",
      "improvement": "One sentence: exactly how to make the next post better based on this"
    }
  ] — include top 3 posts/videos that had data` : '[]'},
  "captionRewrite": ${tiktok?.topVideos?.[0] || instagram?.topPosts?.[0] ? `{
    "platform": "tiktok or instagram",
    "original": "the worst-performing post caption (or shortest/least engaging)",
    "rewritten": "A complete rewrite of that caption with a strong hook, value, and CTA",
    "explanation": "One sentence: what you changed and why it will perform better"
  }` : 'null'},
  "topIssues": [
    {
      "severity": "critical",
      "title": "Max 6 plain-English words — the real business problem, not the tech symptom",
      "description": "1-2 sentences. Plain English. What is wrong → what it costs the business → exactly how to fix it. Include a number."
    },
    {
      "severity": "critical",
      "title": "Max 6 words",
      "description": "Same format — no jargon."
    },
    {
      "severity": "important",
      "title": "Max 6 words",
      "description": "Same format."
    },
    {
      "severity": "important",
      "title": "Max 6 words",
      "description": "Same format."
    },
    {
      "severity": "quickwin",
      "title": "Max 6 words — something fixable today in under 15 minutes",
      "description": "Exact step-by-step instruction. Say what it will improve and approximately by how much."
    }
  ],
  "effortPlan": [
    { "timeframe": "Right now (10 min)", "action": "The single fastest thing they can do today with a browser or phone", "impact": "What will immediately improve" },
    { "timeframe": "This week (1-2 hours)", "action": "A medium effort fix that will have meaningful impact", "impact": "What will improve and roughly by how much" },
    { "timeframe": "This month", "action": "A bigger strategic change worth doing", "impact": "The expected business result" }
  ]
}`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://scano.io' },
      body: JSON.stringify({ model: 'anthropic/claude-sonnet-4-5', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] })
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: 'OpenRouter error', details: data })

    const text = data.choices?.[0]?.message?.content || ''
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) return res.status(500).json({ error: 'No JSON in response', raw: text.slice(0, 200) })

    let report
    try { report = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) }
    catch (e) { return res.status(500).json({ error: 'JSON parse failed', details: e.message }) }

    res.status(200).json({ report })
  } catch (e) {
    console.error('Premium report error:', e.message)
    res.status(500).json({ error: 'Failed to generate report', details: e.message })
  }
}