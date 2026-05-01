export const config = { maxDuration: 60 }

function fmtNum(n) { return n != null ? Number(n).toLocaleString() : '—' }
function fmtPct(n) { return n != null ? `${n}%` : '—' }

// Build shallow social context (all non-focus platforms)
function buildShallowCtx(platform, data, benchmarkData) {
  if (!data) return `${platform}: not provided`
  switch (platform) {
    case 'TikTok':
      return `TikTok: ${fmtNum(data.followers)} followers | ${fmtNum(data.avgViews)} avg views | ${fmtPct(data.engagementRate)} engagement${benchmarkData?.tiktokIsNewAccount ? ' [NEW ACCOUNT]' : ''}`
    case 'Instagram':
      return `Instagram: ${fmtNum(data.followers)} followers | ${fmtNum(data.avgLikes)} avg likes | ${fmtPct(data.engagementRate)} engagement${benchmarkData?.instagramIsNewAccount ? ' [NEW ACCOUNT]' : ''}`
    case 'YouTube':
      return `YouTube: ${fmtNum(data.subscribers)} subscribers | ${fmtNum(data.avgViews)} avg views`
    case 'X/Twitter':
      return `X/Twitter: ${fmtNum(data.followers)} followers | ${fmtNum(data.avgLikes)} avg likes`
    case 'Facebook':
      return `Facebook: ${fmtNum(data.followers)} followers | ${fmtPct(data.engagementRate)} engagement${benchmarkData?.facebookIsNewAccount ? ' [NEW ACCOUNT]' : ''}`
    default: return `${platform}: data available`
  }
}

