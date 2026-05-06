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
  if (mode === 'rollback_check') return handleRollbackCheck(res)
  if (mode === 'weekly_summary') return handleWeeklySummary(res)
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

// ─── PHASE 4: AUTO-DETECT ALL PAGES IN REPO ──────────────────────────────────
async function detectAllPages(octokit, owner, repo) {
  const pages = {}

  // Directories to scan for page files
  const dirsToScan = [
    'src/pages', 'src/views', 'src/screens',
    'pages', 'app', 'src/app',
  ]

  const pageTypeMap = {
    home: 'landing', index: 'landing', landing: 'landing',
    pricing: 'pricing', price: 'pricing', plans: 'pricing',
    checkout: 'checkout', payment: 'checkout', cart: 'checkout',
    blog: 'blog', post: 'blog', article: 'blog',
    about: 'about', contact: 'about',
    lead: 'lead_magnet', download: 'lead_magnet', free: 'lead_magnet',
    login: 'auth', signup: 'auth', register: 'auth',
    dashboard: 'dashboard', account: 'dashboard',
  }

  for (const dir of dirsToScan) {
    try {
      const { data: contents } = await octokit.rest.repos.getContent({ owner, repo, path: dir })
      if (!Array.isArray(contents)) continue

      for (const item of contents) {
        if (item.type !== 'file') continue
        if (!item.name.match(/\.(jsx|tsx|js|ts|html|vue|svelte)$/)) continue

        try {
          const { data: fileData } = await octokit.rest.repos.getContent({ owner, repo, path: item.path })
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8')

          // Detect page type from filename
          const nameLower = item.name.toLowerCase().replace(/\.(jsx|tsx|js|ts|html|vue|svelte)$/, '')
          let pageType = 'other'
          for (const [keyword, type] of Object.entries(pageTypeMap)) {
            if (nameLower.includes(keyword)) { pageType = type; break }
          }

          pages[item.path] = { content, pageType, fileName: item.name }
        } catch (e) {
          // skip unreadable files
        }
      }
    } catch (e) {
      // directory doesn't exist, skip
    }
  }

  // Also check root-level pages pattern (Next.js style)
  try {
    const { data: rootPages } = await octokit.rest.repos.getContent({ owner, repo, path: 'pages' })
    if (Array.isArray(rootPages)) {
      for (const item of rootPages) {
        if (item.type !== 'file' || !item.name.match(/\.(jsx|tsx|js|ts)$/)) continue
        try {
          const { data: fileData } = await octokit.rest.repos.getContent({ owner, repo, path: item.path })
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8')
          const nameLower = item.name.toLowerCase().replace(/\.(jsx|tsx|js|ts)$/, '')
          let pageType = 'other'
          for (const [keyword, type] of Object.entries(pageTypeMap)) {
            if (nameLower.includes(keyword)) { pageType = type; break }
          }
          if (!pages[item.path]) pages[item.path] = { content, pageType, fileName: item.name }
        } catch (e) {}
      }
    }
  } catch (e) {}

  return pages
}

