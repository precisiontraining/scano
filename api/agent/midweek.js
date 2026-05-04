import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getPostHogAnalytics(posthogApiKey, posthogProjectId, posthogHost = 'https://eu.posthog.com') {
  try {
    const headers = {
      'Authorization': `Bearer ${posthogApiKey}`,
      'Content-Type': 'application/json'
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    const [thisWeekRes, lastWeekRes, referrersRes, topPagesRes] = await Promise.all([
      // This week pageviews + sessions
      fetch(`${posthogHost}/api/projects/${posthogProjectId}/query/`, {
        method: 'POST', headers,
        body: JSON.stringify({
          query: {
            kind: 'EventsQuery',
            select: ['properties.$session_id', 'count()'],
            event: '$pageview',
            after: sevenDaysAgo, before: today,
            limit: 2000,
          }
        })
      }),
      // Last week for comparison
      fetch(`${posthogHost}/api/projects/${posthogProjectId}/query/`, {
        method: 'POST', headers,
        body: JSON.stringify({
          query: {
            kind: 'EventsQuery',
            select: ['properties.$session_id', 'count()'],
            event: '$pageview',
            after: fourteenDaysAgo, before: sevenDaysAgo,
            limit: 2000,
          }
        })
      }),
      // Top referrers
      fetch(`${posthogHost}/api/projects/${posthogProjectId}/query/`, {
        method: 'POST', headers,
        body: JSON.stringify({
          query: {
            kind: 'EventsQuery',
            select: ['properties.$referring_domain', 'count()'],
            event: '$pageview',
            after: sevenDaysAgo, before: today,
            limit: 10, orderBy: ['count() DESC'],
          }
        })
      }),
      // Top pages
      fetch(`${posthogHost}/api/projects/${posthogProjectId}/query/`, {
        method: 'POST', headers,
        body: JSON.stringify({
          query: {
            kind: 'EventsQuery',
            select: ['properties.$pathname', 'count()'],
            event: '$pageview',
            after: sevenDaysAgo, before: today,
            limit: 5, orderBy: ['count() DESC'],
          }
        })
      }),
    ])

    const [thisWeek, lastWeek, referrers, topPages] = await Promise.all([
      thisWeekRes.json(),
      lastWeekRes.json(),
      referrersRes.json(),
      topPagesRes.json(),
    ])

    // This week metrics
    const thisWeekSessions = new Set(thisWeek.results?.map(r => r[0])).size || 0
    const thisWeekPageviews = thisWeek.results?.reduce((sum, r) => sum + (r[1] || 0), 0) || 0
    const thisWeekSessionCounts = {}
    thisWeek.results?.forEach(r => {
      thisWeekSessionCounts[r[0]] = (thisWeekSessionCounts[r[0]] || 0) + 1
    })
    const thisWeekBounced = Object.values(thisWeekSessionCounts).filter(c => c === 1).length
    const thisWeekBounceRate = thisWeekSessions > 0 ? Math.round((thisWeekBounced / thisWeekSessions) * 100) : 0

    // Last week metrics
    const lastWeekSessions = new Set(lastWeek.results?.map(r => r[0])).size || 0
    const lastWeekPageviews = lastWeek.results?.reduce((sum, r) => sum + (r[1] || 0), 0) || 0

    // Traffic change
    const trafficChange = lastWeekSessions > 0
      ? Math.round(((thisWeekSessions - lastWeekSessions) / lastWeekSessions) * 100)
      : null

    // Social sources
    const socialSources = {}
    referrers.results?.forEach(row => {
      const domain = row[0] || ''
      const visits = row[1]
      if (domain.includes('tiktok')) socialSources.tiktok = (socialSources.tiktok || 0) + visits
      if (domain.includes('instagram') || domain.includes('ig.me')) socialSources.instagram = (socialSources.instagram || 0) + visits
      if (domain.includes('youtube')) socialSources.youtube = (socialSources.youtube || 0) + visits
      if (domain.includes('twitter') || domain.includes('t.co')) socialSources.twitter = (socialSources.twitter || 0) + visits
      if (domain.includes('google')) socialSources.google = (socialSources.google || 0) + visits
    })

    const topPagesList = topPages.results?.slice(0, 3).map(r => ({
      path: r[0], views: r[1]
    })) || []

    return {
      thisWeek: {
        sessions: thisWeekSessions,
        pageviews: thisWeekPageviews,
        bounceRate: thisWeekBounceRate,
      },
      lastWeek: {
        sessions: lastWeekSessions,
        pageviews: lastWeekPageviews,
      },
      trafficChange,
      socialSources,
      topPages: topPagesList,
    }
  } catch (error) {
    console.error('PostHog error:', error)
    return null
  }
}

async function sendMidweekUpdate(chatId, analytics, websiteUrl) {
  const a = analytics

  // Traffic trend emoji
  const trendEmoji = a.trafficChange === null ? '📊'
    : a.trafficChange > 10 ? '📈'
    : a.trafficChange < -10 ? '📉'
    : '➡️'

  const trendText = a.trafficChange === null ? 'first week of tracking'
    : a.trafficChange > 0 ? `+${a.trafficChange}% vs last week`
    : `${a.trafficChange}% vs last week`

  // Social breakdown
  const socialLines = Object.entries(a.socialSources)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([platform, visits]) => {
      const emoji = { tiktok: '🎵', instagram: '📸', youtube: '▶️', twitter: '𝕏', google: '🔍' }[platform] || '🌐'
      return `  ${emoji} ${platform}: ${visits} visits`
    })
    .join('\n')

  // Top pages
  const pagesLines = a.topPages
    .map(p => `  • ${p.path} — ${p.views} views`)
    .join('\n')

  // Bounce rate assessment
  const bounceAssessment = a.thisWeek.bounceRate > 70
    ? `⚠️ High bounce rate (${a.thisWeek.bounceRate}%) — agent will prioritize this Monday`
    : a.thisWeek.bounceRate > 50
    ? `🟡 Bounce rate ${a.thisWeek.bounceRate}% — room to improve`
    : `✅ Bounce rate ${a.thisWeek.bounceRate}% — looking good`

  const message = `📊 *Scano — Mid-Week Check*
_${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}_

${trendEmoji} *Traffic this week*
${a.thisWeek.sessions} visitors · ${a.thisWeek.pageviews} pageviews
${trendText}

${bounceAssessment}

${socialLines ? `*Top traffic sources:*\n${socialLines}` : '*No social traffic yet this week*'}

${pagesLines ? `*Most visited pages:*\n${pagesLines}` : ''}

🤖 _The agent is watching. Monday it will find the biggest fix and send it for your approval._`

  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    })
  })
}

export default async function handler(req, res) {
  const cronSecret = req.headers['x-cron-secret']
  const vercelCron = req.headers['x-vercel-cron']

  if (!vercelCron && cronSecret !== process.env.AGENT_CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { data: connections } = await supabase
      .from('agent_connections')
      .select('*, agent_subscriptions!inner(*)')
      .eq('agent_subscriptions.status', 'active')

    if (!connections || connections.length === 0) {
      return res.json({ success: true, message: 'No active connections' })
    }

    for (const conn of connections) {
      const analytics = await getPostHogAnalytics(
        conn.posthog_api_key || process.env.POSTHOG_API_KEY,
        conn.posthog_project_id || process.env.POSTHOG_PROJECT_ID,
        conn.posthog_host || process.env.POSTHOG_HOST
      )

      if (!analytics) continue

      // Get Telegram chat ID for this user
      const { data: sub } = await supabase
        .from('agent_subscriptions')
        .select('telegram_chat_id, email')
        .eq('id', conn.subscription_id)
        .single()

      const chatId = sub?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID

      await sendMidweekUpdate(chatId, analytics, conn.website_url)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Midweek error:', error)
    res.status(500).json({ error: error.message })
  }
}