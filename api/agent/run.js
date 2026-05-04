import { createClient } from '@supabase/supabase-js'
import { App } from '@octokit/app'
import { Octokit } from '@octokit/rest'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getOctokit(installationId) {
  const app = new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey: Buffer.from(
      process.env.GITHUB_APP_PRIVATE_KEY_BASE64, 'base64'
    ).toString('utf-8')
  })

  const { data: { token } } = await app.octokit.request(
    'POST /app/installations/{installation_id}/access_tokens',
    { installation_id: installationId }
  )

  return new Octokit({ auth: token })
}

async function analyzeRepo(octokit, owner, repo) {
  const filesToCheck = [
    'src/App.jsx', 'src/App.tsx', 'index.html',
    'src/main.jsx', 'src/main.tsx',
    'src/pages/Home.jsx', 'src/Home.jsx',
    'src/components/Hero.jsx', 'src/components/Landing.jsx',
  ]

  const files = {}
  for (const path of filesToCheck) {
    try {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path })
      files[path] = Buffer.from(data.content, 'base64').toString('utf-8')
    } catch (e) {
      // File doesn't exist, skip
    }
  }
  return files
}

async function getPostHogAnalytics(posthogApiKey, posthogProjectId, posthogHost = 'https://eu.posthog.com') {
  try {
    const headers = {
      'Authorization': `Bearer ${posthogApiKey}`,
      'Content-Type': 'application/json'
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    // Run all queries in parallel
    const [pageviewsRes, sessionsRes, referrersRes, utmRes, deviceRes] = await Promise.all([
      // Pageviews per page
      fetch(`${posthogHost}/api/projects/${posthogProjectId}/query/`, {
        method: 'POST', headers,
        body: JSON.stringify({
          query: {
            kind: 'EventsQuery',
            select: ['properties.$pathname', 'count()'],
            event: '$pageview',
            after: sevenDaysAgo, before: today,
            limit: 10, orderBy: ['count() DESC'],
          }
        })
      }),
      // Sessions for bounce rate
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
      // Traffic sources / referrers
      fetch(`${posthogHost}/api/projects/${posthogProjectId}/query/`, {
        method: 'POST', headers,
        body: JSON.stringify({
          query: {
            kind: 'EventsQuery',
            select: ['properties.$referring_domain', 'count()'],
            event: '$pageview',
            after: sevenDaysAgo, before: today,
            limit: 20, orderBy: ['count() DESC'],
          }
        })
      }),
      // UTM data
      fetch(`${posthogHost}/api/projects/${posthogProjectId}/query/`, {
        method: 'POST', headers,
        body: JSON.stringify({
          query: {
            kind: 'EventsQuery',
            select: ['properties.$utm_source', 'properties.$utm_medium', 'properties.$utm_campaign', 'count()'],
            event: '$pageview',
            after: sevenDaysAgo, before: today,
            limit: 20, orderBy: ['count() DESC'],
          }
        })
      }),
      // Device types
      fetch(`${posthogHost}/api/projects/${posthogProjectId}/query/`, {
        method: 'POST', headers,
        body: JSON.stringify({
          query: {
            kind: 'EventsQuery',
            select: ['properties.$device_type', 'count()'],
            event: '$pageview',
            after: sevenDaysAgo, before: today,
            limit: 10, orderBy: ['count() DESC'],
          }
        })
      }),
    ])

    const [pageviews, sessions, referrers, utmData, devices] = await Promise.all([
      pageviewsRes.json(),
      sessionsRes.json(),
      referrersRes.json(),
      utmRes.json(),
      deviceRes.json(),
    ])

    // Calculate bounce rate
    const sessionPageCounts = {}
    sessions.results?.forEach(row => {
      const sessionId = row[0]
      sessionPageCounts[sessionId] = (sessionPageCounts[sessionId] || 0) + 1
    })
    const uniqueSessions = Object.keys(sessionPageCounts).length
    const bouncedSessions = Object.values(sessionPageCounts).filter(c => c === 1).length
    const bounceRate = uniqueSessions > 0 ? Math.round((bouncedSessions / uniqueSessions) * 100) : 0
    const totalPageviews = pageviews.results?.reduce((sum, row) => sum + (row[1] || 0), 0) || 0

    // Process traffic sources
    const trafficSources = referrers.results
      ?.filter(row => row[0])
      ?.map(row => {
        const domain = row[0]
        const visits = row[1]
        let platform = 'other'
        if (domain.includes('tiktok')) platform = 'tiktok'
        else if (domain.includes('instagram') || domain.includes('ig.me')) platform = 'instagram'
        else if (domain.includes('youtube') || domain.includes('youtu.be')) platform = 'youtube'
        else if (domain.includes('twitter') || domain.includes('t.co')) platform = 'twitter'
        else if (domain.includes('facebook') || domain.includes('fb.me')) platform = 'facebook'
        else if (domain.includes('google')) platform = 'google'
        else if (domain.includes('linkedin')) platform = 'linkedin'
        return { domain, visits, platform }
      }) || []

    // Social media breakdown
    const socialBreakdown = {
      tiktok: trafficSources.filter(s => s.platform === 'tiktok').reduce((sum, s) => sum + s.visits, 0),
      instagram: trafficSources.filter(s => s.platform === 'instagram').reduce((sum, s) => sum + s.visits, 0),
      youtube: trafficSources.filter(s => s.platform === 'youtube').reduce((sum, s) => sum + s.visits, 0),
      twitter: trafficSources.filter(s => s.platform === 'twitter').reduce((sum, s) => sum + s.visits, 0),
      facebook: trafficSources.filter(s => s.platform === 'facebook').reduce((sum, s) => sum + s.visits, 0),
      google: trafficSources.filter(s => s.platform === 'google').reduce((sum, s) => sum + s.visits, 0),
    }
    const totalSocialVisits = Object.values(socialBreakdown).reduce((sum, v) => sum + v, 0)

    // UTM campaigns
    const utmCampaigns = utmData.results
      ?.filter(row => row[0] || row[2])
      ?.map(row => ({
        source: row[0],
        medium: row[1],
        campaign: row[2],
        visits: row[3]
      })) || []

    // Device breakdown
    const deviceBreakdown = {}
    devices.results?.forEach(row => {
      if (row[0]) deviceBreakdown[row[0].toLowerCase()] = row[1]
    })
    const mobilePercent = deviceBreakdown['mobile']
      ? Math.round((deviceBreakdown['mobile'] / totalPageviews) * 100)
      : null

    // Top pages
    const topPages = pageviews.results?.slice(0, 5).map(row => ({
      path: row[0],
      views: row[1]
    })) || []

    return {
      last7Days: {
        totalPageviews,
        uniqueVisitors: uniqueSessions,
        bounceRate,
        topPages,
        trafficSources: trafficSources.slice(0, 8),
        socialBreakdown,
        totalSocialVisits,
        utmCampaigns: utmCampaigns.slice(0, 5),
        deviceBreakdown,
        mobilePercent,
      }
    }
  } catch (error) {
    console.error('PostHog analytics error:', error)
    return null
  }
}

async function getPageSpeedScore(url) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${process.env.GOOGLE_PAGESPEED_API_KEY}`
    )
    const data = await res.json()
    return {
      performance: Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100),
      lcp: data.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue,
      cls: data.lighthouseResult?.audits?.['cumulative-layout-shift']?.displayValue,
      fid: data.lighthouseResult?.audits?.['total-blocking-time']?.displayValue,
    }
  } catch (e) {
    return null
  }
}

async function getPreviousRuns(subscriptionId) {
  const { data } = await supabase
    .from('agent_runs')
    .select('analysis_result')
    .eq('subscription_id', subscriptionId)
    .in('status', ['deployed', 'waiting_approval'])
    .order('created_at', { ascending: false })
    .limit(5)

  return data?.map(r => r.analysis_result?.problem).filter(Boolean) || []
}

async function callAI(repoContent, analytics, pageSpeed, previousFixes, websiteUrl) {
  const a = analytics?.last7Days

  const analyticsContext = a ? `
REAL ANALYTICS DATA (last 7 days):
- Total pageviews: ${a.totalPageviews}
- Unique sessions: ${a.uniqueVisitors}
- Bounce rate: ${a.bounceRate}%
- Mobile visitors: ${a.mobilePercent != null ? `${a.mobilePercent}%` : 'unknown'}
- Top pages: ${a.topPages.map(p => `${p.path} (${p.views} views)`).join(', ')}

TRAFFIC SOURCES:
- Google: ${a.socialBreakdown.google} visits
- TikTok: ${a.socialBreakdown.tiktok} visits
- Instagram: ${a.socialBreakdown.instagram} visits
- YouTube: ${a.socialBreakdown.youtube} visits
- Twitter/X: ${a.socialBreakdown.twitter} visits
- Facebook: ${a.socialBreakdown.facebook} visits
- Total social traffic: ${a.totalSocialVisits} visits
${a.utmCampaigns.length > 0 ? `
UTM CAMPAIGNS THIS WEEK:
${a.utmCampaigns.map(c => `- ${c.source || 'unknown'} / ${c.campaign || 'no campaign'}: ${c.visits} visits`).join('\n')}` : ''}
${a.trafficSources.length > 0 ? `
TOP REFERRERS:
${a.trafficSources.map(s => `- ${s.domain}: ${s.visits} visits`).join('\n')}` : ''}
` : 'No analytics data available.'

  const pageSpeedContext = pageSpeed ? `
PERFORMANCE DATA (mobile):
- Performance score: ${pageSpeed.performance}/100
- LCP: ${pageSpeed.lcp}
- CLS: ${pageSpeed.cls}
- Total Blocking Time: ${pageSpeed.fid}
` : ''

  const previousFixesContext = previousFixes.length > 0 ? `
ALREADY FIXED — DO NOT SUGGEST THESE AGAIN:
${previousFixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}
` : ''

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-5',
      messages: [{
        role: 'user',
        content: `You are an elite web conversion optimization expert with deep expertise in UX, performance, SEO, and data-driven CRO.

Analyze the website code AND real analytics data to identify the single highest-impact improvement this week.

${analyticsContext}

${pageSpeedContext}

${previousFixesContext}

WEBSITE CODE:
${JSON.stringify(repoContent, null, 2)}

ANALYSIS FRAMEWORK:
- If social traffic is high but bounce rate is high → landing page doesn't match social content/audience
- If mobile % is high but performance is low → mobile UX is the priority
- If a page has many views but likely low conversion → optimize that specific page
- If TikTok/Instagram is top source → consider if the hero speaks to that audience
- If no social traffic → SEO or CTA optimization
- Always reference specific numbers from the data

RULES:
- Do NOT suggest: /premium route changes, Stripe integration, intentionally disabled features
- The fix MUST be a real code change (not just advice)
- Be specific — reference actual data points in your analysis
- Think like a CRO expert who has studied this site for a week

Reply ONLY as JSON without Markdown:
{
  "problem": "specific problem referencing real data e.g. 'TikTok sends 47 visitors/week but 78% bounce — landing page doesn't match social audience expectations'",
  "impact": "quantified impact with specific numbers from the analytics",
  "solution": "exact actionable change",
  "expected_improvement": "realistic estimate based on the data and industry benchmarks",
  "data_insight": "the key analytics insight that led to this recommendation",
  "file_to_edit": "exact file path",
  "code_change": {
    "find": "exact text to be replaced",
    "replace": "new improved text"
  }
}`
      }]
    })
  })

  const data = await response.json()
  const text = data.choices[0].message.content
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

async function createPR(octokit, owner, repo, analysis) {
  const { data: ref } = await octokit.rest.git.getRef({
    owner, repo, ref: 'heads/main'
  })

  const branchName = `agent/fix-${Date.now()}`
  await octokit.rest.git.createRef({
    owner, repo,
    ref: `refs/heads/${branchName}`,
    sha: ref.object.sha
  })

  const { data: fileData } = await octokit.rest.repos.getContent({
    owner, repo, path: analysis.file_to_edit
  })

  const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8')
  const newContent = currentContent.replace(
    analysis.code_change.find,
    analysis.code_change.replace
  )

  await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo,
    path: analysis.file_to_edit,
    message: `fix: ${analysis.problem}`,
    content: Buffer.from(newContent).toString('base64'),
    sha: fileData.sha,
    branch: branchName
  })

  const { data: pr } = await octokit.rest.pulls.create({
    owner, repo,
    title: `🤖 Agent: ${analysis.problem}`,
    body: `## Problem\n${analysis.problem}\n\n## Data Insight\n${analysis.data_insight || 'N/A'}\n\n## Why this matters\n${analysis.impact}\n\n## Solution\n${analysis.solution}\n\n## Expected Improvement\n${analysis.expected_improvement}`,
    head: branchName,
    base: 'main'
  })

  return pr
}

