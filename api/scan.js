export const config = { maxDuration: 60 }

// ─── TIMEOUT WRAPPER ─────────────────────────────────────────────────────────
function withTimeout(promise, ms, fallback = null) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms))
  ])
}

// ─── WEBSITE PERFORMANCE ─────────────────────────────────────────────────────
async function analyzeWebsite(url) {
  try {
    const apiKey = process.env.PAGESPEED_API_KEY
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=seo&category=accessibility&category=best-practices&key=${apiKey}`
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(25000) })
    const data = await res.json()
    if (!data.lighthouseResult) return null
    const lhr = data.lighthouseResult
    const cats = lhr.categories
    const audits = lhr.audits
    return {
      performanceScore: Math.round((cats.performance?.score || 0) * 100),
      accessibilityScore: Math.round((cats.accessibility?.score || 0) * 100),
      coreWebVitals: {
        fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
        lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
        tbt: audits['total-blocking-time']?.displayValue || 'N/A',
        cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
      },
      technical: {
        hasHttps: url.startsWith('https'),
        mobileOptimized: audits['viewport']?.score === 1,
        noIntrusive: audits['intrusive-interstitials']?.score === 1,
        fontSizeOk: audits['font-size']?.score === 1,
        tapTargetsOk: audits['tap-targets']?.score === 1,
      }
    }
  } catch (e) {
    console.error('PageSpeed error:', e.message)
    return null
  }
}

// ─── DEEP WEBSITE ANALYSIS ───────────────────────────────────────────────────
async function analyzeWebsiteContent(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ScanoBot/1.0)' },
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) return null
    const html = await res.text()

    const rawBodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ').trim()
    const rawWordCount = rawBodyText.split(/\s+/).filter(Boolean).length
    const isSPA = rawWordCount < 50

    let enrichedText = rawBodyText
    if (isSPA) {
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
      if (nextDataMatch) {
        try {
          const nextData = JSON.parse(nextDataMatch[1])
          const nextText = JSON.stringify(nextData).replace(/[{}"\[\]:,]/g, ' ').replace(/\s+/g, ' ')
          enrichedText = enrichedText + ' ' + nextText.slice(0, 5000)
        } catch(e) {}
      }
      const dataAttrs = html.match(/data-content="([^"]{10,200})"/g) || []
      dataAttrs.forEach(a => { enrichedText += ' ' + a.replace(/data-content="|"/g, '') })
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ''
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
    const metaDesc = descMatch ? descMatch[1].trim() : ''
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || []
    const h1s = h1Match.map(h => h.replace(/<[^>]+>/g, '').trim()).filter(Boolean)
    const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || []
    const h2s = h2Match.map(h => h.replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 5)
    const imgTags = html.match(/<img[^>]+>/gi) || []
    const imgsWithoutAlt = imgTags.filter(t => !t.match(/alt=["'][^"']+["']/i)).length
    const imgAltScore = imgTags.length > 0 ? Math.round(((imgTags.length - imgsWithoutAlt) / imgTags.length) * 100) : 100
    const canonicalPresent = /<link[^>]*rel=["']canonical["']/i.test(html)
    const ogTitlePresent = /<meta[^>]*property=["']og:title["']/i.test(html)
    const ogDescPresent = /<meta[^>]*property=["']og:description["']/i.test(html)
    const structuredData = html.includes('"@context"') || html.includes("'@context'")

    const fullText = html + enrichedText
    const ctaPatterns = /buy now|get started|sign up|try free|book|schedule|contact us|shop now|order|subscribe|join|start free|get access|claim/i
    const hasCTA = ctaPatterns.test(fullText)
    const ctaButtonMatch = html.match(/<(?:button|a)[^>]*(?:class|id)[^>]*>([^<]{3,40})<\/(?:button|a)>/gi) || []
    const ctaButtons = ctaButtonMatch
      .map(b => b.replace(/<[^>]+>/g, '').trim())
      .filter(t => t.length > 2 && t.length < 50)
      .slice(0, 5)

    const socialProofPatterns = /testimonial|review|rating|customer|client|trust|verified|guarantee|result|success|transform/i
    const hasSocialProof = socialProofPatterns.test(fullText)
    const pricePatterns = /\$[\d,.]+|€[\d,.]+|£[\d,.]+|per month|\/mo|one.time|free trial/i
    const hasPriceVisible = pricePatterns.test(fullText)
    const heroHeadline = h1s[0] || ''
    const outcomeWords = /you|your|get|achieve|become|stop|start|finally|without|in \d+|results|faster|easier|transform/i
    const isOutcomeFocused = outcomeWords.test(heroHeadline)
    const wordCount = enrichedText.split(/\s+/).filter(Boolean).length

    let seoScore = 0
    if (title && title.length >= 30 && title.length <= 65) seoScore += 18
    else if (title) seoScore += 9
    if (metaDesc && metaDesc.length >= 120 && metaDesc.length <= 160) seoScore += 18
    else if (metaDesc) seoScore += 9
    if (h1s.length === 1) seoScore += 15
    else if (h1s.length > 1) seoScore += 7
    if (h2s.length >= 2) seoScore += 10
    if (imgAltScore >= 80) seoScore += 12
    else if (imgAltScore >= 50) seoScore += 6
    if (canonicalPresent) seoScore += 8
    if (ogTitlePresent && ogDescPresent) seoScore += 10
    if (structuredData) seoScore += 9

    let copyScore = 0
    if (isOutcomeFocused) copyScore += 25
    if (hasCTA) copyScore += 25
    if (hasSocialProof) copyScore += 20
    if (hasPriceVisible) copyScore += 15
    if (wordCount > 300) copyScore += 10
    if (heroHeadline.length > 10) copyScore += 5

    const seoIssues = []
    if (!title) seoIssues.push('No page title found')
    else if (title.length < 30) seoIssues.push(`Page title too short (${title.length} chars, aim for 30–65)`)
    else if (title.length > 65) seoIssues.push(`Page title too long (${title.length} chars, aim for 30–65)`)
    if (!metaDesc) seoIssues.push('No meta description found')
    else if (metaDesc.length < 120) seoIssues.push(`Meta description too short (${metaDesc.length} chars, aim for 120–160)`)
    else if (metaDesc.length > 160) seoIssues.push(`Meta description too long (${metaDesc.length} chars)`)
    if (h1s.length === 0) seoIssues.push('No H1 heading found on page')
    if (h1s.length > 1) seoIssues.push(`${h1s.length} H1 tags found — should be exactly one`)
    if (imgAltScore < 80) seoIssues.push(`${imgsWithoutAlt} image(s) missing alt text`)
    if (!canonicalPresent) seoIssues.push('No canonical tag — duplicate content risk')
    if (!ogTitlePresent) seoIssues.push('Missing Open Graph tags (social sharing preview broken)')

    const copyIssues = []
    if (!isOutcomeFocused && heroHeadline) copyIssues.push(`Headline "${heroHeadline.slice(0,60)}" is product-focused, not outcome-focused`)
    if (!hasCTA) copyIssues.push('No clear call-to-action detected above the fold')
    if (!hasSocialProof) copyIssues.push('No social proof visible (testimonials, reviews, results)')
    if (!hasPriceVisible) copyIssues.push('Pricing or offer not visible — visitors may leave without knowing the cost')

    return {
      seo: {
        score: Math.min(100, seoScore),
        title, titleLength: title.length,
        metaDesc, metaDescLength: metaDesc.length,
        h1s, h2s,
        imgAltScore, imgsWithoutAlt,
        canonicalPresent, ogTitlePresent, ogDescPresent, structuredData,
        issues: seoIssues,
      },
      copy: {
        score: Math.min(100, copyScore),
        isSPA,
        heroHeadline,
        isOutcomeFocused,
        hasCTA, ctaButtons,
        hasSocialProof,
        hasPriceVisible,
        wordCount,
        issues: copyIssues,
      },
      rawText: enrichedText.slice(0, 3000)
    }
  } catch (e) {
    console.error('Content analysis error:', e.message)
    return null
  }
}

// ─── INDUSTRY BENCHMARKS ─────────────────────────────────────────────────────
const BENCHMARKS = {
  fitness:   { tiktokEng: 4.8, igEng: 3.2, ytEng: 2.1, avgViews: 15000, label: 'Fitness & Health' },
  coaching:  { tiktokEng: 3.9, igEng: 2.8, ytEng: 1.8, avgViews: 8000,  label: 'Coaching & Education' },
  ecommerce: { tiktokEng: 2.1, igEng: 1.9, ytEng: 0.9, avgViews: 5000,  label: 'E-Commerce' },
  saas:      { tiktokEng: 1.8, igEng: 1.4, ytEng: 1.2, avgViews: 3000,  label: 'SaaS / Tech' },
  creator:   { tiktokEng: 5.2, igEng: 3.8, ytEng: 2.4, avgViews: 25000, label: 'Content Creator' },
  food:      { tiktokEng: 6.1, igEng: 4.2, ytEng: 2.8, avgViews: 20000, label: 'Food & Lifestyle' },
  beauty:    { tiktokEng: 5.5, igEng: 4.0, ytEng: 2.2, avgViews: 18000, label: 'Beauty & Fashion' },
  default:   { tiktokEng: 3.5, igEng: 2.5, ytEng: 1.5, avgViews: 8000,  label: 'General Business' },
}

function detectIndustry(url, copy) {
  const text = (url + ' ' + (copy?.heroHeadline || '') + ' ' + (copy?.rawText || '')).toLowerCase()
  if (/fitness|workout|gym|train|sport|health|weight|muscle/.test(text)) return 'fitness'
  if (/coach|mentor|course|learn|teach|educat|program/.test(text)) return 'coaching'
  if (/shop|store|product|buy|cart|order|shipping/.test(text)) return 'ecommerce'
  if (/saas|software|app|dashboard|api|platform|tool/.test(text)) return 'saas'
  if (/creator|content|video|podcast|newsletter/.test(text)) return 'creator'
  if (/food|recipe|restaurant|cafe|cook|eat/.test(text)) return 'food'
  if (/beauty|makeup|fashion|style|skincare|hair/.test(text)) return 'beauty'
  return 'default'
}

// ─── PERCENTILE CALCULATION ───────────────────────────────────────────────────
// Approximate percentile rank using a log-normal distribution assumption.
// Returns how many percent of accounts in that industry are BELOW this value.
// e.g. 68 means "better than 68% of accounts scanned"
function approxPercentile(value, benchmark, spreadFactor = 0.6) {
  if (!value || !benchmark) return null
  // log-normal CDF approximation: normalise to z-score in log space
  const logVal = Math.log(Math.max(value, 0.001))
  const logBench = Math.log(Math.max(benchmark, 0.001))
  const z = (logVal - logBench) / spreadFactor
  // Approximate normal CDF with a sigmoid
  const pct = Math.round(100 / (1 + Math.exp(-1.7 * z)))
  return Math.min(99, Math.max(1, pct))
}

function buildBenchmarkInsights(industry, tiktok, instagram) {
  const bench = BENCHMARKS[industry] || BENCHMARKS.default
  const insights = []

  if (tiktok?.engagementRate) {
    const er = parseFloat(tiktok.engagementRate)
    const pct = approxPercentile(er, bench.tiktokEng)
    const diff = ((er - bench.tiktokEng) / bench.tiktokEng * 100).toFixed(0)
    insights.push({
      platform: 'TikTok', metric: 'Engagement Rate',
      yours: `${er}%`, benchmark: `${bench.tiktokEng}%`,
      diff: Math.abs(diff) + '%', direction: er >= bench.tiktokEng ? 'above' : 'below',
      label: bench.label,
      percentile: pct,
      percentileLabel: pct ? `Better than ${pct}% of ${bench.label} accounts` : null,
    })
    if (tiktok.avgViews) {
      const vPct = approxPercentile(tiktok.avgViews, bench.avgViews)
      const vDiff = ((tiktok.avgViews - bench.avgViews) / bench.avgViews * 100).toFixed(0)
      insights.push({
        platform: 'TikTok', metric: 'Avg. Views',
        yours: tiktok.avgViews.toLocaleString(), benchmark: bench.avgViews.toLocaleString(),
        diff: Math.abs(vDiff) + '%', direction: tiktok.avgViews >= bench.avgViews ? 'above' : 'below',
        label: bench.label,
        percentile: vPct,
        percentileLabel: vPct ? `Better than ${vPct}% of ${bench.label} accounts` : null,
      })
    }
  }

  if (instagram?.engagementRate) {
    const er = parseFloat(instagram.engagementRate)
    const pct = approxPercentile(er, bench.igEng)
    const diff = ((er - bench.igEng) / bench.igEng * 100).toFixed(0)
    insights.push({
      platform: 'Instagram', metric: 'Engagement Rate',
      yours: `${er}%`, benchmark: `${bench.igEng}%`,
      diff: Math.abs(diff) + '%', direction: er >= bench.igEng ? 'above' : 'below',
      label: bench.label,
      percentile: pct,
      percentileLabel: pct ? `Better than ${pct}% of ${bench.label} accounts` : null,
    })
  }

  // Derive a performance percentile from the perf score for use in the UI
  // (passed via benchmarkData so Report.jsx can display it without re-computing)
  return { benchmarks: insights, industry, industryLabel: bench.label }
}

// ─── SCORE CALCULATION ───────────────────────────────────────────────────────
function calcScore(perf, content, social) {
  let score = 0, factors = 0
  if (perf) { const ws = Math.round((perf.performanceScore * 0.6) + (perf.accessibilityScore * 0.4)); score += ws * 0.20; factors += 0.20 }
  if (content?.seo) { score += content.seo.score * 0.20; factors += 0.20 }
  if (content?.copy) { score += content.copy.score * 0.20; factors += 0.20 }
  if (social.tiktok) {
    const er = parseFloat(social.tiktok.engagementRate) || 0
    const ts = Math.min(100, Math.round((er > 5 ? 50 : er > 3 ? 38 : er > 1 ? 24 : 10) + (social.tiktok.avgViews > 50000 ? 50 : social.tiktok.avgViews > 10000 ? 35 : social.tiktok.avgViews > 1000 ? 20 : 5)))
    score += ts * 0.20; factors += 0.20
  }
  if (social.instagram) {
    const er = parseFloat(social.instagram.engagementRate) || 0
    const is = Math.min(100, Math.round((er > 5 ? 50 : er > 3 ? 38 : er > 1 ? 24 : 10) + (social.instagram.followers > 50000 ? 50 : social.instagram.followers > 10000 ? 35 : social.instagram.followers > 1000 ? 20 : 5)))
    score += is * 0.20; factors += 0.20
  }
  return factors > 0 ? Math.round(score / factors) : 0
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { websiteUrl, manualSocial = {} } = req.body
  if (!websiteUrl) return res.status(400).json({ error: 'Website URL is required' })

  const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`
  console.log('Scan starting:', url)

  const [perf, content] = await Promise.all([
    withTimeout(analyzeWebsite(url), 25000, null),
    withTimeout(analyzeWebsiteContent(url), 12000, null),
  ])

  if (!perf && !content) {
    return res.status(422).json({
      error: 'unreachable',
      message: 'We couldn\'t reach this website. Please check the URL and try again.',
    })
  }

  const tiktok    = manualSocial.tiktok    || null
  const instagram = manualSocial.instagram || null
  const youtube   = manualSocial.youtube   || null
  const twitter   = manualSocial.twitter   || null

  const industry      = detectIndustry(url, content?.copy)
  const benchmarkData = buildBenchmarkInsights(industry, tiktok, instagram)
  const finalScore    = calcScore(perf, content, { tiktok, instagram })

  // ── Derived percentile context for the UI ──
  // Performance percentile: approx where this score sits among all mobile pages.
  // Based on CrUX distribution data: median is ~50, p75 is ~30.
  if (perf) {
    const perfPct = approxPercentile(perf.performanceScore, 45, 0.7) // median mobile perf ≈ 45
    benchmarkData.perfPercentile = perfPct
    benchmarkData.perfPercentileLabel = perfPct
      ? `Faster than ${perfPct}% of mobile pages`
      : null
    // Inverse: "slower than X%"
    benchmarkData.perfSlowerThan = perfPct ? 100 - perfPct : null
  }

  console.log('Scan done. Score:', finalScore, 'Industry:', industry, 'perfPct:', benchmarkData.perfPercentile)

  res.status(200).json({
    score: finalScore,
    website: perf,
    content,
    tiktok, instagram, youtube, twitter,
    benchmarkData,
    scannedAt: new Date().toISOString(),
  })
}