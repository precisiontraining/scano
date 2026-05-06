import { createClient } from '@supabase/supabase-js'
import { App } from '@octokit/app'
import { Octokit } from '@octokit/rest'

export default async function handler(req, res) {
  const cronSecret = req.headers['x-cron-secret']
  const vercelCron = req.headers['x-vercel-cron']
  const action = req.query?.action

  // Account actions — authenticated via Bearer token
  if (action === 'pause' || action === 'resume' || action === 'delete') {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

    if (action === 'pause') {
      await supabase.from('agent_subscriptions').update({ status: 'paused' }).eq('auth_user_id', user.id)
      return res.json({ success: true, status: 'paused' })
    }

    if (action === 'resume') {
      await supabase.from('agent_subscriptions').update({ status: 'active' }).eq('auth_user_id', user.id)
      return res.json({ success: true, status: 'active' })
    }

    if (action === 'delete') {
      const { data: subs } = await supabase.from('agent_subscriptions').select('id').eq('auth_user_id', user.id)
      const subIds = subs?.map(s => s.id) || []
      if (subIds.length > 0) {
        await supabase.from('agent_runs').delete().in('subscription_id', subIds)
        await supabase.from('agent_connections').delete().in('subscription_id', subIds)
        await supabase.from('agent_subscriptions').delete().in('id', subIds)
      }
      await supabase.auth.admin.deleteUser(user.id)
      return res.json({ success: true })
    }
  }

  if (!vercelCron && cronSecret !== process.env.AGENT_CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const mode = req.query?.mode

  if (mode === 'evaluate_ab') return handleEvaluateAB(res)
  if (mode === 'midweek') return handleMidweek(res)
  return handleFullRun(res)
}

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
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]

    const [pageviewsRes, sessionsRes, lastWeekRes, referrersRes, utmRes, deviceRes] = await Promise.all([
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

    const [pageviews, sessions, lastWeek, referrers, utmData, devices] = await Promise.all([
      pageviewsRes.json(),
      sessionsRes.json(),
      lastWeekRes.json(),
      referrersRes.json(),
      utmRes.json(),
      deviceRes.json(),
    ])

    const sessionPageCounts = {}
    sessions.results?.forEach(row => {
      sessionPageCounts[row[0]] = (sessionPageCounts[row[0]] || 0) + 1
    })
    const uniqueSessions = Object.keys(sessionPageCounts).length
    const bouncedSessions = Object.values(sessionPageCounts).filter(c => c === 1).length
    const bounceRate = uniqueSessions > 0 ? Math.round((bouncedSessions / uniqueSessions) * 100) : 0
    const totalPageviews = pageviews.results?.reduce((sum, row) => sum + (row[1] || 0), 0) || 0

    const lastWeekSessions = new Set(lastWeek.results?.map(r => r[0])).size || 0
    const trafficChange = lastWeekSessions > 0
      ? Math.round(((uniqueSessions - lastWeekSessions) / lastWeekSessions) * 100)
      : null

    const socialBreakdown = { tiktok: 0, instagram: 0, youtube: 0, twitter: 0, facebook: 0, google: 0 }
    const trafficSources = []
    referrers.results?.forEach(row => {
      const domain = row[0] || ''
      const visits = row[1]
      if (domain) trafficSources.push({ domain, visits })
      if (domain.includes('tiktok')) socialBreakdown.tiktok += visits
      else if (domain.includes('instagram') || domain.includes('ig.me')) socialBreakdown.instagram += visits
      else if (domain.includes('youtube') || domain.includes('youtu.be')) socialBreakdown.youtube += visits
      else if (domain.includes('twitter') || domain.includes('t.co')) socialBreakdown.twitter += visits
      else if (domain.includes('facebook') || domain.includes('fb.me')) socialBreakdown.facebook += visits
      else if (domain.includes('google')) socialBreakdown.google += visits
    })
    const totalSocialVisits = Object.values(socialBreakdown).reduce((sum, v) => sum + v, 0)

    const utmCampaigns = utmData.results
      ?.filter(row => row[0] || row[2])
      ?.map(row => ({ source: row[0], medium: row[1], campaign: row[2], visits: row[3] })) || []

    const deviceBreakdown = {}
    devices.results?.forEach(row => {
      if (row[0]) deviceBreakdown[row[0].toLowerCase()] = row[1]
    })
    const mobilePercent = deviceBreakdown['mobile'] && totalPageviews > 0
      ? Math.round((deviceBreakdown['mobile'] / totalPageviews) * 100)
      : null

    const topPages = pageviews.results?.slice(0, 5).map(row => ({
      path: row[0], views: row[1]
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
        trafficChange,
        lastWeekSessions,
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

// ─── PHASE 2: BUSINESS DNA / MEMORY ─────────────────────────────────────────
async function fetchBusinessDNA(subscriptionId) {
  const { data } = await supabase
    .from('agent_learnings')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!data || data.length === 0) return null

  const wins = data.filter(l => l.outcome === 'positive')
  const losses = data.filter(l => l.outcome === 'negative')
  const fmtDelta = d => (d > 0 ? `+${d}%` : `${d}%`)

  return {
    winsText: wins.map(l => `• ${l.change_type}: ${l.summary} (${fmtDelta(l.delta)} ${l.metric_type})`).join('\n') || 'None yet',
    lossesText: losses.map(l => `• ${l.change_type}: ${l.summary} (${fmtDelta(l.delta)} ${l.metric_type})`).join('\n') || 'None yet',
  }
}

async function saveLearning(subscriptionId, runId, changeType, summary, outcome, metricType, delta, confidence) {
  await supabase.from('agent_learnings').insert({
    subscription_id: subscriptionId,
    run_id: runId,
    change_type: changeType,
    summary,
    outcome,
    metric_type: metricType,
    delta,
    confidence,
  })
}

// ─── PHASE 2: A/B TESTING ────────────────────────────────────────────────────
async function createABTest(conn, runId, analysis) {
  const apiKey = conn.posthog_api_key || process.env.POSTHOG_API_KEY
  const projectId = conn.posthog_project_id || process.env.POSTHOG_PROJECT_ID
  const host = conn.posthog_host || process.env.POSTHOG_HOST || 'https://eu.posthog.com'
  if (!apiKey || !projectId) return null

  const flagKey = `velyr-ab-${runId.slice(0, 8)}`

  try {
    const res = await fetch(`${host}/api/projects/${projectId}/feature_flags/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: flagKey,
        name: `[Velyr A/B] ${analysis.problem}`,
        active: true,
        filters: {
          groups: [{ properties: [], rollout_percentage: 50 }],
          multivariate: {
            variants: [
              { key: 'control', name: 'Control (original)', rollout_percentage: 50 },
              { key: 'treatment', name: 'Treatment (Velyr)', rollout_percentage: 50 }
            ]
          }
        }
      })
    })

    const flag = await res.json()

    await supabase.from('agent_ab_tests').insert({
      run_id: runId,
      subscription_id: conn.subscription_id,
      posthog_flag_key: flagKey,
      posthog_flag_id: flag.id,
      change_type: analysis.change_type || 'other',
      summary: analysis.problem,
      status: 'running',
      evaluate_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    })

    return flagKey
  } catch (err) {
    console.error('A/B test creation failed:', err)
    return null
  }
}

// ─── PHASE 2: EVALUATE A/B TESTS ─────────────────────────────────────────────
async function handleEvaluateAB(res) {
  const { data: tests } = await supabase
    .from('agent_ab_tests')
    .select('*')
    .eq('status', 'running')
    .lt('evaluate_after', new Date().toISOString())

  if (!tests || tests.length === 0) {
    return res.json({ success: true, message: 'No A/B tests to evaluate' })
  }

  for (const test of tests) {
    try {
      const { data: conn } = await supabase
        .from('agent_connections')
        .select('*')
        .eq('subscription_id', test.subscription_id)
        .single()

      const apiKey = conn?.posthog_api_key || process.env.POSTHOG_API_KEY
      const projectId = conn?.posthog_project_id || process.env.POSTHOG_PROJECT_ID
      const host = conn?.posthog_host || process.env.POSTHOG_HOST || 'https://eu.posthog.com'
      if (!apiKey) continue

      const flagRes = await fetch(
        `${host}/api/projects/${projectId}/feature_flags/${test.posthog_flag_id}/`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      )
      const flagData = await flagRes.json()
      const results = flagData?.experiment_results?.result
      if (!results) continue

      const controlRate = results.control?.conversion_rate ?? 0
      const treatmentRate = results.treatment?.conversion_rate ?? 0

      let winner = null
      let delta = 0
      if (treatmentRate > controlRate * 1.05) {
        winner = 'treatment'
        delta = Math.round(((treatmentRate - controlRate) / (controlRate || 1)) * 100)
      } else if (controlRate > treatmentRate * 1.05) {
        winner = 'control'
        delta = -Math.round(((controlRate - treatmentRate) / (controlRate || 1)) * 100)
      }
      if (!winner) continue

      await saveLearning(
        test.subscription_id, test.run_id,
        test.change_type, test.summary,
        winner === 'treatment' ? 'positive' : 'negative',
        'conversion_rate', delta, 'high'
      )

      await supabase
        .from('agent_ab_tests')
        .update({ status: 'completed', winner, delta_pct: delta })
        .eq('id', test.id)

      const outcomeMsg = winner === 'treatment'
        ? `✅ *A/B Test Winner: Treatment*\n📈 +${delta}% conversion lift confirmed.\nSaved to your Business DNA.`
        : `📊 *A/B Result: Control Won*\n📉 Change did not improve conversions (${delta}%).\nLearning saved — agent will avoid similar patterns.`

      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `🤖 *Velyr Growth Agent — A/B Result*\n\n*${test.summary}*\n\n${outcomeMsg}`,
          parse_mode: 'Markdown'
        })
      })
    } catch (err) {
      console.error('A/B evaluate error for test', test.id, err)
    }
  }

  return res.json({ success: true, evaluated: tests.length })
}

// ─── IMPACT CALCULATION ──────────────────────────────────────────────────────
function estimateRevenueImpact(visitors, bounceRate, conversionLift, avgOrderValue = 47) {
  if (!visitors || visitors < 10) return null
  const monthlyVisitors = visitors * 4.3
  const baseConversionRate = 0.02
  const currentConversions = monthlyVisitors * (1 - bounceRate / 100) * baseConversionRate
  const newConversions = currentConversions * (1 + conversionLift)
  const additionalConversions = newConversions - currentConversions
  const revenueMin = Math.round(additionalConversions * avgOrderValue * 0.7)
  const revenueMax = Math.round(additionalConversions * avgOrderValue * 1.3)
  return { revenueMin, revenueMax, additionalConversions: Math.round(additionalConversions) }
}

async function callAI(repoContent, analytics, pageSpeed, previousFixes, dna) {
  const a = analytics?.last7Days

  const analyticsContext = a ? `
REAL ANALYTICS DATA (last 7 days):
- Total pageviews: ${a.totalPageviews}
- Unique sessions: ${a.uniqueVisitors}
- Bounce rate: ${a.bounceRate}%
- Mobile visitors: ${a.mobilePercent != null ? `${a.mobilePercent}%` : 'unknown'}
- Traffic change vs last week: ${a.trafficChange != null ? `${a.trafficChange > 0 ? '+' : ''}${a.trafficChange}%` : 'first week'}
- Top pages: ${a.topPages.map(p => `${p.path} (${p.views} views)`).join(', ')}

TRAFFIC SOURCES:
- Google: ${a.socialBreakdown.google} visits
- TikTok: ${a.socialBreakdown.tiktok} visits
- Instagram: ${a.socialBreakdown.instagram} visits
- YouTube: ${a.socialBreakdown.youtube} visits
- Twitter/X: ${a.socialBreakdown.twitter} visits
- Facebook: ${a.socialBreakdown.facebook} visits
- Total social: ${a.totalSocialVisits} visits
${a.utmCampaigns.length > 0 ? `
UTM CAMPAIGNS:
${a.utmCampaigns.map(c => `- ${c.source || 'unknown'} / ${c.campaign || 'no campaign'}: ${c.visits} visits`).join('\n')}` : ''}
` : 'No analytics data available.'

  const pageSpeedContext = pageSpeed ? `
PERFORMANCE (mobile):
- Score: ${pageSpeed.performance}/100
- LCP: ${pageSpeed.lcp}
- CLS: ${pageSpeed.cls}
- Total Blocking Time: ${pageSpeed.fid}
` : ''

  const previousFixesContext = previousFixes.length > 0 ? `
ALREADY FIXED — DO NOT SUGGEST THESE AGAIN:
${previousFixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}
` : ''

  // ── PHASE 2: Business DNA injected into prompt ──
  const dnaContext = dna ? `
BUSINESS DNA (past learnings — respect these):
What worked well (double down on these patterns):
${dna.winsText}

What did NOT work (avoid repeating these):
${dna.lossesText}
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
        content: `You are an elite web conversion optimization expert.

Analyze the website code AND real analytics data to find the single highest-impact improvement.

${analyticsContext}
${pageSpeedContext}
${previousFixesContext}
${dnaContext}

WEBSITE CODE:
${JSON.stringify(repoContent, null, 2)}

RULES:
- Do NOT suggest: /premium route, Stripe, intentionally disabled features
- The fix MUST be a real code change
- Reference specific data points in your analysis
- If social traffic is high but bounce rate is high → landing page doesn't match social audience
- If mobile % is high but performance is low → mobile UX is priority
- Respect the Business DNA: double down on what worked, avoid what didn't

IMPACT PREDICTION RULES:
- conversion_lift_min and conversion_lift_max: realistic percentage POINTS improvement. Base on change type:
  * Headline/CTA copy changes: 8–25
  * Social proof additions: 10–20
  * Performance improvements: 5–15
  * Mobile UX fixes: 10–30 (if mobile % is high)
  * Trust signals: 5–12
- Be conservative. Do NOT invent numbers you can't justify from the data.

RISK SCORING RULES:
- risk_level: "low" | "medium" | "high"
  * low = text/copy change, zero chance of breaking layout
  * medium = component change, might affect other elements
  * high = structural/logic change, needs careful testing
- effort_estimate: "15min" | "1h" | "half-day" | "full-day"
- rollback_safe: true if the change can trivially be reverted

Reply ONLY as JSON without Markdown:
{
  "problem": "specific problem referencing real data",
  "impact": "quantified impact with numbers",
  "solution": "exact actionable change",
  "expected_improvement": "realistic estimate",
  "data_insight": "key analytics insight",
  "file_to_edit": "exact file path",
  "change_type": "headline|cta|copy|layout|pricing|trust|navigation|performance|other",
  "code_change": {
    "find": "exact text to replace",
    "replace": "new improved text"
  },
  "impact_prediction": {
    "conversion_lift_min": 8,
    "conversion_lift_max": 18,
    "confidence": "medium",
    "confidence_reason": "one sentence why this range is realistic based on the data"
  },
  "risk_score": {
    "risk_level": "low",
    "effort_estimate": "15min",
    "rollback_safe": true,
    "risk_reason": "one sentence explaining the risk level"
  }
}`
      }]
    })
  })

  const data = await response.json()
  const text = data.choices[0].message.content
  const analysis = JSON.parse(text.replace(/```json|```/g, '').trim())

  if (a?.uniqueVisitors && analysis.impact_prediction) {
    const lift = analysis.impact_prediction.conversion_lift_min / 100
    analysis.impact_prediction.revenue_estimate = estimateRevenueImpact(
      a.uniqueVisitors,
      a.bounceRate,
      lift
    )
  }

  return analysis
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

  const riskEmoji = { low: '🟢', medium: '🟡', high: '🔴' }[analysis.risk_score?.risk_level] || '⚪'
  const prBody = [
    `## Problem\n${analysis.problem}`,
    `## Data Insight\n${analysis.data_insight || 'N/A'}`,
    `## Why this matters\n${analysis.impact}`,
    `## Solution\n${analysis.solution}`,
    `## Expected Improvement\n${analysis.expected_improvement}`,
    analysis.impact_prediction ? `## Impact Prediction\n- Conversion lift: +${analysis.impact_prediction.conversion_lift_min}–${analysis.impact_prediction.conversion_lift_max}%\n- Confidence: ${analysis.impact_prediction.confidence}\n- Reason: ${analysis.impact_prediction.confidence_reason}` : '',
    analysis.risk_score ? `## Risk Assessment\n${riskEmoji} Risk: **${analysis.risk_score.risk_level}** | Effort: ${analysis.risk_score.effort_estimate} | Rollback safe: ${analysis.risk_score.rollback_safe ? 'Yes ✅' : 'No ⚠️'}\n${analysis.risk_score.risk_reason}` : '',
  ].filter(Boolean).join('\n\n')

  const { data: pr } = await octokit.rest.pulls.create({
    owner, repo,
    title: `🤖 Agent: ${analysis.problem}`,
    body: prBody,
    head: branchName,
    base: 'main'
  })

  return pr
}

