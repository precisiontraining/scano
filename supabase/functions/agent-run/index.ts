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
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  // Auth: must be called with service role key
  const authHeader = req.headers.get('authorization') || ''
  const token      = authHeader.replace('Bearer ', '')
  const expectedSecret = Deno.env.get('AGENT_CRON_SECRET')
if (!expectedSecret || token !== expectedSecret) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
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

  const withDropOff   = funnelPages.filter(p => p.dropOffScore !== null && p.dropOffScore > 0)
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
    const headers       = { 'Authorization': `Bearer ${posthogApiKey}`, 'Content-Type': 'application/json' }
    const sevenDaysAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today         = new Date().toISOString().split('T')[0]

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
      if (domain.includes('tiktok'))                                socialBreakdown.tiktok    += visits
      else if (domain.includes('instagram') || domain.includes('ig.me')) socialBreakdown.instagram += visits
      else if (domain.includes('youtube')   || domain.includes('youtu.be')) socialBreakdown.youtube  += visits
      else if (domain.includes('twitter')   || domain.includes('t.co'))     socialBreakdown.twitter  += visits
      else if (domain.includes('facebook')  || domain.includes('fb.me'))    socialBreakdown.facebook += visits
      else if (domain.includes('google'))                           socialBreakdown.google    += visits
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
            { key: 'control',   name: 'Control (original)',    rollout_percentage: 50 },
            { key: 'treatment', name: 'Treatment (Velyr)',     rollout_percentage: 50 },
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

    const project        = await phRes.json()
    const posthogProjectId = String(project.id)
    const snippetToken   = project.api_token

    await supabase.from('agent_connections').update({
      posthog_project_id: posthogProjectId,
      posthog_api_key:    Deno.env.get('POSTHOG_API_KEY'),
      posthog_snippet_token: snippetToken,
    }).eq('id', conn.id)

    const isNext       = conn.github_repo_name?.toLowerCase().includes('next')
    const framework    = isNext ? 'Next.js' : 'React/Vite'
    const snippetCode  = isNext
      ? `// pages/_app.jsx  OR  app/layout.tsx\nimport posthog from 'posthog-js'\nif (typeof window !== 'undefined') {\n  posthog.init('${snippetToken}', { api_host: 'https://eu.posthog.com' })\n}`
      : `// src/main.jsx\nimport posthog from 'posthog-js'\nposthog.init('${snippetToken}', { api_host: 'https://eu.posthog.com' })`

    const { data: sub } = await supabase.from('agent_subscriptions').select('telegram_chat_id').eq('id', conn.subscription_id).single()
    const chatId = sub?.telegram_chat_id || Deno.env.get('TELEGRAM_CHAT_ID')

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
    revenueMin:             Math.round(additionalConversions * avgOrderValue * 0.7),
    revenueMax:             Math.round(additionalConversions * avgOrderValue * 1.3),
    additionalConversions:  Math.round(additionalConversions),
  }
}

