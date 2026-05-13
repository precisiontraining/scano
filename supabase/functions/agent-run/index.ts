import { createClient } from 'npm:@supabase/supabase-js@2'
import { App } from 'npm:@octokit/app@14'
import { Octokit } from 'npm:@octokit/rest@20'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// ─── Deno-compatible Base64 helpers ──────────────────────────────────────────
function base64Decode(str: string): string {
  const binary = atob(str.replace(/\n/g, ''))
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function base64Encode(str: string): string {
  const bytes  = new TextEncoder().encode(str)
  let binary   = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    const result = await handleFullRun()
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Edge function top-level error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

// ─── OCTOKIT ─────────────────────────────────────────────────────────────────
async function getOctokit(installationId: number) {
  const app = new App({
    appId:      Deno.env.get('GITHUB_APP_ID')!,
    privateKey: base64Decode(Deno.env.get('GITHUB_APP_PRIVATE_KEY_BASE64')!),
  })

  const { data: { token } } = await app.octokit.request(
    'POST /app/installations/{installation_id}/access_tokens',
    { installation_id: installationId }
  )

  return new Octokit({ auth: token })
}

// ─── REPO ANALYSIS ────────────────────────────────────────────────────────────
async function analyzeRepo(octokit: any, owner: string, repo: string) {
  const filesToCheck = [
    'src/App.jsx', 'src/App.tsx', 'index.html',
    'src/main.jsx', 'src/main.tsx',
    'src/pages/Home.jsx', 'src/Home.jsx',
    'src/components/Hero.jsx', 'src/components/Landing.jsx',
  ]

  const files: Record<string, string> = {}
  for (const path of filesToCheck) {
    try {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path })
      files[path] = base64Decode(data.content)
    } catch { /* file doesn't exist */ }
  }
  return files
}

// ─── DETECT ALL PAGES ────────────────────────────────────────────────────────
async function detectAllPages(octokit: any, owner: string, repo: string) {
  const pages: Record<string, { content: string; pageType: string; fileName: string }> = {}

  const dirsToScan = ['src/pages', 'src/views', 'src/screens', 'pages', 'app', 'src/app']
  const pageTypeMap: Record<string, string> = {
    home: 'landing', index: 'landing', landing: 'landing',
    pricing: 'pricing', price: 'pricing', plans: 'pricing',
    checkout: 'checkout', payment: 'checkout', cart: 'checkout',
    blog: 'blog', post: 'blog', article: 'blog',
    about: 'about', contact: 'about',
    lead: 'lead_magnet', download: 'lead_magnet', free: 'lead_magnet',
    login: 'auth', signup: 'auth', register: 'auth',
    dashboard: 'dashboard', account: 'dashboard',
  }

  const detectType = (name: string) => {
    const lower = name.toLowerCase().replace(/\.(jsx|tsx|js|ts|html|vue|svelte)$/, '')
    for (const [keyword, type] of Object.entries(pageTypeMap)) {
      if (lower.includes(keyword)) return type
    }
    return 'other'
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
          pages[item.path] = {
            content:  base64Decode(fileData.content),
            pageType: detectType(item.name),
            fileName: item.name,
          }
        } catch { /* skip unreadable */ }
      }
    } catch { /* dir doesn't exist */ }
  }

  return pages
}