async function sendTelegramNotification(analysis, pr, runId, analytics) {
  const a = analytics?.last7Days

  let socialLine = ''
  if (a?.totalSocialVisits > 0) {
    const topSocial = Object.entries(a.socialBreakdown)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([platform, visits]) => `${platform}: ${visits}`)
      .join(' · ')
    socialLine = `📱 *Social:* ${topSocial}\n`
  }

  const trendText = a?.trafficChange != null
    ? ` · ${a.trafficChange > 0 ? '+' : ''}${a.trafficChange}% vs last week`
    : ''

  const analyticsLine = a
    ? `📊 *This week:* ${a.totalPageviews} pageviews · ${a.bounceRate}% bounce${trendText}\n${socialLine}\n`
    : ''

  let impactBlock = ''
  if (analysis.impact_prediction) {
    const ip = analysis.impact_prediction
    const confidenceEmoji = { high: '🎯', medium: '📐', low: '🔮' }[ip.confidence] || '📐'
    let revLine = ''
    if (ip.revenue_estimate) {
      const { revenueMin, revenueMax } = ip.revenue_estimate
      revLine = `💶 *Revenue impact:* +${revenueMin}–${revenueMax} €/month\n`
    }
    impactBlock = `${confidenceEmoji} *Impact Prediction* _(${ip.confidence} confidence)_
📈 Conversion lift: +${ip.conversion_lift_min}–${ip.conversion_lift_max}%
${revLine}_${ip.confidence_reason}_\n\n`
  }

  let riskBlock = ''
  if (analysis.risk_score) {
    const rs = analysis.risk_score
    const riskEmoji = { low: '🟢', medium: '🟡', high: '🔴' }[rs.risk_level] || '⚪'
    const rollbackText = rs.rollback_safe ? '✅ Rollback safe' : '⚠️ Needs care'
    riskBlock = `${riskEmoji} *Risk:* ${rs.risk_level.toUpperCase()} · ⏱ ${rs.effort_estimate} · ${rollbackText}\n_${rs.risk_reason}_\n\n`
  }

  const message = `🤖 *Velyr Growth Agent*

${analyticsLine}🔍 *Problem found:*
${analysis.problem}

💡 *Data insight:*
${analysis.data_insight || 'Based on code analysis'}

💥 *Impact:*
${analysis.impact}

${impactBlock}${riskBlock}✅ *Solution:*
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
  if (!data.ok) console.error('Telegram error:', data.description)
  return data.result?.message_id || null
}

async function sendMidweekUpdate(chatId, analytics) {
  const a = analytics?.last7Days
  if (!a) return

  const trendEmoji = a.trafficChange === null ? '📊'
    : a.trafficChange > 10 ? '📈'
    : a.trafficChange < -10 ? '📉'
    : '➡️'

  const trendText = a.trafficChange === null ? 'first week of tracking'
    : a.trafficChange > 0 ? `+${a.trafficChange}% vs last week`
    : `${a.trafficChange}% vs last week`

  const socialLines = Object.entries(a.socialBreakdown)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([platform, visits]) => {
      const emoji = { tiktok: '🎵', instagram: '📸', youtube: '▶️', twitter: '𝕏', google: '🔍', facebook: '📘' }[platform] || '🌐'
      return `  ${emoji} ${platform}: ${visits} visits`
    })
    .join('\n')

  const pagesLines = a.topPages.slice(0, 3)
    .map(p => `  • ${p.path} — ${p.views} views`)
    .join('\n')

  const bounceAssessment = a.bounceRate > 70
    ? `⚠️ High bounce rate (${a.bounceRate}%) — agent will prioritize this Monday`
    : a.bounceRate > 50
    ? `🟡 Bounce rate ${a.bounceRate}% — room to improve`
    : a.bounceRate === 0
    ? `📊 No bounce data yet`
    : `✅ Bounce rate ${a.bounceRate}% — looking good`

  const message = `📊 *Velyr — Mid-Week Update*
