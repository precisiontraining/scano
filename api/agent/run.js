import { createClient } from '@supabase/supabase-js'
import { App } from '@octokit/app'
import { Octokit } from '@octokit/rest'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const cronSecret = req.headers['x-cron-secret']
  const vercelCron  = req.headers['x-vercel-cron']
  const action      = req.query?.action

  // ── Account actions (quick — stay in Vercel) ──────────────────────────────
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

  // ── Cron auth ─────────────────────────────────────────────────────────────
  if (!vercelCron && cronSecret !== process.env.AGENT_CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const mode = req.query?.mode

  // ── Quick modes — stay in Vercel ──────────────────────────────────────────
  if (mode === 'evaluate_ab')    return handleEvaluateAB(res)
  if (mode === 'midweek')        return handleMidweek(res)
  if (mode === 'rollback_check') return handleRollbackCheck(res)
  if (mode === 'weekly_summary') return handleWeeklySummary(res)

  // ── Full run — fire Edge Function without awaiting ─────────────────────────
  const edgeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-run`

  // Fire and forget — do NOT await
  fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ triggeredBy: 'cron' }),
  }).catch(err => console.error('Edge function fire failed:', err))

  // Return immediately — Vercel function is done
  return res.status(200).json({ success: true, message: 'Agent run started via Edge Function' })
}

// ─── HELPER: Octokit ─────────────────────────────────────────────────────────
async function getOctokit(installationId) {
  const app = new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey: Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY_BASE64, 'base64').toString('utf-8'),
  })
  const { data: { token } } = await app.octokit.request(
    'POST /app/installations/{installation_id}/access_tokens',
    { installation_id: installationId }
  )
  return new Octokit({ auth: token })
}

// ─── EVALUATE A/B ─────────────────────────────────────────────────────────────
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
        .from('agent_connections').select('*')
        .eq('subscription_id', test.subscription_id).single()

      const apiKey    = conn?.posthog_api_key    || process.env.POSTHOG_API_KEY
      const projectId = conn?.posthog_project_id || process.env.POSTHOG_PROJECT_ID
      const host      = conn?.posthog_host       || process.env.POSTHOG_HOST || 'https://eu.posthog.com'
      if (!apiKey) continue

      const flagRes  = await fetch(`${host}/api/projects/${projectId}/feature_flags/${test.posthog_flag_id}/`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      const flagData = await flagRes.json()
      const results  = flagData?.experiment_results?.result
      if (!results) continue

      const controlRate   = results.control?.conversion_rate   ?? 0
      const treatmentRate = results.treatment?.conversion_rate ?? 0

      let winner = null, delta = 0
      if (treatmentRate > controlRate * 1.05) {
        winner = 'treatment'
        delta  = Math.round(((treatmentRate - controlRate) / (controlRate || 1)) * 100)
      } else if (controlRate > treatmentRate * 1.05) {
        winner = 'control'
        delta  = -Math.round(((controlRate - treatmentRate) / (controlRate || 1)) * 100)
      }
      if (!winner) continue

      await supabase.from('agent_learnings').insert({
        subscription_id: test.subscription_id, run_id: test.run_id,
        change_type: test.change_type, summary: test.summary,
        outcome: winner === 'treatment' ? 'positive' : 'negative',
        metric_type: 'conversion_rate', delta, confidence: 'high',
      })

      await supabase.from('agent_ab_tests')
        .update({ status: 'completed', winner, delta_pct: delta })
        .eq('id', test.id)

      const outcomeMsg = winner === 'treatment'
        ? `✅ *A/B Test Winner: Treatment*\n📈 +${delta}% conversion lift confirmed.\nSaved to your Business DNA.`
        : `📊 *A/B Result: Control Won*\n📉 Change did not improve conversions (${delta}%).\nLearning saved — agent will avoid similar patterns.`

      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `🤖 *Velyr Growth Agent — A/B Result*\n\n*${test.summary}*\n\n${outcomeMsg}`,
          parse_mode: 'Markdown',
        }),
      })
    } catch (err) {
      console.error('A/B evaluate error for test', test.id, err)
    }
  }

  return res.json({ success: true, evaluated: tests.length })
}

// ─── ROLLBACK CHECK ───────────────────────────────────────────────────────────
async function handleRollbackCheck(res) {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const ninetyTwoHoursAgo  = new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString()

  const { data: deployedRuns } = await supabase
    .from('agent_runs').select('*')
    .eq('status', 'deployed')
    .gte('completed_at', ninetyTwoHoursAgo)
    .lte('completed_at', fortyEightHoursAgo)

  if (!deployedRuns || deployedRuns.length === 0) {
    return res.json({ success: true, message: 'No runs to evaluate for rollback' })
  }

  for (const run of deployedRuns) {
    try {
      const { data: conn } = await supabase
        .from('agent_connections').select('*')
        .eq('subscription_id', run.subscription_id).single()

      const apiKey    = conn?.posthog_api_key    || process.env.POSTHOG_API_KEY
      const projectId = conn?.posthog_project_id || process.env.POSTHOG_PROJECT_ID
      const host      = conn?.posthog_host       || process.env.POSTHOG_HOST || 'https://eu.posthog.com'
      if (!apiKey || !projectId) continue

      const deployedAt    = new Date(run.completed_at)
      const twoDaysBefore = new Date(deployedAt - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const deployedDate  = deployedAt.toISOString().split('T')[0]
      const twoDaysAfter  = new Date(deployedAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const headers       = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

      const [beforeRes, afterRes] = await Promise.all([
        fetch(`${host}/api/projects/${projectId}/query/`, {
          method: 'POST', headers,
          body: JSON.stringify({ query: { kind: 'EventsQuery', select: ['properties.$session_id', 'count()'], event: '$pageview', after: twoDaysBefore, before: deployedDate, limit: 2000 } }),
        }),
        fetch(`${host}/api/projects/${projectId}/query/`, {
          method: 'POST', headers,
          body: JSON.stringify({ query: { kind: 'EventsQuery', select: ['properties.$session_id', 'count()'], event: '$pageview', after: deployedDate, before: twoDaysAfter, limit: 2000 } }),
        }),
      ])
      const [before, after] = await Promise.all([beforeRes.json(), afterRes.json()])

      const calcBounceRate = (results) => {
        const counts = {}
        results?.forEach(row => { counts[row[0]] = (counts[row[0]] || 0) + 1 })
        const total   = Object.keys(counts).length
        const bounced = Object.values(counts).filter(c => c === 1).length
        return total > 10 ? Math.round((bounced / total) * 100) : null
      }

      const bounceBefore = calcBounceRate(before.results)
      const bounceAfter  = calcBounceRate(after.results)
      if (bounceBefore === null || bounceAfter === null) continue

      const bounceDelta    = bounceAfter - bounceBefore
      const shouldRollback = bounceDelta >= 15

      await supabase.from('impact_metrics').insert({
        run_id: run.id, metric_type: 'bounce_rate',
        value_before: bounceBefore, value_after: bounceAfter,
        measured_at: new Date().toISOString(),
      })

      await supabase.from('agent_learnings').insert({
        subscription_id: run.subscription_id, run_id: run.id,
        change_type: run.analysis_result?.change_type || 'other',
        summary: run.analysis_result?.problem || 'Unknown change',
        outcome: shouldRollback ? 'negative' : 'positive',
        metric_type: 'bounce_rate', delta: -bounceDelta, confidence: 'high',
      })

      if (shouldRollback) {
        const octokit = await getOctokit(conn.github_installation_id)
        const owner   = conn.github_repo_owner
        const repo    = conn.github_repo_name

        try {
          const { data: commits } = await octokit.rest.repos.listCommits({ owner, repo, per_page: 10 })
          const agentCommit = commits.find(c =>
            c.commit.message.startsWith('fix:') &&
            c.commit.message.includes(run.analysis_result?.problem?.slice(0, 30))
          )

          if (agentCommit) {
            const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: 'heads/main' })
            const branchName    = `agent/rollback-${run.id.slice(0, 8)}`
            await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: ref.object.sha })

            const parentSha = agentCommit.parents[0]?.sha
            if (parentSha && run.analysis_result?.file_to_edit) {
              const { data: originalFile } = await octokit.rest.repos.getContent({ owner, repo, path: run.analysis_result.file_to_edit, ref: parentSha })
              const { data: currentFile  } = await octokit.rest.repos.getContent({ owner, repo, path: run.analysis_result.file_to_edit })

              await octokit.rest.repos.createOrUpdateFileContents({
                owner, repo, path: run.analysis_result.file_to_edit,
                message: `revert: rollback agent change (bounce rate +${bounceDelta}%)`,
                content: originalFile.content, sha: currentFile.sha, branch: branchName,
              })

              const { data: pr } = await octokit.rest.pulls.create({
                owner, repo,
                title: `🔄 Auto-Rollback: ${run.analysis_result?.problem}`,
                body: `## Automatic Rollback\n\nBounce rate increased by **+${bounceDelta}%** in the 48h after deployment.\n\n- Before: ${bounceBefore}%\n- After: ${bounceAfter}%`,
                head: branchName, base: 'main',
              })
              await octokit.rest.pulls.merge({ owner, repo, pull_number: pr.number, merge_method: 'squash' })
              await supabase.from('agent_runs').update({ status: 'rolled_back' }).eq('id', run.id)

              await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: process.env.TELEGRAM_CHAT_ID,
                  text: `🔄 *Velyr Auto-Rollback Triggered*\n\n*Change:* ${run.analysis_result?.problem}\n\n📉 Bounce rate: ${bounceBefore}% → ${bounceAfter}% (+${bounceDelta}%)\n\n✅ Reverted automatically.`,
                  parse_mode: 'Markdown',
                }),
              })
            }
          }
        } catch (rollbackErr) {
          console.error('Rollback failed:', rollbackErr)
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: process.env.TELEGRAM_CHAT_ID,
              text: `⚠️ *Velyr Rollback Alert*\n\n*Change:* ${run.analysis_result?.problem}\n\n📉 Bounce rate +${bounceDelta}% — ❌ auto-rollback failed, please revert manually.`,
              parse_mode: 'Markdown',
            }),
          })
        }
      } else if (bounceDelta <= -5) {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: `📈 *Velyr Impact Check — Positive*\n\n*Change:* ${run.analysis_result?.problem}\n\n✅ Bounce rate: ${bounceBefore}% → ${bounceAfter}% (${bounceDelta}%)`,
            parse_mode: 'Markdown',
          }),
        })
      }
    } catch (err) {
      console.error('Rollback check error for run', run.id, err)
    }
  }

  return res.json({ success: true, checked: deployedRuns.length })
}