// ─── FUNNEL ANALYSIS ─────────────────────────────────────────────────────────
function buildFunnelAnalysis(allPages: any, analytics: any) {
  const a = analytics?.last7Days
  if (!a) return null

  const topPathViews: Record<string, number> = {}
  a.topPages?.forEach((p: any) => { topPathViews[p.path] = p.views })

  const funnelOrder = ['landing', 'pricing', 'checkout', 'lead_magnet', 'blog', 'about', 'other', 'auth', 'dashboard']
  const pagesByType: Record<string, string[]> = {}

  for (const [path, info] of Object.entries(allPages) as any) {
    const type = info.pageType || 'other'
    if (!pagesByType[type]) pagesByType[type] = []
    pagesByType[type].push(path)
  }

  const funnelPages: any[] = []
  let prevViews: number | null = null

  for (const type of funnelOrder) {
    for (const path of (pagesByType[type] || [])) {
      const routePath = '/' + path
        .replace(/^(src\/pages|pages|src\/views|src\/screens)\//, '')
        .replace(/\.(jsx|tsx|js|ts)$/, '')
        .replace(/\/index$/, '')
        .toLowerCase()

      const views        = topPathViews[routePath] || topPathViews[routePath + '/'] || 0
      const dropOffScore = prevViews && views > 0 ? Math.round((1 - views / prevViews) * 100) : null

      funnelPages.push({ filePath: path, pageType: type, routePath, views, dropOffScore })

      if (views > 0 && (prevViews === null || type === 'landing')) prevViews = views
      else if (views > 0) prevViews = views
    }
  }

  const withDropOff    = funnelPages.filter(p => p.dropOffScore !== null && p.dropOffScore > 0)
  const biggestDropOff = withDropOff.sort((a, b) => b.dropOffScore - a.dropOffScore)[0] || null

  return {
    totalPages: Object.keys(allPages).length,
    funnelPages,
    biggestDropOff,
    pageTypes: Object.fromEntries(Object.entries(pagesByType).map(([t, paths]) => [t, paths.length])),
  }
}

// ─── SAVE FUNNEL PAGES ───────────────────────────────────────────────────────
async function saveFunnelPages(subscriptionId: string, runId: string, funnelAnalysis: any) {
  if (!funnelAnalysis?.funnelPages?.length) return

  const rows = funnelAnalysis.funnelPages
    .filter((p: any) => p.views > 0 || p.pageType === 'landing')
    .slice(0, 20)
    .map((p: any) => ({
      subscription_id: subscriptionId,
      run_id:          runId,
      page_path:       p.filePath,
      page_type:       p.pageType,
      views_7d:        p.views || 0,
      drop_off_score:  p.dropOffScore,
    }))

  if (rows.length > 0) await supabase.from('agent_funnel_pages').insert(rows)
}

// ─── BRAND GUARDRAILS ────────────────────────────────────────────────────────
async function fetchBrandGuardrails(subscriptionId: string) {
  const { data } = await supabase
    .from('agent_brand_guardrails').select('*')
    .eq('subscription_id', subscriptionId).single()
  return data || null
}

// ─── POSTHOG ANALYTICS ───────────────────────────────────────────────────────
async function getPostHogAnalytics(posthogApiKey: string, posthogProjectId: string, posthogHost = 'https://eu.posthog.com') {
  try {
    const headers         = { 'Authorization': `Bearer ${posthogApiKey}`, 'Content-Type': 'application/json' }
    const sevenDaysAgo    = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today           = new Date().toISOString().split('T')[0]

    const query = (body: any) =>
      fetch(`${posthogHost}/api/projects/${posthogProjectId}/query/`, {
        method: 'POST', headers, body: JSON.stringify({ query: body }),
      })

    const [pageviewsRes, sessionsRes, lastWeekRes, referrersRes, utmRes, deviceRes] = await Promise.all([
      query({ kind: 'EventsQuery', select: ['properties.$pathname', 'count()'],                                                           event: '$pageview', after: sevenDaysAgo,    before: today,         limit: 10,   orderBy: ['count() DESC'] }),
      query({ kind: 'EventsQuery', select: ['properties.$session_id', 'count()'],                                                        event: '$pageview', after: sevenDaysAgo,    before: today,         limit: 2000 }),
      query({ kind: 'EventsQuery', select: ['properties.$session_id', 'count()'],                                                        event: '$pageview', after: fourteenDaysAgo, before: sevenDaysAgo,  limit: 2000 }),
      query({ kind: 'EventsQuery', select: ['properties.$referring_domain', 'count()'],                                                  event: '$pageview', after: sevenDaysAgo,    before: today,         limit: 20,   orderBy: ['count() DESC'] }),
      query({ kind: 'EventsQuery', select: ['properties.$utm_source', 'properties.$utm_medium', 'properties.$utm_campaign', 'count()'], event: '$pageview', after: sevenDaysAgo,    before: today,         limit: 20,   orderBy: ['count() DESC'] }),
      query({ kind: 'EventsQuery', select: ['properties.$device_type', 'count()'],                                                       event: '$pageview', after: sevenDaysAgo,    before: today,         limit: 10,   orderBy: ['count() DESC'] }),
    ])

    const [pageviews, sessions, lastWeek, referrers, utmData, devices] = await Promise.all([
      pageviewsRes.json(), sessionsRes.json(), lastWeekRes.json(),
      referrersRes.json(), utmRes.json(), deviceRes.json(),
    ])

    const sessionPageCounts: Record<string, number> = {}
    sessions.results?.forEach((row: any) => { sessionPageCounts[row[0]] = (sessionPageCounts[row[0]] || 0) + 1 })
    const uniqueSessions   = Object.keys(sessionPageCounts).length
    const bouncedSessions  = Object.values(sessionPageCounts).filter(c => c === 1).length
    const bounceRate       = uniqueSessions > 0 ? Math.round((bouncedSessions / uniqueSessions) * 100) : 0
    const totalPageviews   = pageviews.results?.reduce((sum: number, row: any) => sum + (row[1] || 0), 0) || 0
    const lastWeekSessions = new Set(lastWeek.results?.map((r: any) => r[0])).size || 0
    const trafficChange    = lastWeekSessions > 0 ? Math.round(((uniqueSessions - lastWeekSessions) / lastWeekSessions) * 100) : null

    const socialBreakdown: Record<string, number> = { tiktok: 0, instagram: 0, youtube: 0, twitter: 0, facebook: 0, google: 0 }
    const trafficSources: any[] = []
    referrers.results?.forEach((row: any) => {
      const domain = row[0] || '', visits = row[1]
      if (domain) trafficSources.push({ domain, visits })
      if (domain.includes('tiktok'))                                       socialBreakdown.tiktok    += visits
      else if (domain.includes('instagram') || domain.includes('ig.me'))  socialBreakdown.instagram += visits
      else if (domain.includes('youtube')   || domain.includes('youtu.be')) socialBreakdown.youtube  += visits
      else if (domain.includes('twitter')   || domain.includes('t.co'))   socialBreakdown.twitter  += visits
      else if (domain.includes('facebook')  || domain.includes('fb.me'))  socialBreakdown.facebook += visits
      else if (domain.includes('google'))                                  socialBreakdown.google    += visits
    })

    const deviceBreakdown: Record<string, number> = {}
    devices.results?.forEach((row: any) => { if (row[0]) deviceBreakdown[row[0].toLowerCase()] = row[1] })
    const mobilePercent = deviceBreakdown['mobile'] && totalPageviews > 0
      ? Math.round((deviceBreakdown['mobile'] / totalPageviews) * 100) : null

    return {
      last7Days: {
        totalPageviews, uniqueVisitors: uniqueSessions, bounceRate, mobilePercent, trafficChange, lastWeekSessions,
        topPages:       pageviews.results?.slice(0, 5).map((row: any) => ({ path: row[0], views: row[1] })) || [],
        trafficSources: trafficSources.slice(0, 8),
        socialBreakdown, totalSocialVisits: Object.values(socialBreakdown).reduce((s, v) => s + v, 0),
        utmCampaigns:   utmData.results?.filter((row: any) => row[0] || row[2])?.map((row: any) => ({ source: row[0], medium: row[1], campaign: row[2], visits: row[3] }))?.slice(0, 5) || [],
        deviceBreakdown,
      }
    }
  } catch (error) {
    console.error('PostHog analytics error:', error)
    return null
  }
}

// ─── PAGESPEED ───────────────────────────────────────────────────────────────
async function getPageSpeedScore(url: string) {
  try {
    const res  = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${Deno.env.get('GOOGLE_PAGESPEED_API_KEY')}`)
    const data = await res.json()
    return {
      performance: Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100),
      lcp: data.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue,
      cls: data.lighthouseResult?.audits?.['cumulative-layout-shift']?.displayValue,
      fid: data.lighthouseResult?.audits?.['total-blocking-time']?.displayValue,
    }
  } catch { return null }
}

// ─── PREVIOUS RUNS ───────────────────────────────────────────────────────────
async function getPreviousRuns(subscriptionId: string) {
  const { data } = await supabase
    .from('agent_runs').select('analysis_result')
    .eq('subscription_id', subscriptionId)
    .in('status', ['deployed', 'waiting_approval'])
    .order('created_at', { ascending: false }).limit(5)
  return data?.map((r: any) => r.analysis_result?.problem).filter(Boolean) || []
}

// ─── BUSINESS DNA ────────────────────────────────────────────────────────────
async function fetchBusinessDNA(subscriptionId: string) {
  const { data } = await supabase
    .from('agent_learnings').select('*')
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false }).limit(20)

  if (!data || data.length === 0) return null
  const fmtDelta = (d: number) => d > 0 ? `+${d}%` : `${d}%`
  const wins     = data.filter((l: any) => l.outcome === 'positive')
  const losses   = data.filter((l: any) => l.outcome === 'negative')
  return {
    winsText:   wins.map((l: any)   => `• ${l.change_type}: ${l.summary} (${fmtDelta(l.delta)} ${l.metric_type})`).join('\n') || 'None yet',
    lossesText: losses.map((l: any) => `• ${l.change_type}: ${l.summary} (${fmtDelta(l.delta)} ${l.metric_type})`).join('\n') || 'None yet',
  }
}

// ─── COMPETITOR ──────────────────────────────────────────────────────────────
async function getCompetitorUrls(subscriptionId: string) {
  const { data } = await supabase
    .from('agent_competitor_urls').select('url')
    .eq('subscription_id', subscriptionId).eq('active', true).limit(2)
  return data?.map((r: any) => r.url) || []
}

async function fetchCompetitorData(competitorUrls: string[]) {
  if (!competitorUrls || competitorUrls.length === 0) return null
  const results = []
  for (const url of competitorUrls.slice(0, 2)) {
    try {
      const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VelyrBot/1.0)' }, signal: AbortSignal.timeout(5000) })
      const html = await res.text()
      const title    = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() || ''
      const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() || ''
      const h1s      = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 3)
      const h2s      = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 5)
      const buttons  = [...html.matchAll(/<button[^>]*>(.*?)<\/button>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 5)
      const anchors  = [...html.matchAll(/<a[^>]+>(.*?)<\/a>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(s => s.length > 2 && s.length < 40).slice(0, 8)
      results.push({ url, title, metaDesc, headlines: [...h1s, ...h2s].slice(0, 6), ctas: [...buttons, ...anchors].slice(0, 6) })
    } catch (err: any) { console.error('Competitor fetch failed for', url, err.message) }
  }
  return results.length > 0 ? results : null
}

// ─── POSTHOG A/B TEST ────────────────────────────────────────────────────────
async function createABTest(conn: any, runId: string, analysis: any) {
  const apiKey    = conn.posthog_api_key    || Deno.env.get('POSTHOG_API_KEY')
  const projectId = conn.posthog_project_id || Deno.env.get('POSTHOG_PROJECT_ID')
  const host      = conn.posthog_host       || Deno.env.get('POSTHOG_HOST') || 'https://eu.posthog.com'
  if (!apiKey || !projectId) return null

  const flagKey = `velyr-ab-${runId.slice(0, 8)}`
  try {
    const res  = await fetch(`${host}/api/projects/${projectId}/feature_flags/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: flagKey, name: `[Velyr A/B] ${analysis.problem}`, active: true,
        filters: {
          groups: [{ properties: [], rollout_percentage: 50 }],
          multivariate: { variants: [
            { key: 'control',   name: 'Control (original)',  rollout_percentage: 50 },
            { key: 'treatment', name: 'Treatment (Velyr)',   rollout_percentage: 50 },
          ]},
        },
      }),
    })
    const flag = await res.json()
    await supabase.from('agent_ab_tests').insert({
      run_id: runId, subscription_id: conn.subscription_id,
      posthog_flag_key: flagKey, posthog_flag_id: flag.id,
      change_type: analysis.change_type || 'other', summary: analysis.problem,
      status: 'running',
      evaluate_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    return flagKey
  } catch (err) {
    console.error('A/B test creation failed:', err)
    return null
  }
}