// ─── PHASE 4: BUILD FUNNEL ANALYSIS FROM PAGES + ANALYTICS ──────────────────
function buildFunnelAnalysis(allPages, analytics) {
  const a = analytics?.last7Days
  if (!a) return null

  const topPathViews = {}
  a.topPages?.forEach(p => { topPathViews[p.path] = p.views })

  const funnelPages = []

  // Funnel priority order — where do users drop off?
  const funnelOrder = ['landing', 'pricing', 'checkout', 'lead_magnet', 'blog', 'about', 'other', 'auth', 'dashboard']

  const pagesByType = {}
  for (const [path, info] of Object.entries(allPages)) {
    const type = info.pageType || 'other'
    if (!pagesByType[type]) pagesByType[type] = []
    pagesByType[type].push(path)
  }

  let prevViews = null
  for (const type of funnelOrder) {
    const paths = pagesByType[type] || []
    for (const path of paths) {
      // Try to match to analytics path (best effort)
      const routePath = '/' + path.replace(/^(src\/pages|pages|src\/views|src\/screens)\//, '')
        .replace(/\.(jsx|tsx|js|ts)$/, '')
        .replace(/\/index$/, '')
        .toLowerCase()

      const views = topPathViews[routePath] || topPathViews[routePath + '/'] || 0
      const dropOffScore = prevViews && views > 0 ? Math.round((1 - views / prevViews) * 100) : null

      funnelPages.push({
        filePath: path,
        pageType: type,
        routePath,
        views,
        dropOffScore,
      })

      if (views > 0 && (prevViews === null || type === 'landing')) prevViews = views
      else if (views > 0) prevViews = views
    }
  }

  // Sort by drop-off opportunity (highest drop = most urgent)
  const withDropOff = funnelPages.filter(p => p.dropOffScore !== null && p.dropOffScore > 0)
  const biggestDropOff = withDropOff.sort((a, b) => b.dropOffScore - a.dropOffScore)[0] || null

  return {
    totalPages: Object.keys(allPages).length,
    funnelPages,
    biggestDropOff,
    pageTypes: Object.fromEntries(
      Object.entries(pagesByType).map(([type, paths]) => [type, paths.length])
    ),
  }
}

// ─── PHASE 4: SAVE FUNNEL PAGE INSIGHTS TO DB ────────────────────────────────
async function saveFunnelPages(subscriptionId, runId, funnelAnalysis, allPages) {
  if (!funnelAnalysis?.funnelPages?.length) return

  const rows = funnelAnalysis.funnelPages
    .filter(p => p.views > 0 || p.pageType === 'landing')
    .slice(0, 20)
    .map(p => ({
      subscription_id: subscriptionId,
      run_id: runId,
      page_path: p.filePath,
      page_type: p.pageType,
      views_7d: p.views || 0,
      drop_off_score: p.dropOffScore,
    }))

  if (rows.length > 0) {
    await supabase.from('agent_funnel_pages').insert(rows)
  }
}

// ─── PHASE 4: FETCH BRAND GUARDRAILS ─────────────────────────────────────────
async function fetchBrandGuardrails(subscriptionId) {
  const { data } = await supabase
    .from('agent_brand_guardrails')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .single()

  return data || null
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

// ─── PHASE 3: ROLLBACK AUTOMATION ────────────────────────────────────────────
async function handleRollbackCheck(res) {
  // Find runs deployed 48h ago that haven't been rolled back yet
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const ninetyTwoHoursAgo = new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString()

  const { data: deployedRuns } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('status', 'deployed')
    .gte('completed_at', ninetyTwoHoursAgo)
    .lte('completed_at', fortyEightHoursAgo)

  if (!deployedRuns || deployedRuns.length === 0) {
    return res.json({ success: true, message: 'No runs to evaluate for rollback' })
  }

  for (const run of deployedRuns) {
    try {
      const { data: conn } = await supabase
        .from('agent_connections')
        .select('*')
        .eq('subscription_id', run.subscription_id)
        .single()

      const apiKey = conn?.posthog_api_key || process.env.POSTHOG_API_KEY
      const projectId = conn?.posthog_project_id || process.env.POSTHOG_PROJECT_ID
      const host = conn?.posthog_host || process.env.POSTHOG_HOST || 'https://eu.posthog.com'

      if (!apiKey || !projectId) continue

      // Get bounce rate before and after deploy
      const deployedAt = new Date(run.completed_at)
      const twoDaysBefore = new Date(deployedAt - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const deployedDate = deployedAt.toISOString().split('T')[0]
      const twoDaysAfter = new Date(deployedAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

      const [beforeRes, afterRes] = await Promise.all([
        fetch(`${host}/api/projects/${projectId}/query/`, {
          method: 'POST', headers,
          body: JSON.stringify({
            query: {
              kind: 'EventsQuery',
              select: ['properties.$session_id', 'count()'],
              event: '$pageview',
              after: twoDaysBefore, before: deployedDate,
              limit: 2000,
            }
          })
        }),
        fetch(`${host}/api/projects/${projectId}/query/`, {
          method: 'POST', headers,
          body: JSON.stringify({
            query: {
              kind: 'EventsQuery',
              select: ['properties.$session_id', 'count()'],
              event: '$pageview',
              after: deployedDate, before: twoDaysAfter,
              limit: 2000,
            }
          })
        }),
      ])

      const [before, after] = await Promise.all([beforeRes.json(), afterRes.json()])

      const calcBounceRate = (results) => {
        const counts = {}
        results?.forEach(row => { counts[row[0]] = (counts[row[0]] || 0) + 1 })
        const total = Object.keys(counts).length
        const bounced = Object.values(counts).filter(c => c === 1).length
        return total > 10 ? Math.round((bounced / total) * 100) : null
      }

      const bounceBefore = calcBounceRate(before.results)
      const bounceAfter = calcBounceRate(after.results)

      if (bounceBefore === null || bounceAfter === null) continue

      // Rollback trigger: bounce rate increased by 15+ percentage points
      const bounceDelta = bounceAfter - bounceBefore
      const shouldRollback = bounceDelta >= 15

      // Save impact metric regardless
      await supabase.from('impact_metrics').insert({
        run_id: run.id,
        metric_type: 'bounce_rate',
        value_before: bounceBefore,
        value_after: bounceAfter,
        measured_at: new Date().toISOString(),
      })

      // Save learning either way
      await saveLearning(
        run.subscription_id,
        run.id,
        run.analysis_result?.change_type || 'other',
        run.analysis_result?.problem || 'Unknown change',
        shouldRollback ? 'negative' : 'positive',
        'bounce_rate',
        -bounceDelta, // negative delta = more bouncing = bad
        'high'
      )

      if (shouldRollback) {
        // Perform rollback via GitHub — revert the squash commit
        const octokit = await getOctokit(conn.github_installation_id)
        const owner = conn.github_repo_owner
        const repo = conn.github_repo_name

        try {
          // Get commit history to find the agent commit
          const { data: commits } = await octokit.rest.repos.listCommits({
            owner, repo, per_page: 10
          })

          const agentCommit = commits.find(c => c.commit.message.startsWith('fix:') && c.commit.message.includes(run.analysis_result?.problem?.slice(0, 30)))

          if (agentCommit) {
            // Create a revert commit
            const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: 'heads/main' })
            const branchName = `agent/rollback-${run.id.slice(0, 8)}`

            await octokit.rest.git.createRef({
              owner, repo,
              ref: `refs/heads/${branchName}`,
              sha: ref.object.sha
            })

            // Get the file as it was before the agent commit (parent commit)
            const parentSha = agentCommit.parents[0]?.sha
            if (parentSha && run.analysis_result?.file_to_edit) {
              const { data: originalFile } = await octokit.rest.repos.getContent({
                owner, repo,
                path: run.analysis_result.file_to_edit,
                ref: parentSha
              })

              const { data: currentFile } = await octokit.rest.repos.getContent({
                owner, repo,
                path: run.analysis_result.file_to_edit,
              })

              await octokit.rest.repos.createOrUpdateFileContents({
                owner, repo,
                path: run.analysis_result.file_to_edit,
                message: `revert: rollback agent change (bounce rate +${bounceDelta}%)`,
                content: originalFile.content,
                sha: currentFile.sha,
                branch: branchName
              })

              const { data: pr } = await octokit.rest.pulls.create({
                owner, repo,
                title: `🔄 Auto-Rollback: ${run.analysis_result?.problem}`,
                body: `## Automatic Rollback\n\nThis rollback was triggered because the bounce rate increased by **+${bounceDelta}%** in the 48h after deployment.\n\n- Bounce rate before: ${bounceBefore}%\n- Bounce rate after: ${bounceAfter}%\n\n**Learning saved to Business DNA.** The agent will avoid similar changes going forward.`,
                head: branchName,
                base: 'main'
              })

              await octokit.rest.pulls.merge({
                owner, repo,
                pull_number: pr.number,
                merge_method: 'squash'
              })

              await supabase.from('agent_runs').update({ status: 'rolled_back' }).eq('id', run.id)

              // Notify via Telegram
              await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: process.env.TELEGRAM_CHAT_ID,
                  text: `🔄 *Velyr Auto-Rollback Triggered*\n\n*Change:* ${run.analysis_result?.problem}\n\n📉 *Reason:* Bounce rate went from ${bounceBefore}% → ${bounceAfter}% (+${bounceDelta}% in 48h)\n\n✅ Reverted automatically. Business DNA updated — agent won't repeat this pattern.\n\n_Run ID: \`${run.id.slice(0, 8)}\`_`,
                  parse_mode: 'Markdown'
                })
              })
            }
          }
        } catch (rollbackErr) {
          console.error('Rollback execution failed:', rollbackErr)
          // Still notify even if auto-rollback failed
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: process.env.TELEGRAM_CHAT_ID,
              text: `⚠️ *Velyr Rollback Alert*\n\n*Change:* ${run.analysis_result?.problem}\n\n📉 Bounce rate increased by +${bounceDelta}% after deploy (${bounceBefore}% → ${bounceAfter}%).\n\n❌ Auto-rollback failed — please revert manually.\n\n_Run ID: \`${run.id.slice(0, 8)}\`_`,
              parse_mode: 'Markdown'
            })
          })
        }
      } else if (bounceDelta <= -5) {
        // Positive result — notify
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: `📈 *Velyr Impact Check — Positive Result*\n\n*Change:* ${run.analysis_result?.problem}\n\n✅ Bounce rate improved: ${bounceBefore}% → ${bounceAfter}% (${bounceDelta}%)\n\nLearning saved to Business DNA.`,
            parse_mode: 'Markdown'
          })
        })
      }
    } catch (err) {
      console.error('Rollback check error for run', run.id, err)
    }
  }

  return res.json({ success: true, checked: deployedRuns.length })
}