// ─── AI ANALYSIS ─────────────────────────────────────────────────────────────
async function callAI(repoContent: any, analytics: any, pageSpeed: any, previousFixes: string[], dna: any, competitorData: any, guardrails: any, funnelAnalysis: any) {
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

  const pageSpeedContext    = pageSpeed ? `PERFORMANCE (mobile):\n- Score: ${pageSpeed.performance}/100\n- LCP: ${pageSpeed.lcp}\n- CLS: ${pageSpeed.cls}\n- TBT: ${pageSpeed.fid}` : ''
  const previousFixesContext = previousFixes.length > 0 ? `ALREADY FIXED — DO NOT SUGGEST THESE AGAIN:\n${previousFixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}` : ''
  const dnaContext          = dna ? `BUSINESS DNA:\nWins:\n${dna.winsText}\nLosses:\n${dna.lossesText}` : ''
  const competitorContext   = competitorData?.length > 0 ? `COMPETITOR INTELLIGENCE:\n${competitorData.map((c: any) => `Competitor: ${c.url}\n- Title: ${c.title}\n- Headlines: ${c.headlines.join(' | ')}\n- CTAs: ${c.ctas.join(' | ')}`).join('\n')}` : ''
  const guardrailsContext   = guardrails ? `BRAND GUARDRAILS — FOLLOW THESE:\n${guardrails.tone ? `- Tone: ${guardrails.tone}` : ''}\n${guardrails.forbidden_patterns?.length ? `- NEVER: ${guardrails.forbidden_patterns.join(', ')}` : ''}\n${guardrails.protected_elements?.length ? `- NEVER change: ${guardrails.protected_elements.join(', ')}` : ''}\n${guardrails.custom_rules || ''}` : ''
  const funnelContext       = funnelAnalysis ? `FUNNEL ANALYSIS (${funnelAnalysis.totalPages} pages):\nPage types: ${Object.entries(funnelAnalysis.pageTypes).map(([t, n]) => `${t}: ${n}`).join(', ')}\n${funnelAnalysis.funnelPages.filter((p: any) => p.views > 0).map((p: any) => `- ${p.filePath} (${p.pageType}) → ${p.views} views${p.dropOffScore ? `, ${p.dropOffScore}% drop-off` : ''}`).join('\n')}\n${funnelAnalysis.biggestDropOff ? `BIGGEST DROP-OFF: ${funnelAnalysis.biggestDropOff.filePath} — ${funnelAnalysis.biggestDropOff.dropOffScore}% drop-off` : ''}` : ''

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

WEBSITE CODE:
${JSON.stringify(repoContent, null, 2)}

RULES:
- Do NOT suggest: /premium route, Stripe, intentionally disabled features
- The fix MUST be a real code change
- Reference specific data points in your analysis
- RESPECT ALL BRAND GUARDRAILS
- If funnel shows big drop-off on non-landing page, fix THAT page

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
  "impact_prediction": { "conversion_lift_min": 8, "conversion_lift_max": 18, "confidence": "medium", "confidence_reason": "one sentence" },
  "risk_score": { "risk_level": "low", "effort_estimate": "15min", "rollback_safe": true, "risk_reason": "one sentence" }
}`
      }],
    }),
  })

  const data     = await response.json()
  const text     = data.choices[0].message.content
  const analysis = JSON.parse(text.replace(/```json|```/g, '').trim())

  if (a?.uniqueVisitors && analysis.impact_prediction) {
    analysis.impact_prediction.revenue_estimate = estimateRevenueImpact(
      a.uniqueVisitors, a.bounceRate, analysis.impact_prediction.conversion_lift_min / 100
    )
  }

  return analysis
}

// ─── CREATE PR ───────────────────────────────────────────────────────────────
async function createPR(octokit: any, owner: string, repo: string, analysis: any) {
  const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: 'heads/main' })

  const branchName = `agent/fix-${Date.now()}`
  await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: ref.object.sha })

  const { data: fileData } = await octokit.rest.repos.getContent({ owner, repo, path: analysis.file_to_edit })
  const currentContent     = base64Decode(fileData.content)
  const newContent         = currentContent.replace(analysis.code_change.find, analysis.code_change.replace)

  await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo, path: analysis.file_to_edit,
    message: `fix: ${analysis.problem}`,
    content: base64Encode(newContent),
    sha: fileData.sha, branch: branchName,
  })

  const riskEmoji = ({ low: '🟢', medium: '🟡', high: '🔴' } as any)[analysis.risk_score?.risk_level] || '⚪'
  const prBody    = [
    `## Problem\n${analysis.problem}`,
    `## Data Insight\n${analysis.data_insight || 'N/A'}`,
    `## Why this matters\n${analysis.impact}`,
    `## Solution\n${analysis.solution}`,
    `## Expected Improvement\n${analysis.expected_improvement}`,
    analysis.competitor_insight ? `## Competitor Differentiation\n${analysis.competitor_insight}` : '',
    analysis.impact_prediction  ? `## Impact Prediction\n- Lift: +${analysis.impact_prediction.conversion_lift_min}–${analysis.impact_prediction.conversion_lift_max}%\n- Confidence: ${analysis.impact_prediction.confidence}\n- ${analysis.impact_prediction.confidence_reason}` : '',
    analysis.risk_score         ? `## Risk\n${riskEmoji} ${analysis.risk_score.risk_level.toUpperCase()} · ${analysis.risk_score.effort_estimate} · Rollback safe: ${analysis.risk_score.rollback_safe ? 'Yes ✅' : 'No ⚠️'}\n${analysis.risk_score.risk_reason}` : '',
  ].filter(Boolean).join('\n\n')

  const { data: pr } = await octokit.rest.pulls.create({
    owner, repo, title: `🤖 Agent: ${analysis.problem}`, body: prBody, head: branchName, base: 'main',
  })

  return pr
}