// ─── WEEKLY SUMMARY ───────────────────────────────────────────────────────────
async function handleWeeklySummary(res) {
  const { data: connections } = await supabase
    .from('agent_connections').select('*, agent_subscriptions!inner(*)')
    .eq('agent_subscriptions.status', 'active')

  if (!connections || connections.length === 0) {
    return res.json({ success: true, message: 'No active connections' })
  }

  for (const conn of connections) {
    try {
      const subscriptionId = conn.subscription_id
      const oneWeekAgo     = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [analytics, weekRunsRes, completedABRes, allLearningsRes, subRes] = await Promise.all([
        getPostHogAnalytics(
          conn.posthog_api_key    || process.env.POSTHOG_API_KEY,
          conn.posthog_project_id || process.env.POSTHOG_PROJECT_ID,
          conn.posthog_host       || process.env.POSTHOG_HOST
        ),
        supabase.from('agent_runs').select('*').eq('subscription_id', subscriptionId).gte('created_at', oneWeekAgo).order('created_at', { ascending: false }),
        supabase.from('agent_ab_tests').select('*').eq('subscription_id', subscriptionId).eq('status', 'completed').gte('created_at', oneWeekAgo),
        supabase.from('agent_learnings').select('outcome, delta, metric_type').eq('subscription_id', subscriptionId),
        supabase.from('agent_subscriptions').select('telegram_chat_id').eq('id', subscriptionId).single(),
      ])

      const weekRuns       = weekRunsRes.data   || []
      const completedABTests = completedABRes.data || []
      const allLearnings   = allLearningsRes.data || []
      const chatId         = subRes.data?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID

      const deployedRunIds = weekRuns.filter(r => r.status === 'deployed' || r.status === 'rolled_back').map(r => r.id)
      let impactMetrics    = []
      if (deployedRunIds.length > 0) {
        const { data: metrics } = await supabase.from('impact_metrics').select('*').in('run_id', deployedRunIds)
        impactMetrics = metrics || []
      }

      const totalLearnings   = allLearnings.length
      const winLearnings     = allLearnings.filter(l => l.outcome === 'positive')
      const avgPositiveDelta = winLearnings.length > 0
        ? Math.round(winLearnings.reduce((sum, l) => sum + (l.delta || 0), 0) / winLearnings.length)
        : null

      const a          = analytics?.last7Days
      const deployed   = weekRuns.filter(r => r.status === 'deployed').length
      const rolledBack = weekRuns.filter(r => r.status === 'rolled_back').length
      const rejected   = weekRuns.filter(r => r.status === 'rejected').length
      const pending    = weekRuns.filter(r => r.status === 'waiting_approval').length

      const trendEmoji = !a?.trafficChange ? '📊' : a.trafficChange > 10 ? '📈' : a.trafficChange < -10 ? '📉' : '➡️'
      const trendText  = a?.trafficChange == null ? 'First week of tracking'
        : a.trafficChange > 0 ? `+${a.trafficChange}% vs previous week`
        : `${a.trafficChange}% vs previous week`
      const bounceText = !a ? '—'
        : a.bounceRate === 0 ? 'No data'
        : a.bounceRate > 70 ? `⚠️ ${a.bounceRate}% (high)`
        : a.bounceRate > 50 ? `🟡 ${a.bounceRate}%`
        : `✅ ${a.bounceRate}%`

      let bestMetricLine = ''
      const bounceMetrics = impactMetrics.filter(m => m.metric_type === 'bounce_rate' && m.value_before && m.value_after)
      if (bounceMetrics.length > 0) {
        const best        = bounceMetrics.sort((a, b) => (a.value_before - a.value_after) - (b.value_before - b.value_after))[0]
        const improvement = Math.round(best.value_before - best.value_after)
        if (improvement > 0) bestMetricLine = `\n📉 Best result: bounce rate −${improvement}% after agent change`
      }

      let abSummary = ''
      if (completedABTests.length > 0) {
        const winners  = completedABTests.filter(t => t.winner === 'treatment')
        abSummary      = `\n🔬 *A/B Tests:* ${completedABTests.length} completed · ${winners.length} won`
        if (winners.length > 0) {
          const avgLift = Math.round(winners.reduce((sum, t) => sum + (t.delta_pct || 0), 0) / winners.length)
          abSummary    += ` · avg +${avgLift}% lift`
        }
      }

      const dnaSummary       = totalLearnings > 0
        ? `\n🧬 *Business DNA:* ${totalLearnings} learnings${avgPositiveDelta ? ` · avg +${avgPositiveDelta}% on wins` : ''}`
        : ''
      const deployedChanges  = weekRuns.filter(r => r.status === 'deployed').map(r => `  ✅ ${r.analysis_result?.problem?.slice(0, 60) || 'Change deployed'}`).join('\n') || ''
      const rolledBackChanges = weekRuns.filter(r => r.status === 'rolled_back').map(r => `  🔄 ${r.analysis_result?.problem?.slice(0, 60) || 'Rolled back'}`).join('\n') || ''

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

      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
      })
    } catch (err) {
      console.error('Weekly summary error for subscription', conn.subscription_id, err)
    }
  }

  return res.json({ success: true, mode: 'weekly_summary' })
}