// ─── PHASE 3: COMPETITOR AWARENESS ────────────────────────────────────────────
async function fetchCompetitorData(competitorUrls) {
  if (!competitorUrls || competitorUrls.length === 0) return null

  const results = []

  for (const url of competitorUrls.slice(0, 2)) {
    try {
      // Fetch competitor page HTML (basic, no JS rendering)
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VelyrBot/1.0)' },
        signal: AbortSignal.timeout(5000)
      })
      const html = await res.text()

      // Extract meaningful text: title, h1, h2, meta description, CTAs
      const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() || ''
      const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() || ''
      const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 3)
      const h2s = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 5)
      const buttons = [...html.matchAll(/<button[^>]*>(.*?)<\/button>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 5)
      const anchors = [...html.matchAll(/<a[^>]+>(.*?)<\/a>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(s => s.length > 2 && s.length < 40).slice(0, 8)

      results.push({
        url,
        title,
        metaDesc,
        headlines: [...h1s, ...h2s].slice(0, 6),
        ctas: [...buttons, ...anchors].slice(0, 6),
      })
    } catch (err) {
      console.error('Competitor fetch failed for', url, err.message)
    }
  }

  return results.length > 0 ? results : null
}

async function getCompetitorUrls(subscriptionId) {
  const { data } = await supabase
    .from('agent_competitor_urls')
    .select('url')
    .eq('subscription_id', subscriptionId)
    .eq('active', true)
    .limit(2)

  return data?.map(r => r.url) || []
}