// ─── POSTHOG AUTO-SETUP ──────────────────────────────────────────────────────
// FIX: removed 'continue' outside loop — now returns early with null instead
async function setupPostHogForConnection(conn: any) {
  try {
    const host  = Deno.env.get('POSTHOG_HOST') || 'https://eu.posthog.com'
    const orgId = Deno.env.get('POSTHOG_ORG_ID')
    if (!orgId) { console.error('POSTHOG_ORG_ID not set'); return null }

    const phRes = await fetch(`${host}/api/organizations/${orgId}/projects/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('POSTHOG_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `velyr_${conn.subscription_id.slice(0, 8)}_${conn.github_repo_name}` }),
    })
    if (!phRes.ok) { console.error('PostHog project creation failed:', await phRes.text()); return null }

    const project          = await phRes.json()
    const posthogProjectId = String(project.id)
    const snippetToken     = project.api_token

    await supabase.from('agent_connections').update({
      posthog_project_id:    posthogProjectId,
      posthog_api_key:       Deno.env.get('POSTHOG_API_KEY'),
      posthog_snippet_token: snippetToken,
    }).eq('id', conn.id)

    const isNext      = conn.github_repo_name?.toLowerCase().includes('next')
    const framework   = isNext ? 'Next.js' : 'React/Vite'
    const snippetCode = isNext
      ? `// pages/_app.jsx  OR  app/layout.tsx\nimport posthog from 'posthog-js'\nif (typeof window !== 'undefined') {\n  posthog.init('${snippetToken}', { api_host: 'https://eu.posthog.com' })\n}`
      : `// src/main.jsx\nimport posthog from 'posthog-js'\nposthog.init('${snippetToken}', { api_host: 'https://eu.posthog.com' })`

    const { data: sub } = await supabase
      .from('agent_subscriptions').select('telegram_chat_id')
      .eq('id', conn.subscription_id).single()

    // FIX: was 'continue' (invalid outside loop) — now returns null early
    const chatId = sub?.telegram_chat_id
    if (!chatId) return null

    await fetch(`https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `📊 *Analytics ready!*\n\nAdd this to your ${framework} project once:\n\n\`\`\`javascript\n${snippetCode}\n\`\`\`\n\nFirst install the package:\n\`npm install posthog-js\`\n\n_Once added, the agent will use real visitor data for smarter recommendations._`,
        parse_mode: 'Markdown',
      }),
    })

    return { posthogProjectId, snippetToken }
  } catch (err) {
    console.error('PostHog auto-setup failed:', err)
    return null
  }
}

// ─── REVENUE ESTIMATE ────────────────────────────────────────────────────────
function estimateRevenueImpact(visitors: number, bounceRate: number, conversionLift: number, avgOrderValue = 47) {
  if (!visitors || visitors < 10) return null
  const monthlyVisitors       = visitors * 4.3
  const currentConversions    = monthlyVisitors * (1 - bounceRate / 100) * 0.02
  const additionalConversions = currentConversions * conversionLift
  return {
    revenueMin:            Math.round(additionalConversions * avgOrderValue * 0.7),
    revenueMax:            Math.round(additionalConversions * avgOrderValue * 1.3),
    additionalConversions: Math.round(additionalConversions),
  }
}

// ─── SUBSCRIPTION EMAIL ───────────────────────────────────────────────────────
async function fetchSubscriptionEmail(subscriptionId: string): Promise<string | null> {
  const { data: sub } = await supabase
    .from('agent_subscriptions').select('auth_user_id').eq('id', subscriptionId).single()
  if (!sub?.auth_user_id) return null
  try {
    const { data: u } = await supabase.auth.admin.getUserById(sub.auth_user_id)
    return u?.user?.email || null
  } catch { return null }
}

// ─── SCREENSHOTS (3a) ─────────────────────────────────────────────────────────
async function captureScreenshot(url: string): Promise<string | null> {
  const apiKey = Deno.env.get('SCREENSHOTONE_API_KEY')
  if (!apiKey) { console.warn('SCREENSHOTONE_API_KEY not set — skipping screenshot'); return null }
  if (!url) return null
  try {
    const params = new URLSearchParams({
      access_key: apiKey, url, viewport_width: '1280', viewport_height: '800',
      device_scale_factor: '1', format: 'jpg', block_ads: 'true',
      block_cookie_banners: 'true', cache: 'true', cache_ttl: '3600',
      response_type: 'json',
    })
    const res = await fetch(`https://api.screenshotone.com/take?${params}`, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) { console.error('ScreenshotOne error:', await res.text()); return null }
    const data = await res.json()
    return data?.cache_url || data?.store?.url || data?.url || null
  } catch (err: any) {
    console.error('Screenshot failed:', err.message)
    return null
  }
}

// ─── REVENUE ATTRIBUTION (3b) ─────────────────────────────────────────────────
async function getStripeRevenuePerVisitor(stripeAccountId: string | null, analytics: any) {
  if (!stripeAccountId) return null
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) return null
  try {
    const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
    const res = await fetch(
      `https://api.stripe.com/v1/charges?created[gte]=${since}&limit=100`,
      { headers: { Authorization: `Bearer ${stripeKey}`, 'Stripe-Account': stripeAccountId } }
    )
    if (!res.ok) return null
    const json = await res.json()
    const succeeded  = (json.data || []).filter((c: any) => c.paid && !c.refunded)
    const totalCents = succeeded.reduce((s: number, c: any) => s + c.amount, 0)
    const totalRevenue = totalCents / 100

    const a = analytics?.last7Days
    if (!a || !a.uniqueVisitors) return { totalRevenue, monthlyVisitors: 0, perPage: [], lowestRpv: null, overallRpv: 0 }

    const monthlyVisitors = a.uniqueVisitors * 4.3
    const totalViews = a.topPages.reduce((s: number, p: any) => s + p.views, 0) || 1
    const perPage = a.topPages.map((p: any) => {
      const pageVisitors = monthlyVisitors * (p.views / totalViews)
      const pageRevenue  = totalRevenue   * (p.views / totalViews)
      const rpv = pageVisitors > 0 ? pageRevenue / pageVisitors : 0
      return { path: p.path, views: p.views, revenuePerVisitor: Math.round(rpv * 100) / 100 }
    })
    const lowestRpv  = [...perPage].sort((a, b) => a.revenuePerVisitor - b.revenuePerVisitor)[0] || null
    const overallRpv = monthlyVisitors > 0 ? totalRevenue / monthlyVisitors : 0
    return { totalRevenue, monthlyVisitors, perPage, lowestRpv, overallRpv: Math.round(overallRpv * 100) / 100 }
  } catch (err: any) {
    console.error('Stripe revenue fetch failed:', err.message)
    return null
  }
}

