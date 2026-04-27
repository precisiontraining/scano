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

async function runApifyActor(actorId, input, token) {
  try {
    const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=45&memory=256`
    console.log(`Running Apify actor: ${actorId}`)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
    console.log(`Apify ${actorId} status:`, res.status)
    if (!res.ok) {
      const errText = await res.text()
      console.error(`Apify ${actorId} error:`, errText.slice(0, 300))
      return null
    }
    const data = await res.json()
    console.log(`Apify ${actorId} items:`, Array.isArray(data) ? data.length : 'not array')
    if (!Array.isArray(data) || data.length === 0) return null
    return data
  } catch (e) {
    console.error(`Apify ${actorId} exception:`, e.message)
    return null
  }
}

async function analyzeTikTok(handle) {
  if (!handle) return null
  const cleanHandle = handle.replace('@', '')
  const token = process.env.APIFY_TOKEN
  const items = await runApifyActor('clockworks~tiktok-scraper', {
    profiles: [cleanHandle],
    resultsPerPage: 10,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  }, token)
  if (!items) return null
  try {
    const profile = items.find(i => i.authorMeta) || items[0]
    const videos = items.filter(i => i.diggCount !== undefined)
    if (videos.length === 0) return null
    const totalViews = videos.reduce((s, v) => s + (v.playCount || 0), 0)
    const totalLikes = videos.reduce((s, v) => s + (v.diggCount || 0), 0)
    const totalComments = videos.reduce((s, v) => s + (v.commentCount || 0), 0)
    const avgViews = Math.round(totalViews / videos.length)
    const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2) : 0
    const topVideos = [...videos].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 3)
    return {
      followers: profile?.authorMeta?.fans || 0,
      bio: profile?.authorMeta?.signature || '',
      hasLink: !!profile?.authorMeta?.bioLink?.link,
      avgViews, engagementRate,
      videoCount: videos.length,
      topVideos: topVideos.map(v => ({
        desc: v.text?.slice(0, 100) || '',
        views: v.playCount || 0,
        likes: v.diggCount || 0,
        comments: v.commentCount || 0,
      }))
    }
  } catch (e) {
    console.error('TikTok parse error:', e.message)
    return null
  }
}

async function analyzeInstagram(handle) {
  if (!handle) return null
  const cleanHandle = handle.replace('@', '')
  const token = process.env.APIFY_TOKEN
  const items = await runApifyActor('apify~instagram-scraper', {
    usernames: [cleanHandle],
    resultsLimit: 12,
  }, token)
  if (!items) return null
  try {
    const profile = items[0]
    const posts = items.filter(i => i.likesCount !== undefined)
    const followers = profile?.followersCount || 0
    const totalLikes = posts.reduce((s, p) => s + (p.likesCount || 0), 0)
    const totalComments = posts.reduce((s, p) => s + (p.commentsCount || 0), 0)
    const engagementRate = followers > 0 && posts.length > 0
      ? (((totalLikes + totalComments) / posts.length) / followers * 100).toFixed(2) : 0
    return {
      followers,
      bio: profile?.biography || '',
      hasLink: !!profile?.externalUrl,
      postsCount: profile?.postsCount || 0,
      engagementRate,
      avgLikes: posts.length > 0 ? Math.round(totalLikes / posts.length) : 0,
    }
  } catch (e) {
    console.error('Instagram parse error:', e.message)
    return null
  }
}

async function analyzeYouTube(handle) {
  if (!handle) return null
  const cleanHandle = handle.replace('@', '')
  const token = process.env.APIFY_TOKEN
  const items = await runApifyActor('streamers~youtube-scraper', {
    searchKeywords: cleanHandle,
    maxResults: 5,
  }, token)
  if (!items) return null
  try {
    const channel = items[0]
    return {
      channelName: channel?.channelName || cleanHandle,
      subscribers: channel?.numberOfSubscribers || 0,
      totalViews: channel?.viewCount || 0,
      videoCount: channel?.videoCount || 0,
    }
  } catch (e) {
    console.error('YouTube parse error:', e.message)
    return null
  }
}

async function analyzeTwitter(handle) {
  if (!handle) return null
  const cleanHandle = handle.replace('@', '')
  const token = process.env.APIFY_TOKEN
  const items = await runApifyActor('apidojo~twitter-scraper-lite', {
    twitterHandles: [cleanHandle],
    maxItems: 10,
  }, token)
  if (!items) return null
  try {
    const profile = items.find(i => i.author) || items[0]
    const tweets = items.filter(i => i.likeCount !== undefined)
    return {
      followers: profile?.author?.followers || 0,
      tweetsCount: tweets.length,
      avgLikes: tweets.length > 0 ? Math.round(tweets.reduce((s, t) => s + (t.likeCount || 0), 0) / tweets.length) : 0,
    }
  } catch (e) {
    console.error('Twitter parse error:', e.message)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { websiteUrl, tiktokHandle, instagramHandle, youtubeHandle, twitterHandle, facebookHandle } = req.body
  if (!websiteUrl) return res.status(400).json({ error: 'Website URL is required' })
  const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`

  console.log('Scan starting for:', url, { tiktokHandle, instagramHandle, youtubeHandle, twitterHandle })

  const [website, tiktok, instagram, youtube, twitter] = await Promise.all([
    analyzeWebsite(url),
    analyzeTikTok(tiktokHandle),
    analyzeInstagram(instagramHandle),
    analyzeYouTube(youtubeHandle),
    analyzeTwitter(twitterHandle),
  ])

  console.log('Scan results:', {
    website: !!website,
    tiktok: !!tiktok,
    instagram: !!instagram,
    youtube: !!youtube,
    twitter: !!twitter,
  })

  let score = 0, scoreFactors = 0
  if (website) {
    const ws = Math.round((website.performanceScore * 0.4) + (website.seoScore * 0.35) + (website.accessibilityScore * 0.25))
    score += ws * 0.35; scoreFactors += 0.35
  }
  if (tiktok) {
    const ts = Math.min(100, Math.round(
      (tiktok.hasLink ? 20 : 0) + (tiktok.bio?.length > 20 ? 15 : 0) +
      (parseFloat(tiktok.engagementRate) > 3 ? 40 : parseFloat(tiktok.engagementRate) > 1 ? 25 : 10) +
      (tiktok.avgViews > 10000 ? 25 : tiktok.avgViews > 1000 ? 15 : 5)
    ))
    score += ts * 0.25; scoreFactors += 0.25
  }
  if (instagram) {
    const is = Math.min(100, Math.round(
      (instagram.hasLink ? 20 : 0) + (instagram.bio?.length > 20 ? 15 : 0) +
      (parseFloat(instagram.engagementRate) > 3 ? 40 : parseFloat(instagram.engagementRate) > 1 ? 25 : 10) +
      (instagram.followers > 10000 ? 25 : instagram.followers > 1000 ? 15 : 5)
    ))
    score += is * 0.25; scoreFactors += 0.25
  }
  if (youtube) {
    const ys = Math.min(100, Math.round(
      (youtube.subscribers > 10000 ? 50 : youtube.subscribers > 1000 ? 30 : 10) +
      (youtube.videoCount > 50 ? 30 : youtube.videoCount > 10 ? 20 : 5) + 20
    ))
    score += ys * 0.15; scoreFactors += 0.15
  }

  const finalScore = scoreFactors > 0 ? Math.round(score / scoreFactors) : 0

  res.status(200).json({
    score: finalScore,
    website, tiktok, instagram, youtube, twitter,
    scannedAt: new Date().toISOString(),
  })
}