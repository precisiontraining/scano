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
    const tapTargets = audits['tap-targets']?.score === 1

    const issues = []
    if (!metaTitle) issues.push('Missing or poor meta title')
    if (!metaDescription) issues.push('Missing meta description')
    if (!hasHttps) issues.push('Not using HTTPS')
    if (!mobileOptimized) issues.push('Not mobile optimized')
    if (performanceScore < 50) issues.push('Very slow load time')
    if (performanceScore < 70) issues.push('Performance needs improvement')

    return {
      performanceScore,
      seoScore,
      accessibilityScore,
      coreWebVitals: { fcp, lcp, tbt, cls },
      technical: { metaTitle, metaDescription, hasHttps, mobileOptimized, tapTargets },
      issues
    }
  } catch (e) {
    return null
  }
}

async function analyzeTikTok(handle) {
  if (!handle) return null
  try {
    const cleanHandle = handle.replace('@', '')
    const apifyToken = process.env.APIFY_TOKEN

    console.log('TikTok scan starting for:', cleanHandle)
    const runRes = await fetch(`https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=45&memory=512`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profiles: [cleanHandle],
        resultsPerPage: 10,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
      })
    })

    console.log('TikTok response status:', runRes.status)
    const items = await runRes.json()
    console.log('TikTok items count:', Array.isArray(items) ? items.length : 'not array', typeof items === 'object' ? JSON.stringify(items).slice(0,200) : '')
    if (!items || !Array.isArray(items) || items.length === 0) return null

    const profile = items.find(i => i.authorMeta) || items[0]
    const videos = items.filter(i => i.id && i.diggCount !== undefined)

    if (videos.length === 0) return null

    const totalViews = videos.reduce((s, v) => s + (v.playCount || 0), 0)
    const totalLikes = videos.reduce((s, v) => s + (v.diggCount || 0), 0)
    const totalComments = videos.reduce((s, v) => s + (v.commentCount || 0), 0)
    const avgViews = Math.round(totalViews / videos.length)
    const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2) : 0

    const topVideos = [...videos].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 3)

    const followers = profile?.authorMeta?.fans || 0
    const following = profile?.authorMeta?.following || 0
    const bio = profile?.authorMeta?.signature || ''
    const hasLink = profile?.authorMeta?.bioLink?.link ? true : false

    return {
      followers,
      following,
      bio,
      hasLink,
      avgViews,
      engagementRate,
      videoCount: videos.length,
      topVideos: topVideos.map(v => ({
        desc: v.text?.slice(0, 100) || '',
        views: v.playCount || 0,
        likes: v.diggCount || 0,
        comments: v.commentCount || 0,
      }))
    }
  } catch (e) {
    return null
  }
}

async function analyzeInstagram(handle) {
  if (!handle) return null
  try {
    const cleanHandle = handle.replace('@', '')
    const apifyToken = process.env.APIFY_TOKEN

    console.log('Instagram scan starting for:', cleanHandle)
    const runRes = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=45&memory=512`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames: [cleanHandle],
        resultsLimit: 10,
      })
    })

    console.log('Instagram response status:', runRes.status)
    const items = await runRes.json()
    console.log('Instagram items count:', Array.isArray(items) ? items.length : 'not array', typeof items === 'object' ? JSON.stringify(items).slice(0,200) : '')
    if (!items || !Array.isArray(items) || items.length === 0) return null

    const profile = items[0]
    const posts = items.filter(i => i.likesCount !== undefined)

    const followers = profile?.followersCount || 0
    const following = profile?.followingCount || 0
    const bio = profile?.biography || ''
    const hasLink = !!profile?.externalUrl
    const postsCount = profile?.postsCount || 0

    const totalLikes = posts.reduce((s, p) => s + (p.likesCount || 0), 0)
    const totalComments = posts.reduce((s, p) => s + (p.commentsCount || 0), 0)
    const engagementRate = followers > 0 && posts.length > 0
      ? (((totalLikes + totalComments) / posts.length) / followers * 100).toFixed(2)
      : 0

    return {
      followers,
      following,
      bio,
      hasLink,
      postsCount,
      engagementRate,
      avgLikes: posts.length > 0 ? Math.round(totalLikes / posts.length) : 0,
    }
  } catch (e) {
    return null
  }
}

async function analyzeYouTube(handle) {
  if (!handle) return null
  try {
    const cleanHandle = handle.replace('@', '')
    const apifyToken = process.env.APIFY_TOKEN

    const runRes = await fetch(`https://api.apify.com/v2/acts/streamers~youtube-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=30`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchKeywords: cleanHandle,
        maxResults: 10,
      })
    })

    const items = await runRes.json()
    if (!items || !Array.isArray(items) || items.length === 0) return null

    const channel = items[0]
    return {
      channelName: channel?.channelName || cleanHandle,
      subscribers: channel?.numberOfSubscribers || 0,
      totalViews: channel?.viewCount || 0,
      videoCount: channel?.videoCount || 0,
    }
  } catch (e) {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { websiteUrl, tiktokHandle, instagramHandle, youtubeHandle, facebookHandle } = req.body

  if (!websiteUrl) return res.status(400).json({ error: 'Website URL is required' })

  const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`

  const [website, tiktok, instagram, youtube] = await Promise.all([
    analyzeWebsite(url),
    analyzeTikTok(tiktokHandle),
    analyzeInstagram(instagramHandle),
    analyzeYouTube(youtubeHandle),
  ])

  // Calculate overall score
  let score = 0
  let scoreFactors = 0

  if (website) {
    const websiteScore = Math.round(
      (website.performanceScore * 0.4) +
      (website.seoScore * 0.3) +
      (website.accessibilityScore * 0.3)
    )
    score += websiteScore * 0.35
    scoreFactors += 0.35
  }

  if (tiktok) {
    const tikTokScore = Math.min(100, Math.round(
      (tiktok.hasLink ? 20 : 0) +
      (tiktok.bio?.length > 20 ? 15 : 0) +
      (parseFloat(tiktok.engagementRate) > 3 ? 40 : parseFloat(tiktok.engagementRate) > 1 ? 25 : 10) +
      (tiktok.avgViews > 10000 ? 25 : tiktok.avgViews > 1000 ? 15 : 5)
    ))
    score += tikTokScore * 0.25
    scoreFactors += 0.25
  }

  if (instagram) {
    const igScore = Math.min(100, Math.round(
      (instagram.hasLink ? 20 : 0) +
      (instagram.bio?.length > 20 ? 15 : 0) +
      (parseFloat(instagram.engagementRate) > 3 ? 40 : parseFloat(instagram.engagementRate) > 1 ? 25 : 10) +
      (instagram.followers > 10000 ? 25 : instagram.followers > 1000 ? 15 : 5)
    ))
    score += igScore * 0.25
    scoreFactors += 0.25
  }

  if (youtube) {
    const ytScore = Math.min(100, Math.round(
      (youtube.subscribers > 10000 ? 50 : youtube.subscribers > 1000 ? 30 : 10) +
      (youtube.videoCount > 50 ? 30 : youtube.videoCount > 10 ? 20 : 5) +
      20
    ))
    score += ytScore * 0.15
    scoreFactors += 0.15
  }

  const finalScore = scoreFactors > 0 ? Math.round(score / scoreFactors) : 0

  const result = {
    score: finalScore,
    website,
    tiktok,
    instagram,
    youtube,
    scannedAt: new Date().toISOString(),
  }

  res.status(200).json(result)
}