// ─── COMPETITOR WEEKLY SCAN (3c) ──────────────────────────────────────────────
async function scanCompetitorsForChanges(subscriptionId: string, competitorUrls: string[]) {
  if (!competitorUrls?.length) return null
  const changes: any[] = []
  for (const url of competitorUrls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VelyrBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      const html = await res.text()
      const heroHeadline = (
        html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
        || html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || ''
      ).replace(/<[^>]+>/g, '').trim().slice(0, 200)
      const mainCta = (
        html.match(/<button[^>]*>([\s\S]*?)<\/button>/i)?.[1]
        || html.match(/<a[^>]+(?:btn|button|cta)[^>]*>([\s\S]*?)<\/a>/i)?.[1] || ''
      ).replace(/<[^>]+>/g, '').trim().slice(0, 100)
      const pricingMatch = html.match(/[$€£]\s?\d+(?:[.,]\d+)?(?:\s?\/\s?(?:mo|month|year|yr))?/i)?.[0] || null
      const snapshot = { heroHeadline, mainCta, pricing: pricingMatch }

      const { data: prev } = await supabase
        .from('agent_competitor_snapshots').select('snapshot_data')
        .eq('subscription_id', subscriptionId).eq('competitor_url', url)
        .order('captured_at', { ascending: false }).limit(1).maybeSingle()

      const diffs: string[] = []
      if (prev?.snapshot_data) {
        const p: any = prev.snapshot_data
        if (p.heroHeadline && p.heroHeadline !== heroHeadline) diffs.push(`Hero: "${p.heroHeadline}" → "${heroHeadline}"`)
        if (p.mainCta && p.mainCta !== mainCta)                 diffs.push(`CTA: "${p.mainCta}" → "${mainCta}"`)
        if (p.pricing && p.pricing !== pricingMatch)            diffs.push(`Pricing: ${p.pricing} → ${pricingMatch || 'removed'}`)
      }

      await supabase.from('agent_competitor_snapshots').insert({
        subscription_id: subscriptionId, competitor_url: url, snapshot_data: snapshot,
      })

      if (diffs.length > 0) changes.push({ url, diffs, current: snapshot })
    } catch (err: any) {
      console.error(`Competitor scan failed for ${url}:`, err.message)
    }
  }
  return changes.length > 0 ? changes : null
}

// ─── BUSINESS DNA — load + record (3d) ────────────────────────────────────────
async function loadBusinessDNA(subscriptionId: string) {
  const { data } = await supabase
    .from('agent_business_dna').select('*')
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false }).limit(50)
  if (!data || data.length === 0) return null

  const grouped: Record<string, { success: number; rollback: number; pending: number }> = {}
  for (const d of data) {
    if (!grouped[d.fix_type]) grouped[d.fix_type] = { success: 0, rollback: 0, pending: 0 }
    grouped[d.fix_type][d.outcome as 'success'|'rollback'|'pending']++
  }
  const neverDoAgain = data.filter((d: any) => d.outcome === 'rollback').slice(0, 8)
    .map((d: any) => `- ${d.fix_type}: ${d.notes || 'no note'}`).join('\n')
  const whatWorks = data.filter((d: any) => d.outcome === 'success').slice(0, 8)
    .map((d: any) => `- ${d.fix_type}: ${d.notes || 'no note'}`).join('\n')
  return { grouped, neverDoAgain, whatWorks, entries: data }
}

async function recordDNA(subscriptionId: string, runId: string | null, fixType: string, outcome: 'success'|'rollback'|'pending', notes: string) {
  await supabase.from('agent_business_dna').insert({
    subscription_id: subscriptionId, run_id: runId, fix_type: fixType, outcome, notes: (notes || '').slice(0, 500),
  })
}

// ─── SEASONAL CONTEXT (3e) ────────────────────────────────────────────────────
function getSeasonalContext(date: Date = new Date()): string {
  const month = date.getMonth() + 1 // 1-12
  if (month >= 11 && month <= 12) return 'SEASONAL FOCUS (Nov-Dec): Prioritize checkout flow optimization, urgency copy ("Last X left", "Order by"), gift messaging, and holiday-themed trust signals. Q4 buyers convert on urgency.'
  if (month >= 6 && month <= 8)   return 'SEASONAL FOCUS (Jun-Aug): Prioritize mobile experience, page speed, and tap-target sizing. Summer mobile traffic share rises sharply — desktop fixes are lower-leverage.'
  if (month >= 1 && month <= 3)   return 'SEASONAL FOCUS (Jan-Mar): Prioritize pricing clarity, "new year" / fresh-start messaging, and clear value props. Buyers compare aggressively in January.'
  if (month >= 4 && month <= 5)   return 'SEASONAL FOCUS (Apr-May): Prioritize social proof (testimonials, logos, reviews), trust signals, and case studies. Spring is decision-season for B2B and considered purchases.'
  return 'SEASONAL FOCUS (Sep-Oct): Prioritize Q4 preparation — email capture, lead magnets, and retention loops. Buyers are warming up for end-of-year purchases.'
}