_${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}_

${trendEmoji} *Traffic this week*
${a.uniqueVisitors} visitors · ${a.totalPageviews} pageviews
${trendText}

${bounceAssessment}

${socialLines ? `*Top traffic sources:*\n${socialLines}` : '*No social traffic yet this week*'}

${pagesLines ? `*Most visited:*\n${pagesLines}` : ''}

🤖 _Watching 24/7. Every Monday the agent sends the next fix for your approval._`

  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
  })
}

async function handleMidweek(res) {
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

    const { data: sub } = await supabase
      .from('agent_subscriptions')
      .select('telegram_chat_id')
      .eq('id', conn.subscription_id)
      .single()

    const chatId = sub?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID
    await sendMidweekUpdate(chatId, analytics)
  }

  return res.json({ success: true, mode: 'midweek' })
}

async function handleFullRun(res) {
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
      .insert({ subscription_id: conn.subscription_id, status: 'running' })
      .select()
      .single()

    const octokit = await getOctokit(conn.github_installation_id)

    // ── PHASE 2: fetchBusinessDNA added to parallel fetches ──
    const [repoContent, analytics, pageSpeed, previousFixes, dna] = await Promise.all([
      analyzeRepo(octokit, conn.github_repo_owner, conn.github_repo_name),
      getPostHogAnalytics(
        conn.posthog_api_key || process.env.POSTHOG_API_KEY,
        conn.posthog_project_id || process.env.POSTHOG_PROJECT_ID,
        conn.posthog_host || process.env.POSTHOG_HOST
      ),
      conn.website_url ? getPageSpeedScore(conn.website_url) : null,
      getPreviousRuns(conn.subscription_id),
      fetchBusinessDNA(conn.subscription_id),
    ])

    const analysis = await callAI(repoContent, analytics, pageSpeed, previousFixes, dna)
    const pr = await createPR(octokit, conn.github_repo_owner, conn.github_repo_name, analysis)
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

    // ── PHASE 2: Start A/B test ──
    await createABTest(conn, run.id, analysis)
  }

  return res.json({ success: true, processed: connections.length })
}