export const config = { maxDuration: 60 }

async function analyzeWebsite(url) {
  try {
    const apiKey = process.env.PAGESPEED_API_KEY
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=seo&category=accessibility&category=best-practices&key=${apiKey}`
    const res = await fetch(apiUrl)
    const data = await res.json()
    if (!data.lighthouseResult) return null
    const lhr = data.lighthouseResult
    const categories = lhr.categories
    const audits = lhr.audits
    const performanceScore = Math.round((categories.performance?.score || 0) * 100)
    const seoScore = Math.round((categories.seo?.score || 0) * 100)
    const accessibilityScore = Math.round((categories.accessibility?.score || 0) * 100)
    const fcp = audits['first-contentful-paint']?.displayValue || 'N/A'
    const lcp = audits['largest-contentful-paint']?.displayValue || 'N/A'
    const tbt = audits['total-blocking-time']?.displayValue || 'N/A'
    const cls = audits['cumulative-layout-shift']?.displayValue || 'N/A'
    const metaTitle = audits['document-title']?.score === 1
    const metaDescription = audits['meta-description']?.score === 1
    const hasHttps = url.startsWith('https')
    const mobileOptimized = audits['viewport']?.score === 1
    const issues = []
    if (!metaTitle) issues.push('Missing or poor meta title')
    if (!metaDescription) issues.push('Missing meta description')
    if (!hasHttps) issues.push('Not using HTTPS')
    if (!mobileOptimized) issues.push('Not mobile optimized')
    if (performanceScore < 50) issues.push('Very slow load time')
    else if (performanceScore < 70) issues.push('Performance needs improvement')
    return {
      performanceScore, seoScore, accessibilityScore,
      coreWebVitals: { fcp, lcp, tbt, cls },
      technical: { metaTitle, metaDescription, hasHttps, mobileOptimized },
      issues
    }
  } catch (e) {
    console.error('Website analysis error:', e.message)
    return null
  }
}

function calcScore(website, tiktok, instagram, youtube) {
  let score = 0, factors = 0
  if (website) {
    const ws = Math.round((website.performanceScore * 0.4) + (website.seoScore * 0.35) + (website.accessibilityScore * 0.25))
    score += ws * 0.35; factors += 0.35
  }
  if (tiktok) {
    const er = parseFloat(tiktok.engagementRate) || 0
    const ts = Math.min(100, Math.round(
      (tiktok.hasLink !== false ? 15 : 0) +
      (er > 5 ? 45 : er > 3 ? 35 : er > 1 ? 22 : 10) +
      (tiktok.avgViews > 50000 ? 40 : tiktok.avgViews > 10000 ? 30 : tiktok.avgViews > 1000 ? 18 : 5)
    ))
    score += ts * 0.25; factors += 0.25
  }
  if (instagram) {
    const er = parseFloat(instagram.engagementRate) || 0
    const is = Math.min(100, Math.round(
      (instagram.hasLink !== false ? 15 : 0) +
      (er > 5 ? 45 : er > 3 ? 35 : er > 1 ? 22 : 10) +
      (instagram.followers > 50000 ? 40 : instagram.followers > 10000 ? 30 : instagram.followers > 1000 ? 18 : 5)
    ))
    score += is * 0.25; factors += 0.25
  }
  if (youtube) {
    const ys = Math.min(100, Math.round(
      (youtube.subscribers > 50000 ? 55 : youtube.subscribers > 10000 ? 40 : youtube.subscribers > 1000 ? 25 : 8) +
      (youtube.videoCount > 100 ? 30 : youtube.videoCount > 20 ? 20 : youtube.videoCount > 5 ? 12 : 5) +
      15
    ))
    score += ys * 0.15; factors += 0.15
  }
  return factors > 0 ? Math.round(score / factors) : 0
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { websiteUrl, manualSocial = {} } = req.body
  if (!websiteUrl) return res.status(400).json({ error: 'Website URL is required' })
  const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`

  console.log('Scan starting:', url, 'social platforms:', Object.keys(manualSocial))

  const website = await analyzeWebsite(url)

  const tiktok    = manualSocial.tiktok    || null
  const instagram = manualSocial.instagram || null
  const youtube   = manualSocial.youtube   || null
  const twitter   = manualSocial.twitter   || null

  const finalScore = calcScore(website, tiktok, instagram, youtube)

  console.log('Scan done. Score:', finalScore, { website: !!website, tiktok: !!tiktok, instagram: !!instagram, youtube: !!youtube })

  res.status(200).json({
    score: finalScore,
    website, tiktok, instagram, youtube, twitter,
    scannedAt: new Date().toISOString(),
  })
}