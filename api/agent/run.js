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

    // Pageviews per page
    const pageviewsRes = await fetch(
      `${posthogHost}/api/projects/${posthogProjectId}/query/`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: {
            kind: 'EventsQuery',
            select: ['properties.$pathname', 'count()'],
            event: '$pageview',
            after: sevenDaysAgo,
            before: today,
            limit: 10,
            orderBy: ['count() DESC'],
          }
        })
      }
    )
    const pageviews = await pageviewsRes.json()

    // Sessions + bounce rate via sessions query
    const sessionsRes = await fetch(
      `${posthogHost}/api/projects/${posthogProjectId}/query/`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: {
            kind: 'EventsQuery',
            select: ['properties.$session_id', 'count()'],
            event: '$pageview',
            after: sevenDaysAgo,
            before: today,
            limit: 1000,
          }
        })
      }
    )
    const sessions = await sessionsRes.json()

    // Unique visitors
    const visitorsRes = await fetch(
      `${posthogHost}/api/projects/${posthogProjectId}/query/`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: {
            kind: 'EventsQuery',
            select: ['distinct_id', 'count()'],
            event: '$pageview',
            after: sevenDaysAgo,
            before: today,
            limit: 1000,
          }
        })
      }
    )
    const visitors = await visitorsRes.json()

    // Calculate metrics
    const totalPageviews = pageviews.results?.reduce((sum, row) => sum + (row[1] || 0), 0) || 0
    const uniqueSessions = new Set(sessions.results?.map(r => r[0])).size || 0
    const uniqueVisitors = visitors.results?.length || 0

    // Single-page sessions (bounces)
    const sessionPageCounts = {}
    sessions.results?.forEach(row => {
      const sessionId = row[0]
      sessionPageCounts[sessionId] = (sessionPageCounts[sessionId] || 0) + 1
    })
    const bouncedSessions = Object.values(sessionPageCounts).filter(count => count === 1).length
    const bounceRate = uniqueSessions > 0 ? Math.round((bouncedSessions / uniqueSessions) * 100) : 0

    // Top pages
    const topPages = pageviews.results?.slice(0, 5).map(row => ({
      path: row[0],
      views: row[1]
    })) || []

    return {
      last7Days: {
        totalPageviews,
        uniqueVisitors,
        uniqueSessions,
        bounceRate,
        topPages,
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
    .eq('status', 'deployed')
    .order('created_at', { ascending: false })
    .limit(5)

  return data?.map(r => r.analysis_result?.problem).filter(Boolean) || []
}

async function callAI(repoContent, analytics, pageSpeed, previousFixes, websiteUrl) {
  const analyticsContext = analytics ? `
REAL ANALYTICS DATA (last 7 days):
- Total pageviews: ${analytics.last7Days.totalPageviews}
- Unique visitors: ${analytics.last7Days.uniqueVisitors}
- Bounce rate: ${analytics.last7Days.bounceRate}%
- Top pages: ${analytics.last7Days.topPages.map(p => `${p.path} (${p.views} views)`).join(', ')}
` : 'No analytics data available.'

  const pageSpeedContext = pageSpeed ? `
PERFORMANCE DATA:
- Mobile performance score: ${pageSpeed.performance}/100
- LCP (Largest Contentful Paint): ${pageSpeed.lcp}
- CLS (Cumulative Layout Shift): ${pageSpeed.cls}
- Total Blocking Time: ${pageSpeed.fid}
` : 'No performance data available.'

  const previousFixesContext = previousFixes.length > 0 ? `
ALREADY FIXED (do NOT suggest these again):
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
        content: `You are an elite web conversion optimization expert with deep knowledge of UX, performance, SEO, and data-driven optimization.

Your job: Analyze the website code AND real analytics data to find the single highest-impact improvement.

${analyticsContext}

${pageSpeedContext}

${previousFixesContext}

WEBSITE CODE:
${JSON.stringify(repoContent, null, 2)}

RULES:
- Use the analytics data to identify WHERE users are dropping off
- High bounce rate = prioritize above-the-fold experience
- If a page has many views but likely low conversion, focus there
- Do NOT suggest changes to: /premium route, Stripe integration, intentionally disabled features
- Focus on: copy, CTAs, performance, UX, mobile experience, trust signals
- Be specific - reference actual data in your analysis
- The fix must be implementable as a code change

Reply ONLY as JSON without Markdown:
{
  "problem": "specific problem with data reference e.g. '${analytics?.last7Days?.bounceRate || 'High'}% bounce rate suggests users leave before seeing the CTA'",
  "impact": "why this hurts conversions with specific numbers",
  "solution": "exact change to make",
  "expected_improvement": "realistic estimate based on the data",
  "data_insight": "the key analytics insight that led to this recommendation",
  "file_to_edit": "which file",
  "code_change": {
    "find": "exact text to replace",
    "replace": "new text"
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
  const analyticsLine = analytics
    ? `📊 *This week:* ${analytics.last7Days.uniqueVisitors} visitors · ${analytics.last7Days.bounceRate}% bounce rate\n\n`
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

      // Run all data gathering in parallel
      const [repoContent, analytics, pageSpeed, previousFixes] = await Promise.all([
        analyzeRepo(octokit, conn.github_repo_owner, conn.github_repo_name),
        conn.posthog_api_key
          ? getPostHogAnalytics(conn.posthog_api_key, conn.posthog_project_id, conn.posthog_host)
          : getPostHogAnalytics(process.env.POSTHOG_API_KEY, process.env.POSTHOG_PROJECT_ID, process.env.POSTHOG_HOST),
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
        analysis_result: { ...analysis, analytics_snapshot: analytics?.last7Days },
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