// ─── TELEGRAM NOTIFICATION ───────────────────────────────────────────────────
async function sendTelegramNotification(analysis: any, pr: any, runId: string, analytics: any, chatId: string) {
  const a = analytics?.last7Days

  const trendText     = a?.trafficChange != null ? ` · ${a.trafficChange > 0 ? '+' : ''}${a.trafficChange}% vs last week` : ''
  const analyticsLine = a ? `📊 *This week:* ${a.totalPageviews} pageviews · ${a.bounceRate}% bounce${trendText}\n\n` : ''

  let impactBlock = ''
  if (analysis.impact_prediction) {
    const ip            = analysis.impact_prediction
    const confEmoji     = ({ high: '🎯', medium: '📐', low: '🔮' } as any)[ip.confidence] || '📐'
    const revLine       = ip.revenue_estimate ? `💶 *Revenue impact:* +${ip.revenue_estimate.revenueMin}–${ip.revenue_estimate.revenueMax} €/month\n` : ''
    impactBlock         = `${confEmoji} *Impact Prediction* _(${ip.confidence} confidence)_\n📈 Conversion lift: +${ip.conversion_lift_min}–${ip.conversion_lift_max}%\n${revLine}_${ip.confidence_reason}_\n\n`
  }

  let riskBlock = ''
  if (analysis.risk_score) {
    const rs        = analysis.risk_score
    const riskEmoji = ({ low: '🟢', medium: '🟡', high: '🔴' } as any)[rs.risk_level] || '⚪'
    riskBlock       = `${riskEmoji} *Risk:* ${rs.risk_level.toUpperCase()} · ⏱ ${rs.effort_estimate} · ${rs.rollback_safe ? '✅ Rollback safe' : '⚠️ Needs care'}\n_${rs.risk_reason}_\n\n`
  }

  const competitorLine = analysis.competitor_insight ? `🔍 *Competitor angle:* ${analysis.competitor_insight}\n\n` : ''

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

  const response = await fetch(`https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
  })

  const data = await response.json()
  if (!data.ok) console.error('Telegram error:', data.description)
  return data.result?.message_id || null
}

// ─── MAIN RUN ─────────────────────────────────────────────────────────────────
async function handleFullRun() {
  const { data: connections } = await supabase
    .from('agent_connections').select('*, agent_subscriptions!inner(*)')
    .eq('agent_subscriptions.status', 'active')

  if (!connections || connections.length === 0) {
    return { success: true, message: 'No active connections' }
  }

  for (const conn of connections) {
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

      // Step 1: Fetching repo
      await supabase.from('agent_runs').update({ current_step: 'fetching_repo' }).eq('id', run.id)
      const octokit        = await getOctokit(conn.github_installation_id)
      const competitorUrls = await getCompetitorUrls(conn.subscription_id)

      // Step 2: Pulling analytics
      await supabase.from('agent_runs').update({ current_step: 'pulling_analytics' }).eq('id', run.id)
      const [repoContent, allPages, analytics, pageSpeed, previousFixes, dna, competitorData, guardrails] = await Promise.all([
        analyzeRepo(octokit, conn.github_repo_owner, conn.github_repo_name),
        detectAllPages(octokit, conn.github_repo_owner, conn.github_repo_name),
        getPostHogAnalytics(
          conn.posthog_api_key    || Deno.env.get('POSTHOG_API_KEY')!,
          conn.posthog_project_id || Deno.env.get('POSTHOG_PROJECT_ID')!,
          conn.posthog_host       || Deno.env.get('POSTHOG_HOST')!,
        ),
        conn.website_url ? getPageSpeedScore(conn.website_url) : Promise.resolve(null),
        getPreviousRuns(conn.subscription_id),
        fetchBusinessDNA(conn.subscription_id),
        competitorUrls.length > 0 ? fetchCompetitorData(competitorUrls) : Promise.resolve(null),
        fetchBrandGuardrails(conn.subscription_id),
      ])

      // Step 3: Mapping funnel
      await supabase.from('agent_runs').update({ current_step: 'mapping_funnel' }).eq('id', run.id)
      const funnelAnalysis    = buildFunnelAnalysis(allPages, analytics)
      const enrichedRepoContent = { ...repoContent }
      for (const [path, info] of Object.entries(allPages) as any) {
        if (!enrichedRepoContent[path]) enrichedRepoContent[path] = info.content
      }

      // Step 4: Finding biggest issue (AI)
      await supabase.from('agent_runs').update({ current_step: 'finding_biggest_issue' }).eq('id', run.id)
      const analysis = await callAI(enrichedRepoContent, analytics, pageSpeed, previousFixes, dna, competitorData, guardrails, funnelAnalysis)

      // Step 5: Writing fix
      await supabase.from('agent_runs').update({ current_step: 'writing_fix' }).eq('id', run.id)
      const pr = await createPR(octokit, conn.github_repo_owner, conn.github_repo_name, analysis)

      // Step 6: Sending notification
      await supabase.from('agent_runs').update({ current_step: 'sending_notification' }).eq('id', run.id)
      const { data: sub } = await supabase.from('agent_subscriptions').select('telegram_chat_id').eq('id', conn.subscription_id).single()
      const chatId    = sub?.telegram_chat_id || Deno.env.get('TELEGRAM_CHAT_ID')!
      const messageId = await sendTelegramNotification(analysis, pr, run.id, analytics, chatId)

      // Done
      await supabase.from('agent_runs').update({
        status:       'waiting_approval',
        current_step: 'done',
        analysis_result: { ...analysis, analytics_snapshot: analytics?.last7Days },
        funnel_analysis: funnelAnalysis ? {
          totalPages:    funnelAnalysis.totalPages,
          pageTypes:     funnelAnalysis.pageTypes,
          biggestDropOff: funnelAnalysis.biggestDropOff,
        } : null,
        pr_number:           pr.number,
        pr_url:              pr.html_url,
        telegram_message_id: messageId || null,
      }).eq('id', run.id)

      await saveFunnelPages(conn.subscription_id, run.id, funnelAnalysis)
      await createABTest(conn, run.id, analysis)

    } catch (err: any) {
      console.error(`[handleFullRun] Error for subscription ${conn.subscription_id}:`, err)

      if (run?.id) {
        await supabase.from('agent_runs').update({
          status:        'failed',
          error_message: err.message || 'Unknown error',
        }).eq('id', run.id)
      }

      try {
        const { data: sub } = await supabase.from('agent_subscriptions').select('telegram_chat_id').eq('id', conn.subscription_id).single()
        const chatId = sub?.telegram_chat_id || Deno.env.get('TELEGRAM_CHAT_ID')
        if (chatId) {
          await fetch(`https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `⚠️ *Velyr Agent — Run Failed*\n\n_${err.message || 'Unknown error'}_\n\nThe agent will retry next run.`,
              parse_mode: 'Markdown',
            }),
          })
        }
      } catch (notifyErr) { console.error('Failed to send error notification:', notifyErr) }
    }
  }

  return { success: true, processed: connections.length }
}