// Build deep analysis block for the focus platform
function buildDeepCtx(focusPlatform, data) {
  if (!data?.deepAnalysis) return ''
  const d = data.deepAnalysis

  const lines = [`\n--- DEEP DIVE: ${focusPlatform.toUpperCase()} (Focus Platform — 30 posts analyzed) ---`]

  // Posting times
  if (d.postingTimes) {
    const pt = d.postingTimes
    lines.push(`BEST POSTING TIMES (by avg engagement, UTC):`)
    if (pt.bestHours?.length) lines.push(`  Best hours: ${pt.bestHours.map(h => `${h.label} (avg ${fmtNum(h.avgEng)} eng, ${h.posts} posts)`).join(', ')}`)
    if (pt.worstHours?.length) lines.push(`  Worst hours: ${pt.worstHours.map(h => `${h.label} (avg ${fmtNum(h.avgEng)} eng)`).join(', ')}`)
    if (pt.bestDays?.length)  lines.push(`  Best days: ${pt.bestDays.map(d => `${d.label} (avg ${fmtNum(d.avgEng)} eng)`).join(', ')}`)
    lines.push(`  Based on ${pt.totalAnalyzed} posts with timestamps`)
  }

  // Content mix
  if (d.contentMix?.length) {
    lines.push(`CONTENT MIX:`)
    d.contentMix.forEach(c => lines.push(`  ${c.label}: ${c.count} posts (${c.pct}%) — avg ${fmtNum(c.avgEng)} engagement`))
  }

  // Hook mix
  if (d.hookMix?.length) {
    lines.push(`HOOK TYPES USED:`)
    d.hookMix.forEach(h => lines.push(`  ${h.label}: ${h.count} posts (${h.pct}%) — avg ${fmtNum(h.avgEng)} engagement`))
  }

  // Hashtags
  if (d.hashtagAnalysis) {
    const ha = d.hashtagAnalysis
    if (ha.topByFrequency?.length) lines.push(`MOST USED HASHTAGS: ${ha.topByFrequency.slice(0,8).map(h => `${h.tag} (×${h.uses})`).join(', ')}`)
    if (ha.topByEngagement?.length) lines.push(`HASHTAGS WITH HIGHEST AVG ENGAGEMENT: ${ha.topByEngagement.map(h => `${h.tag} (avg ${fmtNum(h.avgEng)})`).join(', ')}`)
  }

  // Top posts/videos for the deep platform (up to 10)
  const posts = data.topVideos || data.topPosts || data.topTweets || []
  if (posts.length) {
    lines.push(`TOP ${Math.min(posts.length, 10)} POSTS/VIDEOS:`)
    posts.slice(0, 10).forEach((p, i) => {
      const caption = p.caption || p.text || p.title || ''
      const eng1    = p.views != null ? `${fmtNum(p.views)} views` : ''
      const eng2    = p.likes != null ? `${fmtNum(p.likes)} likes` : p.avgLikes != null ? `${fmtNum(p.avgLikes)} avg likes` : ''
      const eng3    = p.comments != null ? `${p.comments} comments` : ''
      const stats   = [eng1, eng2, eng3].filter(Boolean).join(', ')
      lines.push(`  ${i+1}. [${p.hookType ? p.hookType.toUpperCase() : '?'} hook | ${p.contentType || '?'}] "${caption.slice(0,120)}" — ${stats}`)
    })
  }

  lines.push(`--- END DEEP DIVE ---\n`)
  return lines.join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { scanData, websiteUrl } = req.body
  if (!scanData) return res.status(400).json({ error: 'scanData required' })

  const { website, content, tiktok, instagram, youtube, twitter, facebook, focusPlatform, benchmarkData } = scanData
  const isSPA = content?.copy?.isSPA === true

  const hasSocial = tiktok || instagram || youtube || twitter || facebook

  // Map platform key → display name and data
  const platformMap = {
    tiktok:    { label: 'TikTok',    data: tiktok },
    instagram: { label: 'Instagram', data: instagram },
    youtube:   { label: 'YouTube',   data: youtube },
    twitter:   { label: 'X/Twitter', data: twitter },
    facebook:  { label: 'Facebook',  data: facebook },
  }

  // Build shallow context for all platforms
  const shallowLines = Object.entries(platformMap).map(([key, { label, data }]) =>
    key === focusPlatform ? null : buildShallowCtx(label, data, benchmarkData)
  ).filter(Boolean)

  // Build deep context for focus platform
  const focusData  = focusPlatform ? platformMap[focusPlatform]?.data : null
  const focusLabel = focusPlatform ? platformMap[focusPlatform]?.label : null
  const deepCtx    = focusPlatform && focusData ? buildDeepCtx(focusLabel, focusData) : ''

  // Top posts for non-deep platforms (up to 5 each, for hook analysis)
  const tiktokTopVideos = (!focusPlatform || focusPlatform !== 'tiktok') && tiktok?.topVideos?.length
    ? tiktok.topVideos.slice(0, 5).map((v, i) => `  Video ${i+1}: "${v.caption.slice(0,100)}" — ${fmtNum(v.views)} views, ${fmtNum(v.likes)} likes [${v.hookType} hook]`).join('\n')
    : null
  const igTopPosts = (!focusPlatform || focusPlatform !== 'instagram') && instagram?.topPosts?.length
    ? instagram.topPosts.slice(0, 5).map((p, i) => `  Post ${i+1}: "${p.caption.slice(0,100)}" — ${fmtNum(p.likes)} likes [${p.hookType} hook]`).join('\n')
    : null

  // Which platform has hookable posts for the report (prefer focus, then tiktok, then ig)
  const hookPlatform = focusPlatform || (tiktok ? 'tiktok' : instagram ? 'instagram' : null)
  const hookPosts    = focusData?.topVideos || focusData?.topPosts || tiktok?.topVideos || instagram?.topPosts || []
  const hasHookData  = hookPosts.length > 0

  // Caption rewrite: worst-performing post from the focus (or fallback)
  const captionSourcePlatform = focusLabel || (tiktok ? 'TikTok' : instagram ? 'Instagram' : null)
  const worstPost = hookPosts.length > 1
    ? [...hookPosts].sort((a, b) => (a.likes || a.views || 0) - (b.likes || b.views || 0))[0]
    : hookPosts[0] || null

  const prompt = `You are a premium business analyst. Your client is a business owner — NOT a developer or marketer. Write everything in plain English a non-technical person can act on immediately.

BANNED WORDS — never use these: "canonical", "Open Graph", "LCP", "FCP", "CLS", "TBT", "engagement rate", "benchmark", "percentile", "deviation", "metric", "SPA", "JS-rendered", "structured data", "schema.org", "hook type"

USE THESE INSTEAD:
- LCP/page load → "how long your site takes to load"
- engagement rate → "how often people like or comment"
- benchmark → "compared to similar businesses"
- hook type → "how the post starts" or describe it directly

TONE: Talk WITH the user, not about them. "Your site takes 6 seconds to load — that's 3x slower than Google wants" is good. "The LCP metric indicates suboptimal performance" is banned.

NEW ACCOUNT RULE: If a social account has under 500 followers or under 15 posts, NEVER mark it as Critical. Give encouraging, realistic growth advice instead.

${focusPlatform ? `FOCUS PLATFORM RULE: The user chose ${focusLabel} as their main focus. The deepAnalysis section in the JSON output must be especially detailed — minimum 4 sentences, with specific numbers from the data. Reference actual posting times, the best content types, and the hook patterns that work.` : ''}

---
WEBSITE: ${websiteUrl}
OVERALL SCORE: ${scanData.score}/100
INDUSTRY: ${benchmarkData?.industryLabel || 'General Business'}
${focusPlatform ? `FOCUS PLATFORM (deep analysis): ${focusLabel}` : ''}

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
- Page title: "${content.seo.title}" (${content.seo.titleLength} chars — ideal 30–65)
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

SOCIAL MEDIA (overview):
${shallowLines.join('\n') || 'No social data provided'}
${tiktokTopVideos ? `TikTok top videos:\n${tiktokTopVideos}` : ''}
${igTopPosts ? `Instagram top posts:\n${igTopPosts}` : ''}

${deepCtx}

BENCHMARK COMPARISONS:
${benchmarkData?.benchmarks?.length > 0
  ? benchmarkData.benchmarks.map(b => `${b.platform} ${b.metric}: yours=${b.yours} vs industry avg=${b.benchmark} (${b.diff} ${b.direction} average)${b.percentileLabel ? ` — ${b.percentileLabel}` : ''}`).join('\n')
  : 'No benchmark data'}
---

Return ONLY valid JSON (no markdown, no explanation, no backticks):

{
  "headline": "One plain-English sentence under 12 words showing the biggest opportunity. Include a number.",
  "summary": "3 sentences. Sentence 1: what their score means for their business in everyday language. Sentence 2: the single biggest problem explained as a business consequence. Sentence 3: the most important first action.",
  "websiteAnalysis": "3 plain-English sentences about their website. Each: name the problem simply, explain the business impact, give the exact fix.",
  "copyAnalysis": "2 sentences. If headline exists, quote it. Say whether it tells visitors what they GAIN — and if not, give a specific rewrite example.",
  "copyRewrite": {
    "headlineOriginal": "their current headline or empty string if none",
    "headlineRewritten": "A better headline focusing on what the customer gains — concrete and specific",
    "ctaOriginal": "their current CTA button text or empty string",
    "ctaRewritten": "A more compelling CTA that creates urgency or shows benefit"
  },
  "brandClarity": {
    "score": 7,
    "verdict": "One sentence: can a stranger understand in 5 seconds what this business does and who it's for?",
    "improvement": "One specific thing to add or change to make it instantly clear"
  },
  "socialAnalysis": ${hasSocial ? '"3 plain-English sentences about their social media overall. State what the data shows, what it means for their business, what to do about it."' : 'null'},
  ${focusPlatform ? `"deepAnalysis": {
    "platform": "${focusLabel}",
    "summary": "3–4 sentences giving an honest, specific assessment of their ${focusLabel} presence based on the deep data. Reference actual numbers.",
    "postingTimeInsight": ${focusData?.deepAnalysis?.postingTimes ? `"One concrete actionable sentence about their best posting times. Name the actual best hours and days from the data. Say what they should do differently."` : 'null'},
    "contentMixInsight": ${focusData?.deepAnalysis?.contentMix ? `"One sentence about what content type works best for them and what they should post more or less of — with specific percentages or numbers."` : 'null'},
    "hookInsight": ${focusData?.deepAnalysis?.hookMix ? `"One sentence about which style of opening (question, warning, story, list, etc.) gets the most likes/comments for them — and a concrete recommendation."` : 'null'},
    "hashtagInsight": ${focusData?.deepAnalysis?.hashtagAnalysis ? `"One sentence about their hashtag strategy — are they using the right ones? Which specific tags drive the most engagement and what should they add or drop?"` : 'null'},
    "topRecommendation": "The single most impactful thing they should change on ${focusLabel} based on all the deep data. Be very specific — name content type, timing, and hook style together."
  },` : ''}
  "hookAnalysis": ${hasHookData ? `[
    {
      "platform": "${captionSourcePlatform?.toLowerCase() || 'tiktok'}",
      "caption": "first 80 chars of the post caption",
      "views": 0,
      "likes": 0,
      "verdict": "works or needs-work",
      "reason": "One sentence: why this post did well or didn't — be specific about how it opens or what it promises",
      "improvement": "One sentence: exactly how to make the next post better based on this"
    }
  ] — include the top 3 posts from the focus platform (or best available) with real caption text and real numbers` : '[]'},
  "captionRewrite": ${worstPost ? `{
    "platform": "${captionSourcePlatform?.toLowerCase() || 'tiktok'}",
    "original": "${(worstPost.caption || worstPost.text || worstPost.title || '').slice(0,200).replace(/"/g, '\\"')}",
    "rewritten": "A complete rewrite of that caption with a strong opening, clear value, and call-to-action",
    "explanation": "One sentence: what you changed and why it will perform better"
  }` : 'null'},
  "topIssues": [
    {
      "severity": "critical",
      "title": "Max 6 plain-English words — the real business problem",
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
    { "timeframe": "Right now (10 min)", "action": "The single fastest thing they can do today", "impact": "What will immediately improve" },
    { "timeframe": "This week (1-2 hours)", "action": "A medium effort fix with meaningful impact", "impact": "What will improve and roughly by how much" },
    { "timeframe": "This month", "action": "A bigger strategic change worth doing", "impact": "The expected business result" }
  ]
}`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://scano.io'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: 'OpenRouter error', details: data })

    const text = data.choices?.[0]?.message?.content || ''
    const jsonStart = text.indexOf('{')
    const jsonEnd   = text.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) return res.status(500).json({ error: 'No JSON in response', raw: text.slice(0, 200) })

    let report
    try { report = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) }
    catch (e) { return res.status(500).json({ error: 'JSON parse failed', details: e.message, raw: text.slice(0, 400) }) }

    res.status(200).json({ report })
  } catch (e) {
    console.error('Premium report error:', e.message)
    res.status(500).json({ error: 'Failed to generate report', details: e.message })
  }
}