// ─── PHASE 3: WEEKLY EXECUTIVE SUMMARY ────────────────────────────────────────
async function handleWeeklySummary(res) {
  const { data: connections } = await supabase
    .from('agent_connections')
    .select('*, agent_subscriptions!inner(*)')
    .eq('agent_subscriptions.status', 'active')

  if (!connections || connections.length === 0) {
    return res.json({ success: true, message: 'No active connections' })
  }

  for (const conn of connections) {
    try {
      const subscriptionId = conn.subscription_id

      // Get analytics for the past week
      const analytics = await getPostHogAnalytics(
        conn.posthog_api_key || process.env.POSTHOG_API_KEY,
        conn.posthog_project_id || process.env.POSTHOG_PROJECT_ID,
        conn.posthog_host || process.env.POSTHOG_HOST
      )

      // Get all runs from the past week
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: weekRuns } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .gte('created_at', oneWeekAgo)
        .order('created_at', { ascending: false })

      // Get completed A/B tests from the past week
      const { data: completedABTests } = await supabase
        .from('agent_ab_tests')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .eq('status', 'completed')
        .gte('created_at', oneWeekAgo)

      // Get impact metrics for deployed runs this week
      const deployedRunIds = weekRuns?.filter(r => r.status === 'deployed' || r.status === 'rolled_back').map(r => r.id) || []
      let impactMetrics = []
      if (deployedRunIds.length > 0) {
        const { data: metrics } = await supabase
          .from('impact_metrics')
          .select('*')
          .in('run_id', deployedRunIds)
        impactMetrics = metrics || []
      }

      // Get DNA / learnings count
      const { data: allLearnings } = await supabase
        .from('agent_learnings')
        .select('outcome, delta, metric_type')
        .eq('subscription_id', subscriptionId)

      const totalLearnings = allLearnings?.length || 0
      const winLearnings = allLearnings?.filter(l => l.outcome === 'positive') || []
      const avgPositiveDelta = winLearnings.length > 0
        ? Math.round(winLearnings.reduce((sum, l) => sum + (l.delta || 0), 0) / winLearnings.length)
        : null

      // Build summary message
      const a = analytics?.last7Days
      const deployed = weekRuns?.filter(r => r.status === 'deployed').length || 0
      const rolledBack = weekRuns?.filter(r => r.status === 'rolled_back').length || 0
      const rejected = weekRuns?.filter(r => r.status === 'rejected').length || 0
      const pending = weekRuns?.filter(r => r.status === 'waiting_approval').length || 0

      const trendEmoji = !a?.trafficChange ? '📊'
        : a.trafficChange > 10 ? '📈'
        : a.trafficChange < -10 ? '📉'
        : '➡️'

      const trendText = a?.trafficChange == null ? 'First week of tracking'
        : a.trafficChange > 0 ? `+${a.trafficChange}% vs previous week`
        : `${a.trafficChange}% vs previous week`

      const bounceText = !a ? '—'
        : a.bounceRate === 0 ? 'No data'
        : a.bounceRate > 70 ? `⚠️ ${a.bounceRate}% (high)`
        : a.bounceRate > 50 ? `🟡 ${a.bounceRate}%`
        : `✅ ${a.bounceRate}%`

      // Best metric change from impact_metrics this week
      let bestMetricLine = ''
      if (impactMetrics.length > 0) {
        const bounceMetrics = impactMetrics.filter(m => m.metric_type === 'bounce_rate' && m.value_before && m.value_after)
        if (bounceMetrics.length > 0) {
          const best = bounceMetrics.sort((a, b) => (a.value_before - a.value_after) - (b.value_before - b.value_after))[0]
          const improvement = Math.round(best.value_before - best.value_after)
          if (improvement > 0) {
            bestMetricLine = `\n📉 Best result: bounce rate −${improvement}% after agent change`
          }
        }
      }

      // A/B test summary
      let abSummary = ''
      if (completedABTests && completedABTests.length > 0) {
        const winners = completedABTests.filter(t => t.winner === 'treatment')
        abSummary = `\n🔬 *A/B Tests:* ${completedABTests.length} completed · ${winners.length} won`
        if (winners.length > 0) {
          const avgLift = Math.round(winners.reduce((sum, t) => sum + (t.delta_pct || 0), 0) / winners.length)
          abSummary += ` · avg +${avgLift}% lift`
        }
      }

      const dnaSummary = totalLearnings > 0
        ? `\n🧬 *Business DNA:* ${totalLearnings} learnings${avgPositiveDelta ? ` · avg +${avgPositiveDelta}% on wins` : ''}`
        : ''

      const deployedChanges = weekRuns?.filter(r => r.status === 'deployed').map(r =>
        `  ✅ ${r.analysis_result?.problem?.slice(0, 60) || 'Change deployed'}`
      ).join('\n') || ''

      const rolledBackChanges = weekRuns?.filter(r => r.status === 'rolled_back').map(r =>
        `  🔄 ${r.analysis_result?.problem?.slice(0, 60) || 'Rolled back'}`
      ).join('\n') || ''

      const message = `📋 *Velyr — Weekly Executive Summary*
_Week of ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}_

${trendEmoji} *Traffic*
${a ? `${a.uniqueVisitors} visitors · ${a.totalPageviews} pageviews` : 'No data'}
${trendText}
Bounce rate: ${bounceText}${bestMetricLine}

🤖 *Agent Activity This Week*
• Deployed: ${deployed} change${deployed !== 1 ? 's' : ''}
• Rolled back: ${rolledBack}
• Rejected: ${rejected}
• Awaiting approval: ${pending}
${deployedChanges ? `\n*Deployed changes:*\n${deployedChanges}` : ''}${rolledBackChanges ? `\n*Rolled back:*\n${rolledBackChanges}` : ''}${abSummary}${dnaSummary}

_Next run: Monday · Reply *status* for details_`

      const { data: sub } = await supabase
        .from('agent_subscriptions')
        .select('telegram_chat_id')
        .eq('id', subscriptionId)
        .single()

      const chatId = sub?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID

      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
      })
    } catch (err) {
      console.error('Weekly summary error for subscription', conn.subscription_id, err)
    }
  }

  return res.json({ success: true, mode: 'weekly_summary' })
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