// ─── MULTI-PAGE SPRINT (3f) ───────────────────────────────────────────────────
function detectMultiPageSprint(funnelAnalysis: any, allPages: any): { pages: string[]; rootCause: string } | null {
  if (!funnelAnalysis?.funnelPages) return null
  const dropOffPages = funnelAnalysis.funnelPages
    .filter((p: any) => p.dropOffScore && p.dropOffScore > 30)
    .sort((a: any, b: any) => b.dropOffScore - a.dropOffScore)
    .slice(0, 3)
  if (dropOffPages.length < 2) return null
  const checks: { name: string; test: (src: string) => boolean }[] = [
    { name: 'all missing social proof',                  test: (s) => !/(testimonial|review|customer|trusted|users|companies|logos)/i.test(s) },
    { name: 'all have no CTA above the fold',            test: (s) => !/<button|<a[^>]+(btn|cta|primary)/i.test(s.slice(0, 2500)) },
    { name: 'all have heavy uncompressed images',        test: (s) => /<img[^>]+src=["'][^"']+\.(png|jpg|jpeg)["']/i.test(s) && !/loading=["']lazy["']/i.test(s) },
    { name: 'all missing outcome-focused headlines',     test: (s) => !/<h1[^>]*>[^<]*(boost|grow|save|earn|reduce|cut|automate|launch|win|free|results|faster|better)[^<]*<\/h1>/i.test(s) },
  ]
  for (const c of checks) {
    const matched = dropOffPages.every((p: any) => allPages[p.filePath] && c.test(allPages[p.filePath].content))
    if (matched) return { pages: dropOffPages.map((p: any) => p.filePath), rootCause: c.name }
  }
  return null
}

// ─── WEEKLY EMAIL (3g) ────────────────────────────────────────────────────────
async function sendWeeklyEmail(opts: {
  toEmail: string; websiteUrl: string; problem: string; prUrl: string;
  bounceBefore: number | null; bounceAfter: number | null;
  screenshotBefore: string | null; competitorChanges: any[] | null;
}) {
  const apiKey    = Deno.env.get('MAILJET_API_KEY')
  const apiSecret = Deno.env.get('MAILJET_SECRET_KEY')
  if (!apiKey || !apiSecret || !opts.toEmail) {
    console.warn('Skipping weekly email — missing Mailjet creds or recipient'); return
  }
  const baseUrl      = Deno.env.get('VITE_APP_URL')
  const dashboardUrl = `${baseUrl}/agent/dashboard`

  const bounceBlock = (opts.bounceBefore != null && opts.bounceAfter != null)
    ? `<p style="font-size:13px;color:#6b6460;margin:0 0 12px;">Bounce rate: <strong style="color:#1c1917;">${opts.bounceBefore}% → ${opts.bounceAfter}%</strong></p>`
    : ''
  const screenshotBlock = opts.screenshotBefore
    ? `<img src="${opts.screenshotBefore}" alt="Page snapshot" style="width:100%;border:1px solid rgba(28,25,23,0.08);border-radius:10px;margin:12px 0;display:block;">`
    : ''
  const competitorBlock = opts.competitorChanges?.length
    ? `<div style="background:#fff8ec;border:1px solid rgba(214,137,16,0.2);border-radius:10px;padding:14px 16px;margin:16px 0;">
        <p style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#d68910;font-weight:500;margin:0 0 6px;">⚠️ Competitor Update</p>
        ${opts.competitorChanges.map(c => `<p style="font-size:12px;color:#6b6460;margin:0 0 4px;"><strong style="color:#1c1917;">${c.url}</strong>: ${c.diffs.join(' · ')}</p>`).join('')}
      </div>` : ''

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f7f4ef;font-family:'Helvetica Neue',Arial,sans-serif;font-weight:300;color:#1c1917;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <p style="font-size:22px;font-weight:500;letter-spacing:-.01em;color:#1c1917;margin:0 0 32px;">Velyr</p>
    <div style="background:#ffffff;border:1px solid rgba(28,25,23,0.08);border-radius:16px;padding:36px;margin-bottom:24px;">
      <p style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#a09890;margin:0 0 10px;">Your agent ran this morning</p>
      <p style="font-family:'Cormorant Garant',serif;font-size:26px;font-weight:300;color:#1c1917;margin:0 0 18px;line-height:1.3;letter-spacing:-.01em;">${opts.problem}</p>
      ${bounceBlock}
      <p style="font-size:13px;color:#6b6460;margin:0 0 20px;">${opts.websiteUrl}</p>
      ${screenshotBlock}
      ${competitorBlock}
      <a href="${opts.prUrl}" style="display:inline-block;background:#1c1917;color:#f7f4ef;text-decoration:none;border-radius:10px;padding:12px 22px;font-size:13px;font-weight:500;margin-right:8px;">View pull request →</a>
      <a href="${dashboardUrl}" style="display:inline-block;background:transparent;color:#2a5c45;text-decoration:none;border:1px solid #2a5c45;border-radius:10px;padding:12px 22px;font-size:13px;font-weight:500;">View your full dashboard →</a>
    </div>
    <p style="font-size:11px;color:#a09890;margin:0;line-height:1.6;">© Velyr · You receive this because you subscribed to the Growth Agent.</p>
  </div>
</body></html>`

  try {
    const res = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + btoa(`${apiKey}:${apiSecret}`) },
      body: JSON.stringify({
        Messages: [{
          From: { Email: 'info@velyr.io', Name: 'Velyr' },
          To:   [{ Email: opts.toEmail }],
          Subject: "Your Velyr Agent ran this morning — here's what it found",
          HTMLPart: html,
          TextPart: `Your Velyr Agent ran this morning.\n\n${opts.problem}\n\nView the pull request: ${opts.prUrl}\nView your dashboard: ${dashboardUrl}`,
        }],
      }),
    })
    if (!res.ok) console.error('Mailjet weekly email error:', await res.text())
  } catch (err: any) {
    console.error('Weekly email send failed:', err.message)
  }
}

// ─── MONTHLY ROAST REPORT (3h) ────────────────────────────────────────────────
function isFirstMondayOfMonth(date: Date = new Date()): boolean {
  return date.getDay() === 1 && date.getDate() <= 7
}

async function generateMonthlyRoast(opts: {
  subscriptionId: string; websiteUrl: string; toEmail: string | null; chatId: string | null;
  recentRuns: any[]; competitorData: any; dna: any;
}) {
  try {
    const wins   = opts.recentRuns.filter((r: any) => r.status === 'deployed').slice(0, 5)
    const losses = opts.recentRuns.filter((r: any) => r.status === 'rolled_back' || r.status === 'rejected').slice(0, 5)

    const prompt = `You are a smart, blunt friend writing a monthly roast report for the owner of ${opts.websiteUrl}. No corporate fluff. No hedging. Be honest about what's working, what's embarrassing, and what they keep dodging.

CONTEXT:
Recent wins (deployed): ${wins.map((r: any) => r.analysis_result?.problem || 'unknown').join(' · ') || 'none'}
Recent losses (rolled back / rejected): ${losses.map((r: any) => r.analysis_result?.problem || 'unknown').join(' · ') || 'none'}
Competitor signals: ${opts.competitorData?.length ? opts.competitorData.map((c: any) => `${c.url}: hero "${c.headlines?.[0] || ''}", CTA "${c.ctas?.[0] || ''}"`).join(' | ') : 'none tracked'}
Business DNA — what works: ${opts.dna?.whatWorks || 'no history'}
Business DNA — what failed: ${opts.dna?.neverDoAgain || 'no history'}

Write 4-5 paragraphs:
1. What genuinely improved this month (with data when available).
2. What is still embarrassingly bad vs competitors — name it specifically.
3. What the owner keeps ignoring that the agent can't fix (e.g. content quality, product positioning, the actual product itself).
4. One specific thing they should fix manually this month — not something the agent can do for them.
Make it sound like a smart friend being honest. Direct second person. No headers, no bullet points, just paragraphs.`

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-sonnet-4-5', messages: [{ role: 'user', content: prompt }] }),
    })
    const data = await res.json()
    const roast = data.choices?.[0]?.message?.content?.trim()
    if (!roast) return

    await supabase.from('agent_subscriptions').update({
      last_roast_report: roast, last_roast_at: new Date().toISOString(),
    }).eq('id', opts.subscriptionId)

    if (opts.chatId) {
      await fetch(`https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: opts.chatId,
          text: `🔥 *Monthly Roast — ${opts.websiteUrl}*\n\n${roast.slice(0, 3500)}`,
          parse_mode: 'Markdown',
        }),
      })
    }
    if (opts.toEmail) {
      const apiKey    = Deno.env.get('MAILJET_API_KEY')
      const apiSecret = Deno.env.get('MAILJET_SECRET_KEY')
      if (apiKey && apiSecret) {
        await fetch('https://api.mailjet.com/v3.1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + btoa(`${apiKey}:${apiSecret}`) },
          body: JSON.stringify({
            Messages: [{
              From: { Email: 'info@velyr.io', Name: 'Velyr' },
              To:   [{ Email: opts.toEmail }],
              Subject: `🔥 Your Velyr monthly roast — ${opts.websiteUrl}`,
              HTMLPart: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:48px auto;padding:24px;color:#1c1917;line-height:1.7;">
                <p style="font-size:22px;font-weight:500;margin:0 0 24px;">Velyr · Monthly Roast</p>
                <div style="background:#fff;border:1px solid rgba(28,25,23,0.08);border-radius:16px;padding:32px;font-size:14px;color:#1c1917;white-space:pre-wrap;">${roast.replace(/</g, '&lt;')}</div>
              </div>`,
              TextPart: roast,
            }],
          }),
        })
      }
    }
  } catch (err: any) {
    console.error('Monthly roast generation failed:', err.message)
  }
}

// ─── A/B TEST DETECTION (3i) ──────────────────────────────────────────────────
const COPY_CHANGE_TYPES = ['headline', 'cta', 'copy']
function isCopyBasedFix(analysis: any): boolean {
  return COPY_CHANGE_TYPES.includes(analysis?.change_type)
}

// ─── AI ANALYSIS ─────────────────────────────────────────────────────────────
async function callAI(repoContent: any, analytics: any, pageSpeed: any, previousFixes: string[], dna: any, competitorData: any, guardrails: any, funnelAnalysis: any, seasonal: string, sprint: { pages: string[]; rootCause: string } | null, revenue: any) {
  const a = analytics?.last7Days

  const analyticsContext = a ? `
REAL ANALYTICS DATA (last 7 days):
- Total pageviews: ${a.totalPageviews}
- Unique sessions: ${a.uniqueVisitors}
- Bounce rate: ${a.bounceRate}%
- Mobile visitors: ${a.mobilePercent != null ? `${a.mobilePercent}%` : 'unknown'}
- Traffic change vs last week: ${a.trafficChange != null ? `${a.trafficChange > 0 ? '+' : ''}${a.trafficChange}%` : 'first week'}
- Top pages: ${a.topPages.map((p: any) => `${p.path} (${p.views} views)`).join(', ')}
TRAFFIC SOURCES:
- Google: ${a.socialBreakdown.google} · TikTok: ${a.socialBreakdown.tiktok} · Instagram: ${a.socialBreakdown.instagram}
- YouTube: ${a.socialBreakdown.youtube} · Twitter/X: ${a.socialBreakdown.twitter} · Facebook: ${a.socialBreakdown.facebook}
${a.utmCampaigns.length > 0 ? `UTM CAMPAIGNS:\n${a.utmCampaigns.map((c: any) => `- ${c.source || 'unknown'} / ${c.campaign || 'no campaign'}: ${c.visits} visits`).join('\n')}` : ''}
` : 'No analytics data available.'

  const pageSpeedContext     = pageSpeed ? `PERFORMANCE (mobile):\n- Score: ${pageSpeed.performance}/100\n- LCP: ${pageSpeed.lcp}\n- CLS: ${pageSpeed.cls}\n- TBT: ${pageSpeed.fid}` : ''
  const previousFixesContext = previousFixes.length > 0 ? `ALREADY FIXED — DO NOT SUGGEST THESE AGAIN:\n${previousFixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}` : ''
  // Combine legacy agent_learnings DNA with new agent_business_dna table
  const dnaWinsText   = (dna?.whatWorks    || '').trim() || (dna?.winsText   || '').trim()
  const dnaLossesText = (dna?.neverDoAgain || '').trim() || (dna?.lossesText || '').trim()
  const dnaContext = (dnaWinsText || dnaLossesText) ? `BUSINESS DNA — what this site has learned over time:
WHAT WORKS (double down on these patterns):
${dnaWinsText || 'no successes recorded yet'}
NEVER DO AGAIN (these were rolled back or rejected):
${dnaLossesText || 'no failures recorded yet'}` : ''
  const seasonalContext = seasonal || ''
  const sprintContext   = sprint ? `⚡ MULTI-PAGE SPRINT MODE — pages [${sprint.pages.join(', ')}] share root cause: "${sprint.rootCause}". Generate ONE coordinated fix that applies to ALL ${sprint.pages.length} pages. Use \`multi_file_changes\`: an array of { file_to_edit, code_change: { find, replace } }. Set \`is_multi_page\` to true. The PR description should explain the shared pattern.` : ''
  const revenueContext  = revenue?.lowestRpv ? `REVENUE PER VISITOR (last 30 days, ${revenue.monthlyVisitors.toFixed(0)} monthly visitors, €${revenue.totalRevenue.toFixed(0)} total revenue):
- Overall: €${revenue.overallRpv}/visitor
- Lowest RPV page (FIX THIS FIRST if traffic is meaningful): ${revenue.lowestRpv.path} → €${revenue.lowestRpv.revenuePerVisitor}/visitor (${revenue.lowestRpv.views} views)
${revenue.perPage.slice(0, 5).map((p: any) => `  ${p.path}: €${p.revenuePerVisitor}/visitor`).join('\n')}
PRIORITIZATION: When revenue data is available, the lowest-RPV page outranks the highest-bounce page.` : ''
  const competitorContext    = competitorData?.length > 0 ? `COMPETITOR INTELLIGENCE:\n${competitorData.map((c: any) => `Competitor: ${c.url}\n- Title: ${c.title}\n- Headlines: ${c.headlines.join(' | ')}\n- CTAs: ${c.ctas.join(' | ')}`).join('\n')}` : ''
  const guardrailsContext    = guardrails ? `BRAND GUARDRAILS — FOLLOW THESE:\n${guardrails.tone ? `- Tone: ${guardrails.tone}` : ''}\n${guardrails.forbidden_patterns?.length ? `- NEVER: ${guardrails.forbidden_patterns.join(', ')}` : ''}\n${guardrails.protected_elements?.length ? `- NEVER change: ${guardrails.protected_elements.join(', ')}` : ''}\n${guardrails.custom_rules || ''}` : ''
  const funnelContext        = funnelAnalysis ? `FUNNEL ANALYSIS (${funnelAnalysis.totalPages} pages):\nPage types: ${Object.entries(funnelAnalysis.pageTypes).map(([t, n]) => `${t}: ${n}`).join(', ')}\n${funnelAnalysis.funnelPages.filter((p: any) => p.views > 0).map((p: any) => `- ${p.filePath} (${p.pageType}) → ${p.views} views${p.dropOffScore ? `, ${p.dropOffScore}% drop-off` : ''}`).join('\n')}\n${funnelAnalysis.biggestDropOff ? `BIGGEST DROP-OFF: ${funnelAnalysis.biggestDropOff.filePath} — ${funnelAnalysis.biggestDropOff.dropOffScore}% drop-off` : ''}` : ''

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-5',
      messages: [{
        role: 'user',
        content: `You are an elite web conversion optimization expert. Analyze the website code AND real analytics data to find the single highest-impact improvement.

${analyticsContext}
${pageSpeedContext}
${previousFixesContext}
${dnaContext}
${competitorContext}
${guardrailsContext}
${funnelContext}
${revenueContext}
${seasonalContext}
${sprintContext}

WEBSITE CODE:
${JSON.stringify(repoContent, null, 2)}

RULES:
- Do NOT suggest: /premium route, Stripe, intentionally disabled features
- The fix MUST be a real code change
- Reference specific data points in your analysis
- RESPECT ALL BRAND GUARDRAILS
- HONOR Business DNA: never re-attempt patterns from the "NEVER DO AGAIN" list, prefer patterns from "WHAT WORKS"
- If funnel shows big drop-off on non-landing page, fix THAT page
- If revenue data is provided, prioritize the LOWEST revenue-per-visitor page over the highest-bounce page
- Apply the SEASONAL FOCUS when choosing which fix to ship
- The "find" text in code_change MUST be an EXACT verbatim copy from the source code
- For SPRINT MODE: return multi_file_changes as an array, set is_multi_page=true, and use a single shared change_type

Reply ONLY as JSON without Markdown:
{
  "problem": "specific problem referencing real data",
  "impact": "quantified impact with numbers",
  "solution": "exact actionable change",
  "expected_improvement": "realistic estimate",
  "data_insight": "key analytics insight",
  "file_to_edit": "exact file path",
  "change_type": "headline|cta|copy|layout|pricing|trust|navigation|performance|differentiation|other",
  "competitor_insight": null,
  "code_change": { "find": "exact text to replace", "replace": "new improved text" },
  "is_multi_page": false,
  "multi_file_changes": null,
  "impact_prediction": { "conversion_lift_min": 8, "conversion_lift_max": 18, "confidence": "medium", "confidence_reason": "one sentence" },
  "risk_score": { "risk_level": "low", "effort_estimate": "15min", "rollback_safe": true, "risk_reason": "one sentence" }
}`,
      }],
    }),
  })

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content

  // FIX: guard against missing/malformed AI response
  if (!text) throw new Error(`AI returned empty response: ${JSON.stringify(data).slice(0, 200)}`)

  let analysis
  try {
    analysis = JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch (e) {
    throw new Error(`AI returned invalid JSON: ${text.slice(0, 200)}`)
  }

  const isSprint = analysis.is_multi_page && Array.isArray(analysis.multi_file_changes) && analysis.multi_file_changes.length > 0
  if (!isSprint && (!analysis.file_to_edit || !analysis.code_change?.find)) {
    throw new Error(`AI response missing required fields: ${JSON.stringify(analysis).slice(0, 200)}`)
  }
  if (isSprint) {
    for (const mc of analysis.multi_file_changes) {
      if (!mc.file_to_edit || !mc.code_change?.find) {
        throw new Error(`AI sprint response missing fields: ${JSON.stringify(mc).slice(0, 200)}`)
      }
    }
  }

  if (a?.uniqueVisitors && analysis.impact_prediction) {
    analysis.impact_prediction.revenue_estimate = estimateRevenueImpact(
      a.uniqueVisitors, a.bounceRate, analysis.impact_prediction.conversion_lift_min / 100
    )
  }

  return analysis
}

// ─── CREATE PR ───────────────────────────────────────────────────────────────
async function createPR(octokit: any, owner: string, repo: string, analysis: any, sprint: { pages: string[]; rootCause: string } | null = null) {
  const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: 'heads/main' })

  const branchName = `agent/fix-${Date.now()}`
  await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: ref.object.sha })

  const isSprint = analysis.is_multi_page && Array.isArray(analysis.multi_file_changes) && analysis.multi_file_changes.length > 0
  const changes  = isSprint
    ? analysis.multi_file_changes
    : [{ file_to_edit: analysis.file_to_edit, code_change: analysis.code_change }]

  const filesEdited: string[] = []
  for (const ch of changes) {
    const { data: fileData } = await octokit.rest.repos.getContent({ owner, repo, path: ch.file_to_edit })
    const currentContent = base64Decode(fileData.content)
    const newContent     = currentContent.replace(ch.code_change.find, ch.code_change.replace)
    if (newContent === currentContent) {
      throw new Error(`Code change not found in file: ${ch.file_to_edit}. Find text did not match.`)
    }
    await octokit.rest.repos.createOrUpdateFileContents({
      owner, repo, path: ch.file_to_edit,
      message: `fix: ${analysis.problem}${isSprint ? ` (${ch.file_to_edit})` : ''}`,
      content: base64Encode(newContent),
      sha: fileData.sha, branch: branchName,
    })
    filesEdited.push(ch.file_to_edit)
  }

  const riskEmoji = ({ low: '🟢', medium: '🟡', high: '🔴' } as any)[analysis.risk_score?.risk_level] || '⚪'
  const sprintBlock = isSprint
    ? `## Multi-Page Sprint\nThese ${filesEdited.length} pages share the same root cause: **${sprint?.rootCause || 'shared pattern'}**. Fixing them together compounds the impact.\n\nFiles changed:\n${filesEdited.map(f => `- \`${f}\``).join('\n')}`
    : ''
  const abBlock = isCopyBasedFix(analysis)
    ? `## A/B Test\nThis is a copy-based fix. A PostHog feature flag splits traffic 50/50 between the original and the new variant. The agent will check results in 7 days and auto-merge the winner (or revert the loser).`
    : ''
  const prBody = [
    `## Problem\n${analysis.problem}`,
    `## Data Insight\n${analysis.data_insight || 'N/A'}`,
    `## Why this matters\n${analysis.impact}`,
    `## Solution\n${analysis.solution}`,
    `## Expected Improvement\n${analysis.expected_improvement}`,
    sprintBlock,
    abBlock,
    analysis.competitor_insight ? `## Competitor Differentiation\n${analysis.competitor_insight}` : '',
    analysis.impact_prediction  ? `## Impact Prediction\n- Lift: +${analysis.impact_prediction.conversion_lift_min}–${analysis.impact_prediction.conversion_lift_max}%\n- Confidence: ${analysis.impact_prediction.confidence}\n- ${analysis.impact_prediction.confidence_reason}` : '',
    analysis.risk_score         ? `## Risk\n${riskEmoji} ${analysis.risk_score.risk_level.toUpperCase()} · ${analysis.risk_score.effort_estimate} · Rollback safe: ${analysis.risk_score.rollback_safe ? 'Yes ✅' : 'No ⚠️'}\n${analysis.risk_score.risk_reason}` : '',
  ].filter(Boolean).join('\n\n')

  const titlePrefix = isSprint ? '🤖 Agent (sprint)' : '🤖 Agent'
  const { data: pr } = await octokit.rest.pulls.create({
    owner, repo, title: `${titlePrefix}: ${analysis.problem}`, body: prBody, head: branchName, base: 'main',
  })

  return { pr, filesEdited }
}

