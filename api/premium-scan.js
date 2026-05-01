export const config = { maxDuration: 60 }

const APIFY_TOKEN = process.env.APIFY_TOKEN

// ─── Helpers ─────────────────────────────────────────────────────────────────
function withTimeout(promise, ms, fallback = null) {
  return Promise.race([promise, new Promise(r => setTimeout(() => r(fallback), ms))])
}

function cleanHandle(handle) {
  if (!handle) return null
  return handle.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?(tiktok|instagram|twitter|x|youtube)\.com\/?(@)?/, '').split('/')[0].split('?')[0].trim() || null
}

// ─── Apify runner ─────────────────────────────────────────────────────────────
async function runApify(actorId, input) {
  const slug = actorId.replace('/', '~')
  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${slug}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=50&memory=256`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(52000) }
    )
    if (!res.ok) { console.error(`Apify ${actorId} HTTP ${res.status}`); return null }
    const data = await res.json()
    return Array.isArray(data) ? data : null
  } catch (e) { console.error(`Apify ${actorId} failed:`, e.message); return null }
}

// ─── Data processors ─────────────────────────────────────────────────────────
function processTikTok(items) {
  if (!items?.length) return null
  try {
    const first = items[0]
    const a = first.authorMeta || {}
    const followers = a.fans || a.followers || 0
    const videos = items.filter(i => i.diggCount !== undefined || i.playCount !== undefined)
    const totalViews = videos.reduce((s, v) => s + (v.playCount || 0), 0)
    const totalLikes = videos.reduce((s, v) => s + (v.diggCount || 0), 0)
    const avgViews = videos.length ? Math.round(totalViews / videos.length) : 0
    const avgLikes = videos.length ? Math.round(totalLikes / videos.length) : 0
    const engagementRate = followers > 0 && avgLikes > 0 ? (avgLikes / followers * 100).toFixed(2) : '0'
    return {
      followers,
      following: a.following || 0,
      heartCount: a.heart || 0,
      videoCount: a.video || videos.length,
      bio: a.signature || '',
      hasLink: !!(a.bioLink?.link || a.bioLink),
      avgViews, avgLikes, engagementRate,
      topVideos: videos.slice(0, 8).map(v => ({
        caption: (v.text || '').slice(0, 300),
        views: v.playCount || 0,
        likes: v.diggCount || 0,
        comments: v.commentCount || 0,
        shares: v.shareCount || 0,
      }))
    }
  } catch (e) { console.error('TikTok parse error:', e.message); return null }
}

function processInstagram(items) {
  if (!items?.length) return null
  try {
    // Apify Instagram Scraper sometimes returns all items as posts (no separate profile object).
    // Strategy: prefer a dedicated profile item (has followersCount but no likesCount typical of posts),
    // then fall back to the item with the highest followersCount, then items[0].
    const profileCandidates = items.filter(i => i.followersCount !== undefined)
    const profile = profileCandidates.find(i => i.likesCount === undefined)
      || profileCandidates.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))[0]
      || items[0]
    const posts = items.filter(i => i.likesCount !== undefined)
    // If every item is a post (no separate profile), pull follower count from any post that has it
    const followers = profile?.followersCount
      || posts.find(p => p.followersCount !== undefined)?.followersCount
      || 0
    const totalLikes = posts.reduce((s, p) => s + (p.likesCount || 0), 0)
    const totalComments = posts.reduce((s, p) => s + (p.commentsCount || 0), 0)
    const avgLikes = posts.length ? Math.round(totalLikes / posts.length) : 0
    const engagementRate = followers > 0 && posts.length > 0
      ? (((totalLikes + totalComments) / posts.length) / followers * 100).toFixed(2) : '0'
    return {
      followers,
      following: profile?.followsCount || 0,
      postsCount: profile?.postsCount || posts.length,
      bio: profile?.biography || '',
      hasLink: !!(profile?.externalUrl),
      avgLikes, engagementRate,
      topPosts: posts.slice(0, 8).map(p => ({
        caption: (p.caption || '').slice(0, 300),
        likes: p.likesCount || 0,
        comments: p.commentsCount || 0,
        type: p.type || 'image',
      }))
    }
  } catch (e) { console.error('Instagram parse error:', e.message); return null }
}

function processYouTube(items) {
  if (!items?.length) return null
  try {
    const channel = items.find(i => i.subscriberCount !== undefined) || items[0]
    const videos = items.filter(i => i.viewCount !== undefined && i.title)
    const totalViews = videos.reduce((s, v) => s + (v.viewCount || 0), 0)
    const avgViews = videos.length ? Math.round(totalViews / videos.length) : 0
    return {
      subscribers: channel?.subscriberCount || 0,
      videoCount: videos.length,
      channelName: channel?.channelName || channel?.title || '',
      avgViews,
      topVideos: videos.slice(0, 5).map(v => ({
        title: v.title || '',
        views: v.viewCount || 0,
        likes: v.likes || 0,
        comments: v.commentsCount || 0,
      }))
    }
  } catch (e) { console.error('YouTube parse error:', e.message); return null }
}

function processTwitter(items) {
  if (!items?.length) return null
  try {
    const user = items.find(i => i.followersCount !== undefined) || items[0]
    const tweets = items.filter(i => i.text !== undefined)
    const followers = user?.followersCount || 0
    const totalLikes = tweets.reduce((s, t) => s + (t.likeCount || t.favoriteCount || 0), 0)
    const avgLikes = tweets.length ? Math.round(totalLikes / tweets.length) : 0
    return {
      followers,
      following: user?.followingCount || 0,
      bio: user?.description || '',
      avgLikes,
      topTweets: tweets.slice(0, 5).map(t => ({
        text: (t.text || '').slice(0, 280),
        likes: t.likeCount || t.favoriteCount || 0,
        retweets: t.retweetCount || 0,
      }))
    }
  } catch (e) { console.error('Twitter parse error:', e.message); return null }
}

// ─── Website scan (reused from free scan) ─────────────────────────────────────
async function analyzeWebsite(url) {
  try {
    const apiKey = process.env.PAGESPEED_API_KEY
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=seo&category=accessibility&key=${apiKey}`
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
      }
    }
  } catch (e) { console.error('PageSpeed error:', e.message); return null }
}