// ─── MIDWEEK ──────────────────────────────────────────────────────────────────
async function handleMidweek(res) {
  const { data: connections } = await supabase
    .from('agent_connections').select('*, agent_subscriptions!inner(*)')
    .eq('agent_subscriptions.status', 'active')

  if (!connections || connections.length === 0) {
    return res.json({ success: true, message: 'No active connections' })
  }

  for (const conn of connections) {
    const analytics = await getPostHogAnalytics(
      conn.posthog_api_key    || process.env.POSTHOG_API_KEY,
      conn.posthog_project_id || process.env.POSTHOG_PROJECT_ID,
      conn.posthog_host       || process.env.POSTHOG_HOST
    )

    const { data: sub } = await supabase
      .from('agent_subscriptions').select('telegram_chat_id')
      .eq('id', conn.subscription_id).single()

    const chatId = sub?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID
    const a      = analytics?.last7Days
    if (!a) continue

    const trendEmoji = a.trafficChange === null ? '📊' : a.trafficChange > 10 ? '📈' : a.trafficChange < -10 ? '📉' : '➡️'
    const trendText  = a.trafficChange === null ? 'first week of tracking'
      : a.trafficChange > 0 ? `+${a.trafficChange}% vs last week`
      : `${a.trafficChange}% vs last week`

    const socialLines = Object.entries(a.socialBreakdown)
      .filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
      .map(([platform, visits]) => {
        const emoji = { tiktok: '🎵', instagram: '📸', youtube: '▶️', twitter: '𝕏', google: '🔍', facebook: '📘' }[platform] || '🌐'
        return `  ${emoji} ${platform}: ${visits} visits`
      }).join('\n')

    const pagesLines     = a.topPages.slice(0, 3).map(p => `  • ${p.path} — ${p.views} views`).join('\n')
    const bounceAssessment = a.bounceRate > 70
      ? `⚠️ High bounce rate (${a.bounceRate}%) — agent will prioritize this Monday`
      : a.bounceRate > 50 ? `🟡 Bounce rate ${a.bounceRate}% — room to improve`
      : a.bounceRate === 0 ? `📊 No bounce data yet`
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    })
  }

  return res.json({ success: true, mode: 'midweek' })
}