// ─── TELEGRAM NOTIFICATION ───────────────────────────────────────────────────
async function sendTelegramNotification(analysis: any, pr: any, runId: string, analytics: any, chatId: string, opts: { screenshotBefore?: string | null; competitorChanges?: any[] | null; isAbTest?: boolean; isSprint?: boolean; filesEdited?: string[] } = {}) {
  const a = analytics?.last7Days

  const trendText     = a?.trafficChange != null ? ` · ${a.trafficChange > 0 ? '+' : ''}${a.trafficChange}% vs last week` : ''
  const analyticsLine = a ? `📊 *This week:* ${a.totalPageviews} pageviews · ${a.bounceRate}% bounce${trendText}\n\n` : ''

  let impactBlock = ''
  if (analysis.impact_prediction) {
    const ip        = analysis.impact_prediction
    const confEmoji = ({ high: '🎯', medium: '📐', low: '🔮' } as any)[ip.confidence] || '📐'
    const revLine   = ip.revenue_estimate ? `💶 *Revenue impact:* +${ip.revenue_estimate.revenueMin}–${ip.revenue_estimate.revenueMax} €/month\n` : ''
    impactBlock     = `${confEmoji} *Impact Prediction* _(${ip.confidence} confidence)_\n📈 Conversion lift: +${ip.conversion_lift_min}–${ip.conversion_lift_max}%\n${revLine}_${ip.confidence_reason}_\n\n`
  }

  let riskBlock = ''
  if (analysis.risk_score) {
    const rs        = analysis.risk_score
    const riskEmoji = ({ low: '🟢', medium: '🟡', high: '🔴' } as any)[rs.risk_level] || '⚪'
    riskBlock       = `${riskEmoji} *Risk:* ${rs.risk_level.toUpperCase()} · ⏱ ${rs.effort_estimate} · ${rs.rollback_safe ? '✅ Rollback safe' : '⚠️ Needs care'}\n_${rs.risk_reason}_\n\n`
  }

  const competitorLine = analysis.competitor_insight ? `🔍 *Competitor angle:* ${analysis.competitor_insight}\n\n` : ''
  const screenshotLine = opts.screenshotBefore ? `📸 [Before screenshot](${opts.screenshotBefore})\n\n` : ''
  const sprintLine     = opts.isSprint && opts.filesEdited?.length ? `⚡ *Multi-page sprint* — fixing ${opts.filesEdited.length} pages with shared root cause:\n${opts.filesEdited.map(f => `  • ${f}`).join('\n')}\n\n` : ''
  const competitorChangesLine = opts.competitorChanges?.length
    ? `⚠️ *Competitor Update*\n${opts.competitorChanges.map(c => `• *${c.url}*\n  ${c.diffs.join('\n  ')}`).join('\n')}\n\n`
    : ''

  const footer = opts.isAbTest
    ? `🧪 *A/B test deployed* — I'll check results in 7 days and auto-merge the winner.\nReply *YES* to start the test · Reply *NO* to skip`
    : `Reply *YES* to deploy · Reply *NO* to skip`

  const message = `🤖 *Velyr Growth Agent*

${analyticsLine}${competitorChangesLine}${sprintLine}🔍 *Problem found:*
${analysis.problem}

💡 *Data insight:*
${analysis.data_insight || 'Based on code analysis'}

💥 *Impact:*
${analysis.impact}

${impactBlock}${riskBlock}${competitorLine}${screenshotLine}✅ *Solution:*
${analysis.solution}

📈 *Expected improvement:* ${analysis.expected_improvement}

🔗 [View PR](${pr.html_url})

${footer}`

  const response = await fetch(`https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown', disable_web_page_preview: false }),
  })

  const data = await response.json()
  if (!data.ok) console.error('Telegram error:', data.description)
  return data.result?.message_id || null
}

// ─── PROCESS SINGLE CONNECTION ───────────────────────────────────────────────
// FIX: extracted from handleFullRun so Promise.allSettled can run them in parallel
async function processConnection(conn: any) {
  let run: any = null

  try {
    // PostHog auto-setup on first run
    if (!conn.posthog_project_id) {
      const phSetup = await setupPostHogForConnection(conn)
      if (phSetup) {
        conn.posthog_project_id = phSetup.posthogProjectId
        conn.posthog_api_key    = Deno.env.get('POSTHOG_API_KEY')
      }
    }

    const { data: runData } = await supabase
      .from('agent_runs').insert({ subscription_id: conn.subscription_id, status: 'running' })
      .select().single()
    run = runData

    // Pull subscription extras (revenue connection, slug, etc.) once up front
    const { data: subRow } = await supabase.from('agent_subscriptions')
      .select('telegram_chat_id, stripe_revenue_connected, stripe_account_id, competitors, public_slug, is_public')
      .eq('id', conn.subscription_id).single()
    const subEmail   = await fetchSubscriptionEmail(conn.subscription_id)
    const trackedCompetitors: string[] = subRow?.competitors || []

    // Step 1: Fetching repo
    await supabase.from('agent_runs').update({ current_step: 'fetching_repo' }).eq('id', run.id)
    const octokit        = await getOctokit(conn.github_installation_id)
    const competitorUrls = await getCompetitorUrls(conn.subscription_id)

    // Step 2: Pulling analytics + parallel context
    await supabase.from('agent_runs').update({ current_step: 'pulling_analytics' }).eq('id', run.id)
    const [repoContent, allPages, analytics, pageSpeed, previousFixes, legacyDna, competitorData, guardrails, businessDna, competitorChanges] = await Promise.all([
      analyzeRepo(octokit, conn.github_repo_owner, conn.github_repo_name),
      detectAllPages(octokit, conn.github_repo_owner, conn.github_repo_name),
      getPostHogAnalytics(
        conn.posthog_api_key    || Deno.env.get('POSTHOG_API_KEY')!,
        conn.posthog_project_id || Deno.env.get('POSTHOG_PROJECT_ID')!,
        conn.posthog_host       || Deno.env.get('POSTHOG_HOST')!,
      ),
      conn.website_url ? getPageSpeedScore(conn.website_url) : Promise.resolve(null),
      getPreviousRuns(conn.subscription_id),
      fetchBusinessDNA(conn.subscription_id),                              // legacy agent_learnings
      competitorUrls.length > 0 ? fetchCompetitorData(competitorUrls) : Promise.resolve(null),
      fetchBrandGuardrails(conn.subscription_id),
      loadBusinessDNA(conn.subscription_id),                               // 3d new agent_business_dna
      scanCompetitorsForChanges(conn.subscription_id, trackedCompetitors), // 3c
    ])

    // 3b: revenue attribution
    const revenue = subRow?.stripe_revenue_connected
      ? await getStripeRevenuePerVisitor(subRow.stripe_account_id || null, analytics)
      : null

    // Merge legacy + new DNA so the prompt sees both
    const dna = businessDna || legacyDna

    // Step 3: Mapping funnel
    await supabase.from('agent_runs').update({ current_step: 'mapping_funnel' }).eq('id', run.id)
    const funnelAnalysis      = buildFunnelAnalysis(allPages, analytics)
    const enrichedRepoContent = { ...repoContent }
    for (const [path, info] of Object.entries(allPages) as any) {
      if (!enrichedRepoContent[path]) enrichedRepoContent[path] = info.content
    }

    // 3f: detect multi-page sprint opportunity
    const sprint   = detectMultiPageSprint(funnelAnalysis, allPages)
    // 3e: seasonal context
    const seasonal = getSeasonalContext()

    // Step 4: Finding biggest issue (AI)
    await supabase.from('agent_runs').update({ current_step: 'finding_biggest_issue' }).eq('id', run.id)
    const analysis = await callAI(enrichedRepoContent, analytics, pageSpeed, previousFixes, dna, competitorData, guardrails, funnelAnalysis, seasonal, sprint, revenue)

    // 3a: capture before-screenshot of the page being edited
    const targetUrl = (() => {
      if (!conn.website_url) return null
      const editPath = analysis.is_multi_page ? analysis.multi_file_changes?.[0]?.file_to_edit : analysis.file_to_edit
      const route    = (editPath || '').replace(/^(src\/pages|pages|src\/views|src\/screens)\//, '/').replace(/\.(jsx|tsx|js|ts)$/, '').replace(/\/index$/, '/').toLowerCase()
      const base     = conn.website_url.replace(/\/$/, '')
      return route && route !== '/' ? `${base}${route}` : base
    })()
    const screenshotBefore = await captureScreenshot(targetUrl || conn.website_url)

    // Step 5: Writing fix
    await supabase.from('agent_runs').update({ current_step: 'writing_fix' }).eq('id', run.id)
    const { pr, filesEdited } = await createPR(octokit, conn.github_repo_owner, conn.github_repo_name, analysis, sprint)

    // Step 6: Sending notification
    await supabase.from('agent_runs').update({ current_step: 'sending_notification' }).eq('id', run.id)
    const chatId = subRow?.telegram_chat_id
    if (!chatId) throw new Error(`No telegram_chat_id for subscription ${conn.subscription_id}`)

    const isAbTest  = isCopyBasedFix(analysis)
    const messageId = await sendTelegramNotification(analysis, pr, run.id, analytics, chatId, {
      screenshotBefore, competitorChanges, isAbTest, isSprint: !!sprint, filesEdited,
    })

    // Persist run (with new columns from Part 1)
    const bounceBefore = analytics?.last7Days?.bounceRate ?? null
    const abVariants   = isAbTest ? {
      change_type: analysis.change_type,
      file_to_edit: analysis.file_to_edit,
      variantA: analysis.code_change?.find,
      variantB: analysis.code_change?.replace,
      created_at: new Date().toISOString(),
      evaluate_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    } : null

    await supabase.from('agent_runs').update({
      status:        'waiting_approval',
      current_step:  'done',
      completed_at:  new Date().toISOString(),
      analysis_result: { ...analysis, analytics_snapshot: analytics?.last7Days, sprint, revenue: revenue || null },
      funnel_analysis: funnelAnalysis ? {
        totalPages:     funnelAnalysis.totalPages,
        pageTypes:      funnelAnalysis.pageTypes,
        biggestDropOff: funnelAnalysis.biggestDropOff,
      } : null,
      pr_number:                 pr.number,
      pr_url:                    pr.html_url,
      telegram_message_id:       messageId || null,
      screenshot_before:         screenshotBefore,
      bounce_rate_before:        bounceBefore,
      revenue_per_visitor_before: revenue?.lowestRpv?.revenuePerVisitor ?? null,
      competitor_changes:        competitorChanges,
      ab_test_variants:          abVariants,
      pages_fixed:               filesEdited,
      problem_description:       analysis.problem,
    }).eq('id', run.id)

    await saveFunnelPages(conn.subscription_id, run.id, funnelAnalysis)
    await createABTest(conn, run.id, analysis)

    // 3g: Weekly email summary
    if (subEmail) {
      await sendWeeklyEmail({
        toEmail: subEmail, websiteUrl: conn.website_url || '', problem: analysis.problem,
        prUrl: pr.html_url, bounceBefore, bounceAfter: null,
        screenshotBefore, competitorChanges,
      })
    }

    // 3h: Monthly roast — only on the first Monday
    if (isFirstMondayOfMonth()) {
      const { data: recentRuns } = await supabase.from('agent_runs')
        .select('status, analysis_result, completed_at')
        .eq('subscription_id', conn.subscription_id)
        .gte('created_at', new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }).limit(20)
      await generateMonthlyRoast({
        subscriptionId: conn.subscription_id, websiteUrl: conn.website_url || '',
        toEmail: subEmail, chatId, recentRuns: recentRuns || [], competitorData, dna,
      })
    }

  } catch (err: any) {
    console.error(`[processConnection] Error for subscription ${conn.subscription_id}:`, err)

    if (run?.id) {
      await supabase.from('agent_runs').update({
        status:        'failed',
        error_message: err.message || 'Unknown error',
      }).eq('id', run.id)
    }

    try {
      const { data: sub } = await supabase.from('agent_subscriptions').select('telegram_chat_id').eq('id', conn.subscription_id).single()
      // FIX: no fallback to env TELEGRAM_CHAT_ID — only notify the actual user
      const chatId = sub?.telegram_chat_id
      if (!chatId) return

      await fetch(`https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `⚠️ *Velyr Agent — Run Failed*\n\n_${err.message || 'Unknown error'}_\n\nThe agent will retry next run.`,
          parse_mode: 'Markdown',
        }),
      })
    } catch (notifyErr) { console.error('Failed to send error notification:', notifyErr) }
  }
}

// ─── MAIN RUN ─────────────────────────────────────────────────────────────────
async function handleFullRun() {
  const { data: connections } = await supabase
    .from('agent_connections').select('*, agent_subscriptions!inner(*)')
    .eq('agent_subscriptions.status', 'active')
    .eq('agent_subscriptions.subscription_status', 'active')

  if (!connections || connections.length === 0) {
    return { success: true, message: 'No active connections' }
  }

  // FIX: parallel execution — each user runs independently, one failing doesn't block others
  await Promise.allSettled(connections.map(conn => processConnection(conn)))

  return { success: true, processed: connections.length }
}