async function sendTelegramNotification(analysis, pr, runId, analytics) {
  const a = analytics?.last7Days

  let socialLine = ''
  if (a && a.totalSocialVisits > 0) {
    const topSocial = Object.entries(a.socialBreakdown)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([platform, visits]) => `${platform}: ${visits}`)
      .join(' · ')
    socialLine = `📱 *Social traffic:* ${topSocial}\n`
  }

  const analyticsLine = a
    ? `📊 *This week:* ${a.totalPageviews} pageviews · ${a.bounceRate}% bounce\n${socialLine}\n`
    : ''

  const message = `🤖 *Scano Growth Agent*

${analyticsLine}🔍 *Problem found:*
${analysis.problem}

💡 *Data insight:*
${analysis.data_insight || 'Based on code analysis'}

💥 *Impact:*
${analysis.impact}

✅ *Solution:*
${analysis.solution}

📈 *Expected improvement:* ${analysis.expected_improvement}

🔗 [View PR](${pr.html_url})

Reply *approve ${runId}* or *reject ${runId}*`

  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    }
  )

  const data = await response.json()
  console.log('Telegram response:', JSON.stringify(data))

  if (!data.ok) {
    console.error('Telegram error:', data.description)
    return null
  }

  return data.result.message_id
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
      const { data: run } = await supabase
        .from('agent_runs')
        .insert({
          subscription_id: conn.subscription_id,
          status: 'running'
        })
        .select()
        .single()

      const octokit = await getOctokit(conn.github_installation_id)

      const [repoContent, analytics, pageSpeed, previousFixes] = await Promise.all([
        analyzeRepo(octokit, conn.github_repo_owner, conn.github_repo_name),
        getPostHogAnalytics(
          conn.posthog_api_key || process.env.POSTHOG_API_KEY,
          conn.posthog_project_id || process.env.POSTHOG_PROJECT_ID,
          conn.posthog_host || process.env.POSTHOG_HOST
        ),
        conn.website_url ? getPageSpeedScore(conn.website_url) : null,
        getPreviousRuns(conn.subscription_id),
      ])

      const analysis = await callAI(repoContent, analytics, pageSpeed, previousFixes, conn.website_url)

      const pr = await createPR(
        octokit, conn.github_repo_owner, conn.github_repo_name, analysis
      )

      const messageId = await sendTelegramNotification(analysis, pr, run.id, analytics)

      await supabase.from('agent_runs').update({
        status: 'waiting_approval',
        analysis_result: {
          ...analysis,
          analytics_snapshot: analytics?.last7Days
        },
        pr_number: pr.number,
        pr_url: pr.html_url,
        telegram_message_id: messageId || null
      }).eq('id', run.id)
    }

    res.json({ success: true, processed: connections.length })
  } catch (error) {
    console.error('Agent error:', error)
    res.status(500).json({ error: error.message })
  }
}