function decodeHTMLEntities(str) {
  if (!str) return str
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

async function analyzeContent(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ScanoBot/1.0)' }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const html = await res.text()
    const rawText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const isSPA = rawText.split(/\s+/).filter(Boolean).length < 50
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = decodeHTMLEntities(titleMatch?.[1]?.trim() || '')
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
    const metaDesc = decodeHTMLEntities(descMatch?.[1]?.trim() || '')
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || []
    const h1s = h1Match.map(h => decodeHTMLEntities(h.replace(/<[^>]+>/g, '').trim())).filter(Boolean)
    const imgTags = html.match(/<img[^>]+>/gi) || []
    const imgsWithoutAlt = imgTags.filter(t => !t.match(/alt=["'][^"']+["']/i)).length
    const imgAltScore = imgTags.length > 0 ? Math.round(((imgTags.length - imgsWithoutAlt) / imgTags.length) * 100) : 100
    const canonicalPresent = /<link[^>]*rel=["']canonical["']/i.test(html)
    const ogTitlePresent = /<meta[^>]*property=["']og:title["']/i.test(html)
    const ogDescPresent = /<meta[^>]*property=["']og:description["']/i.test(html)
    const structuredData = html.includes('"@context"')
    const hasCTA = /buy now|get started|sign up|try free|book|schedule|contact us|shop now|order|subscribe|join|start free|get access|claim/i.test(html)
    const hasSocialProof = /testimonial|review|rating|customer|client|trust|verified|guarantee|result|success|transform/i.test(html)
    const hasPriceVisible = /\$[\d,.]+|€[\d,.]+|£[\d,.]+|per month|\/mo|one.time|free trial/i.test(html)
    const heroHeadline = h1s[0] || ''
    const isOutcomeFocused = heroHeadline ? /you|your|get|achieve|become|stop|start|finally|without|results|faster|easier|transform/i.test(heroHeadline) : false
    const wordCount = rawText.split(/\s+/).filter(Boolean).length

    let seoScore = 0
    if (title && title.length >= 30 && title.length <= 65) seoScore += 18; else if (title) seoScore += 9
    if (metaDesc && metaDesc.length >= 120 && metaDesc.length <= 160) seoScore += 18; else if (metaDesc) seoScore += 9
    if (h1s.length === 1) seoScore += 15; else if (h1s.length > 1) seoScore += 7
    if (imgAltScore >= 80) seoScore += 12; else if (imgAltScore >= 50) seoScore += 6
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

    const ctaButtons = (html.match(/<(?:button|a)[^>]*>([^<]{3,40})<\/(?:button|a)>/gi) || []).map(b => b.replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 2 && t.length < 50).slice(0, 5)

    return {
      seo: { score: Math.min(100, seoScore), title, titleLength: title.length, metaDesc, metaDescLength: metaDesc.length, h1s, imgAltScore, imgsWithoutAlt, canonicalPresent, ogTitlePresent, ogDescPresent, structuredData, issues: [] },
      copy: { score: Math.min(100, copyScore), isSPA, heroHeadline, isOutcomeFocused, hasCTA, ctaButtons, hasSocialProof, hasPriceVisible, wordCount, issues: [] },
      rawText: rawText.slice(0, 3000)
    }
  } catch (e) { console.error('Content analysis error:', e.message); return null }
}

// ─── Industry detection ───────────────────────────────────────────────────────
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
  if (/\bcar\b|\bcars\b|motorsport|automobile|automotive|vehicle|\bsuv\b|turbo|horsepower|dealership|autohaus|fahrzeug/.test(text)) return 'default'
  if (/fitness|workout|\bgym\b|bodybuilding|weight loss|\bmuscle\b|personal train|nutrition plan/.test(text)) return 'fitness'
  if (/\bcoach\b|mentor|online course|\bteach\b|educat/.test(text)) return 'coaching'
  if (/\bshop\b|\bstore\b|\bproduct\b|\bbuy\b|\bcart\b|\border\b|shipping|checkout/.test(text)) return 'ecommerce'
  if (/saas|\bsoftware\b|\bapi\b|dashboard|platform/.test(text)) return 'saas'
  if (/\bcreator\b|\bpodcast\b|newsletter/.test(text)) return 'creator'
  if (/\bfood\b|\brecipe\b|restaurant|\bcafe\b/.test(text)) return 'food'
  if (/beauty|makeup|\bfashion\b|skincare/.test(text)) return 'beauty'
  return 'default'
}

function approxPercentile(value, benchmark, spread = 0.6) {
  if (!value || !benchmark) return null
  const z = (Math.log(Math.max(value, 0.001)) - Math.log(Math.max(benchmark, 0.001))) / spread
  return Math.min(99, Math.max(1, Math.round(100 / (1 + Math.exp(-1.7 * z)))))
}

function buildBenchmarkInsights(industry, tiktok, instagram) {
  const bench = BENCHMARKS[industry] || BENCHMARKS.default
  const insights = []
  if (tiktok?.engagementRate) {
    const er = parseFloat(tiktok.engagementRate)
    if (!isNaN(er)) {
      const pct = approxPercentile(er, bench.tiktokEng)
      const diff = ((er - bench.tiktokEng) / bench.tiktokEng * 100).toFixed(0)
      insights.push({ platform: 'TikTok', metric: 'Engagement Rate', yours: `${er}%`, benchmark: `${bench.tiktokEng}%`, diff: Math.abs(diff) + '%', direction: er >= bench.tiktokEng ? 'above' : 'below', percentile: pct, percentileLabel: pct ? `Better than ${pct}% of ${bench.label} accounts` : null })
    }
    if (tiktok.avgViews) {
      const vPct = approxPercentile(tiktok.avgViews, bench.avgViews)
      const vDiff = ((tiktok.avgViews - bench.avgViews) / bench.avgViews * 100).toFixed(0)
      insights.push({ platform: 'TikTok', metric: 'Avg. Views', yours: tiktok.avgViews.toLocaleString(), benchmark: bench.avgViews.toLocaleString(), diff: Math.abs(vDiff) + '%', direction: tiktok.avgViews >= bench.avgViews ? 'above' : 'below', percentile: vPct, percentileLabel: vPct ? `Better than ${vPct}% of ${bench.label} accounts` : null })
    }
  }
  if (instagram?.engagementRate) {
    const er = parseFloat(instagram.engagementRate)
    if (!isNaN(er)) {
      const pct = approxPercentile(er, bench.igEng)
      const diff = ((er - bench.igEng) / bench.igEng * 100).toFixed(0)
      insights.push({ platform: 'Instagram', metric: 'Engagement Rate', yours: `${er}%`, benchmark: `${bench.igEng}%`, diff: Math.abs(diff) + '%', direction: er >= bench.igEng ? 'above' : 'below', percentile: pct, percentileLabel: pct ? `Better than ${pct}% of ${bench.label} accounts` : null })
    }
  }
  return {
    benchmarks: insights, industry, industryLabel: bench.label,
    tiktokIsNewAccount: tiktok ? ((tiktok.followers || 0) < 500 && (tiktok.videoCount || 0) < 15) : false,
    instagramIsNewAccount: instagram ? ((instagram.followers || 0) < 200 && (instagram.postsCount || 0) < 10) : false,
  }
}

function calcScore(perf, content, social) {
  let score = 0, factors = 0
  if (perf) { score += Math.round((perf.performanceScore * 0.6) + (perf.accessibilityScore * 0.4)) * 0.20; factors += 0.20 }
  if (content?.seo) { score += content.seo.score * 0.20; factors += 0.20 }
  if (content?.copy) { score += content.copy.score * 0.20; factors += 0.20 }
  if (social.tiktok) {
    const er = parseFloat(social.tiktok.engagementRate) || 0
    const isNew = (social.tiktok.followers || 0) < 500 && (social.tiktok.videoCount || 0) < 15
    const ts = isNew ? 50 : Math.min(100, Math.round((er > 5 ? 50 : er > 3 ? 38 : er > 1 ? 24 : 10) + (social.tiktok.avgViews > 50000 ? 50 : social.tiktok.avgViews > 10000 ? 35 : social.tiktok.avgViews > 1000 ? 20 : 5)))
    score += ts * 0.20; factors += 0.20
  }
  if (social.instagram) {
    const er = parseFloat(social.instagram.engagementRate) || 0
    const isNew = (social.instagram.followers || 0) < 200 && (social.instagram.postsCount || 0) < 10
    const is = isNew ? 50 : Math.min(100, Math.round((er > 5 ? 50 : er > 3 ? 38 : er > 1 ? 24 : 10) + (social.instagram.followers > 50000 ? 50 : social.instagram.followers > 10000 ? 35 : social.instagram.followers > 1000 ? 20 : 5)))
    score += is * 0.20; factors += 0.20
  }
  if (social.youtube) {
    const subs = social.youtube.subscribers || 0
    const avgV = social.youtube.avgViews || 0
    const ys = Math.min(100, Math.round(
      (subs > 100000 ? 50 : subs > 10000 ? 38 : subs > 1000 ? 24 : subs > 100 ? 12 : 5) +
      (avgV > 50000 ? 50 : avgV > 10000 ? 35 : avgV > 1000 ? 20 : 5)
    ))
    score += ys * 0.10; factors += 0.10
  }
  if (social.twitter) {
    const followers = social.twitter.followers || 0
    const ts = Math.min(100, Math.round(
      followers > 100000 ? 90 : followers > 10000 ? 70 : followers > 1000 ? 45 : followers > 100 ? 20 : 8
    ))
    score += ts * 0.10; factors += 0.10
  }
  return factors > 0 ? Math.round(score / factors) : 0
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { websiteUrl, handles = {} } = req.body
  if (!websiteUrl) return res.status(400).json({ error: 'websiteUrl required' })

  const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`
  const tiktokHandle   = cleanHandle(handles.tiktok)
  const igHandle       = cleanHandle(handles.instagram)
  const ytHandle       = cleanHandle(handles.youtube)
  const twitterHandle  = cleanHandle(handles.twitter)

  console.log('Premium scan:', url, { tiktokHandle, igHandle, ytHandle, twitterHandle })

  // Run everything in parallel
  const [perf, content, tiktokRaw, igRaw, ytRaw, twitterRaw] = await Promise.all([
    withTimeout(analyzeWebsite(url), 25000, null),
    withTimeout(analyzeContent(url), 12000, null),
    tiktokHandle  ? withTimeout(runApify('clockworks/tiktok-scraper',   { profiles: [tiktokHandle],  resultsPerPage: 15, shouldDownloadVideos: false, shouldDownloadCovers: false }), 55000, null) : Promise.resolve(null),
    igHandle      ? withTimeout(runApify('apify/instagram-scraper',      { usernames: [igHandle],     resultsLimit: 15 }), 55000, null) : Promise.resolve(null),
    ytHandle      ? withTimeout(runApify('streamers/youtube-scraper',    { startUrls: [{ url: `https://www.youtube.com/@${ytHandle}` }], maxResults: 10 }), 55000, null) : Promise.resolve(null),
    twitterHandle ? withTimeout(runApify('apidojo/twitter-scraper-lite', { twitterHandles: [twitterHandle], maxItems: 15 }), 55000, null) : Promise.resolve(null),
  ])

  if (!perf && !content) return res.status(422).json({ error: 'unreachable', message: "Couldn't reach this website." })

  const tiktok   = processTikTok(tiktokRaw)
  const instagram = processInstagram(igRaw)
  const youtube  = processYouTube(ytRaw)
  const twitter  = processTwitter(twitterRaw)

  const industry     = detectIndustry(url, content?.copy)
  const benchmarkData = buildBenchmarkInsights(industry, tiktok, instagram)
  if (perf) {
    const perfPct = approxPercentile(perf.performanceScore, 45, 0.7)
    benchmarkData.perfPercentile = perfPct
    benchmarkData.perfSlowerThan = perfPct ? 100 - perfPct : null
  }

  const score = calcScore(perf, content, { tiktok, instagram, youtube, twitter })

  console.log('Premium scan done. Score:', score, 'TikTok:', !!tiktok, 'IG:', !!instagram)

  res.status(200).json({
    score, website: perf, content,
    tiktok, instagram, youtube, twitter,
    benchmarkData, scannedAt: new Date().toISOString(),
  })
}