// ─── POSTHOG ANALYTICS (needed by weekly_summary + midweek) ──────────────────
async function getPostHogAnalytics(posthogApiKey, posthogProjectId, posthogHost = 'https://eu.posthog.com') {
  try {
    const headers       = { 'Authorization': `Bearer ${posthogApiKey}`, 'Content-Type': 'application/json' }
    const sevenDaysAgo  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const today         = new Date().toISOString().split('T')[0]

    const query = (body) => fetch(`${posthogHost}/api/projects/${posthogProjectId}/query/`, { method: 'POST', headers, body: JSON.stringify({ query: body }) })

    const [pageviewsRes, sessionsRes, lastWeekRes, referrersRes, utmRes, deviceRes] = await Promise.all([
      query({ kind: 'EventsQuery', select: ['properties.$pathname', 'count()'], event: '$pageview', after: sevenDaysAgo,    before: today, limit: 10,   orderBy: ['count() DESC'] }),
      query({ kind: 'EventsQuery', select: ['properties.$session_id', 'count()'], event: '$pageview', after: sevenDaysAgo,  before: today, limit: 2000 }),
      query({ kind: 'EventsQuery', select: ['properties.$session_id', 'count()'], event: '$pageview', after: fourteenDaysAgo, before: sevenDaysAgo, limit: 2000 }),
      query({ kind: 'EventsQuery', select: ['properties.$referring_domain', 'count()'], event: '$pageview', after: sevenDaysAgo, before: today, limit: 20, orderBy: ['count() DESC'] }),
      query({ kind: 'EventsQuery', select: ['properties.$utm_source', 'properties.$utm_medium', 'properties.$utm_campaign', 'count()'], event: '$pageview', after: sevenDaysAgo, before: today, limit: 20, orderBy: ['count() DESC'] }),
      query({ kind: 'EventsQuery', select: ['properties.$device_type', 'count()'], event: '$pageview', after: sevenDaysAgo, before: today, limit: 10, orderBy: ['count() DESC'] }),
    ])

    const [pageviews, sessions, lastWeek, referrers, utmData, devices] = await Promise.all([
      pageviewsRes.json(), sessionsRes.json(), lastWeekRes.json(),
      referrersRes.json(), utmRes.json(), deviceRes.json(),
    ])

    const sessionPageCounts = {}
    sessions.results?.forEach(row => { sessionPageCounts[row[0]] = (sessionPageCounts[row[0]] || 0) + 1 })
    const uniqueSessions  = Object.keys(sessionPageCounts).length
    const bouncedSessions = Object.values(sessionPageCounts).filter(c => c === 1).length
    const bounceRate      = uniqueSessions > 0 ? Math.round((bouncedSessions / uniqueSessions) * 100) : 0
    const totalPageviews  = pageviews.results?.reduce((sum, row) => sum + (row[1] || 0), 0) || 0
    const lastWeekSessions = new Set(lastWeek.results?.map(r => r[0])).size || 0
    const trafficChange   = lastWeekSessions > 0 ? Math.round(((uniqueSessions - lastWeekSessions) / lastWeekSessions) * 100) : null

    const socialBreakdown = { tiktok: 0, instagram: 0, youtube: 0, twitter: 0, facebook: 0, google: 0 }
    const trafficSources  = []
    referrers.results?.forEach(row => {
      const domain = row[0] || '', visits = row[1]
      if (domain) trafficSources.push({ domain, visits })
      if (domain.includes('tiktok'))    socialBreakdown.tiktok    += visits
      else if (domain.includes('instagram') || domain.includes('ig.me')) socialBreakdown.instagram += visits
      else if (domain.includes('youtube')   || domain.includes('youtu.be')) socialBreakdown.youtube  += visits
      else if (domain.includes('twitter')   || domain.includes('t.co'))     socialBreakdown.twitter  += visits
      else if (domain.includes('facebook')  || domain.includes('fb.me'))    socialBreakdown.facebook += visits
      else if (domain.includes('google'))   socialBreakdown.google   += visits
    })

    const deviceBreakdown = {}
    devices.results?.forEach(row => { if (row[0]) deviceBreakdown[row[0].toLowerCase()] = row[1] })
    const mobilePercent = deviceBreakdown['mobile'] && totalPageviews > 0
      ? Math.round((deviceBreakdown['mobile'] / totalPageviews) * 100) : null

    return {
      last7Days: {
        totalPageviews, uniqueVisitors: uniqueSessions, bounceRate, mobilePercent, trafficChange, lastWeekSessions,
        topPages:      pageviews.results?.slice(0, 5).map(row => ({ path: row[0], views: row[1] })) || [],
        trafficSources: trafficSources.slice(0, 8),
        socialBreakdown, totalSocialVisits: Object.values(socialBreakdown).reduce((s, v) => s + v, 0),
        utmCampaigns:  utmData.results?.filter(row => row[0] || row[2])?.map(row => ({ source: row[0], medium: row[1], campaign: row[2], visits: row[3] }))?.slice(0, 5) || [],
        deviceBreakdown,
      }
    }
  } catch (error) {
    console.error('PostHog analytics error:', error)
    return null
  }
}