async function callAI(repoContent, analytics, pageSpeed, previousFixes, dna, competitorData, guardrails, funnelAnalysis) {
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

  // ── PHASE 3: Competitor context ──
  const competitorContext = competitorData && competitorData.length > 0 ? `
COMPETITOR INTELLIGENCE:
${competitorData.map(c => `
Competitor: ${c.url}
- Title: ${c.title}
- Meta description: ${c.metaDesc}
- Headlines: ${c.headlines.join(' | ')}
- CTAs/Links: ${c.ctas.join(' | ')}
`).join('\n')}
Use this to suggest DIFFERENTIATION opportunities. Where is the user's site weaker or less compelling than competitors? Where can they stand out?
` : ''

  // ── PHASE 4: Brand Guardrails ──
  const guardrailsContext = guardrails ? `
BRAND GUARDRAILS — YOU MUST FOLLOW THESE:
${guardrails.tone ? `- Tone: ${guardrails.tone}` : ''}
${guardrails.forbidden_patterns?.length ? `- NEVER do these: ${guardrails.forbidden_patterns.join(', ')}` : ''}
${guardrails.protected_elements?.length ? `- NEVER change these: ${guardrails.protected_elements.join(', ')}` : ''}
${guardrails.custom_rules ? `- Additional rules: ${guardrails.custom_rules}` : ''}
Any suggestion that violates these guardrails must be discarded. Do not explain why — just pick a different suggestion.
` : ''

  // ── PHASE 4: Funnel Analysis ──
  const funnelContext = funnelAnalysis ? `
MULTI-PAGE FUNNEL ANALYSIS (${funnelAnalysis.totalPages} pages detected):
Page types found: ${Object.entries(funnelAnalysis.pageTypes).map(([t, n]) => `${t}: ${n}`).join(', ')}

${funnelAnalysis.funnelPages.filter(p => p.views > 0).length > 0 ? `Pages with traffic:
${funnelAnalysis.funnelPages.filter(p => p.views > 0).map(p =>
  `- ${p.filePath} (${p.pageType}) → ${p.views} views${p.dropOffScore ? `, ${p.dropOffScore}% drop-off` : ''}`
).join('\n')}` : ''}

${funnelAnalysis.biggestDropOff ? `BIGGEST DROP-OFF OPPORTUNITY:
${funnelAnalysis.biggestDropOff.filePath} (${funnelAnalysis.biggestDropOff.pageType}) — ${funnelAnalysis.biggestDropOff.dropOffScore}% of visitors who reach this page don't continue.
This is your highest-leverage funnel fix. Prioritize this page if you can.` : ''}

Consider funnel-wide improvements: if the landing page is optimized but pricing page has high drop-off, fix the pricing page.
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
${competitorContext}
${guardrailsContext}
${funnelContext}

WEBSITE CODE:
${JSON.stringify(repoContent, null, 2)}

RULES:
- Do NOT suggest: /premium route, Stripe, intentionally disabled features
- The fix MUST be a real code change
- Reference specific data points in your analysis
- If social traffic is high but bounce rate is high → landing page doesn't match social audience
- If mobile % is high but performance is low → mobile UX is priority
- Respect the Business DNA: double down on what worked, avoid what didn't
- If competitor data is available: suggest a differentiation angle that makes the user's site stand out
- RESPECT ALL BRAND GUARDRAILS — any suggestion violating them is invalid
- If funnel data shows a big drop-off on a non-landing page, consider fixing THAT page instead of always fixing the landing page

IMPACT PREDICTION RULES:
- conversion_lift_min and conversion_lift_max: realistic percentage POINTS improvement. Base on change type:
  * Headline/CTA copy changes: 8–25
  * Social proof additions: 10–20
  * Performance improvements: 5–15
  * Mobile UX fixes: 10–30 (if mobile % is high)
  * Trust signals: 5–12
  * Differentiation vs competitor: 8–20
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
  "change_type": "headline|cta|copy|layout|pricing|trust|navigation|performance|differentiation|other",
  "competitor_insight": "if competitor data was used, one sentence on the differentiation angle. Otherwise null.",
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
    analysis.competitor_insight ? `## Competitor Differentiation\n${analysis.competitor_insight}` : '',
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

  // ── PHASE 3: Competitor insight line ──
  const competitorLine = analysis.competitor_insight
    ? `🔍 *Competitor angle:* ${analysis.competitor_insight}\n\n`
    : ''

  const message = `🤖 *Velyr Growth Agent*

${analyticsLine}🔍 *Problem found:*
${analysis.problem}

💡 *Data insight:*
${analysis.data_insight || 'Based on code analysis'}

💥 *Impact:*
${analysis.impact}

${impactBlock}${riskBlock}${competitorLine}✅ *Solution:*
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

    // ── PHASE 3: competitor URLs added to parallel fetches ──
    const competitorUrls = await getCompetitorUrls(conn.subscription_id)

    const [repoContent, allPages, analytics, pageSpeed, previousFixes, dna, competitorData, guardrails] = await Promise.all([
      analyzeRepo(octokit, conn.github_repo_owner, conn.github_repo_name),
      detectAllPages(octokit, conn.github_repo_owner, conn.github_repo_name),
      getPostHogAnalytics(
        conn.posthog_api_key || process.env.POSTHOG_API_KEY,
        conn.posthog_project_id || process.env.POSTHOG_PROJECT_ID,
        conn.posthog_host || process.env.POSTHOG_HOST
      ),
      conn.website_url ? getPageSpeedScore(conn.website_url) : null,
      getPreviousRuns(conn.subscription_id),
      fetchBusinessDNA(conn.subscription_id),
      competitorUrls.length > 0 ? fetchCompetitorData(competitorUrls) : Promise.resolve(null),
      fetchBrandGuardrails(conn.subscription_id),
    ])

    // ── PHASE 4: Build funnel analysis from all pages + analytics ──
    const funnelAnalysis = buildFunnelAnalysis(allPages, analytics)

    // Merge allPages into repoContent so AI sees all pages
    const enrichedRepoContent = { ...repoContent }
    for (const [path, info] of Object.entries(allPages)) {
      if (!enrichedRepoContent[path]) {
        enrichedRepoContent[path] = info.content
      }
    }

    const analysis = await callAI(enrichedRepoContent, analytics, pageSpeed, previousFixes, dna, competitorData, guardrails, funnelAnalysis)
    const pr = await createPR(octokit, conn.github_repo_owner, conn.github_repo_name, analysis)
    const messageId = await sendTelegramNotification(analysis, pr, run.id, analytics)

    await supabase.from('agent_runs').update({
      status: 'waiting_approval',
      analysis_result: {
        ...analysis,
        analytics_snapshot: analytics?.last7Days
      },
      funnel_analysis: funnelAnalysis ? {
        totalPages: funnelAnalysis.totalPages,
        pageTypes: funnelAnalysis.pageTypes,
        biggestDropOff: funnelAnalysis.biggestDropOff,
      } : null,
      pr_number: pr.number,
      pr_url: pr.html_url,
      telegram_message_id: messageId || null
    }).eq('id', run.id)

    // ── PHASE 4: Save funnel page data ──
    await saveFunnelPages(conn.subscription_id, run.id, funnelAnalysis, allPages)

    // ── PHASE 2: Start A/B test ──
    await createABTest(conn, run.id, analysis)
  }

  return res.json({ success: true, processed: connections.length })
}