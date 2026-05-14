import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { App } from '@octokit/app'
import { Octokit } from '@octokit/rest'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── SHARED HELPERS (used by rollback flow) ───────────────────────────────────
async function captureScreenshot(url) {
  const apiKey = process.env.SCREENSHOTONE_API_KEY
  if (!apiKey || !url) return null
  try {
    const params = new URLSearchParams({
      access_key: apiKey, url, viewport_width: '1280', viewport_height: '800',
      device_scale_factor: '1', format: 'jpg', block_ads: 'true',
      block_cookie_banners: 'true', cache: 'true', cache_ttl: '3600',
      response_type: 'json',
    })
    const res = await fetch(`https://api.screenshotone.com/take?${params}`, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null
    const data = await res.json()
    return data?.cache_url || data?.store?.url || data?.url || null
  } catch { return null }
}

async function recordDNA(subscriptionId, runId, fixType, outcome, notes) {
  await supabase.from('agent_business_dna').insert({
    subscription_id: subscriptionId, run_id: runId, fix_type: fixType, outcome,
    notes: (notes || '').slice(0, 500),
  })
}

// Promote DNA entries with outcome='pending' to 'success' after 7 days
// if their run is still in 'deployed' status (not rolled back).
async function promotePendingDNAToSuccess() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: pending } = await supabase
    .from('agent_business_dna').select('id, run_id, fix_type')
    .eq('outcome', 'pending').lte('created_at', sevenDaysAgo)
  if (!pending?.length) return
  for (const p of pending) {
    if (!p.run_id) continue
    const { data: run } = await supabase.from('agent_runs').select('status').eq('id', p.run_id).single()
    if (run?.status === 'deployed') {
      await supabase.from('agent_business_dna').update({ outcome: 'success' }).eq('id', p.id)
    }
  }
}

export default async function handler(req, res) {
  const cronSecret = req.headers['x-cron-secret']
  const vercelCron  = req.headers['x-vercel-cron']
  const action      = req.query?.action

  // ── PUBLIC TIMELINE (no auth) ─────────────────────────────────────────────
  // GET /api/agent/run?action=public-timeline&slug=florian
  if (action === 'public-timeline') {
    return handlePublicTimeline(req, res)
  }

  // ── Authenticated user actions (Supabase JWT) ─────────────────────────────
  if (action === 'update-settings' || action === 'export-dna') {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

    if (action === 'update-settings') return handleUpdateSettings(req, res, user)
    if (action === 'export-dna')      return handleExportDNA(req, res, user)
  }

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
      await supabase
        .from('agent_subscriptions')
        .update({ status: 'active' })
        .eq('auth_user_id', user.id)
        .eq('subscription_status', 'active')
      return res.json({ success: true, status: 'active' })
    }

    if (action === 'delete') {
      const { data: subs } = await supabase
        .from('agent_subscriptions')
        .select('id, subscription_id, subscription_status')
        .eq('auth_user_id', user.id)

      for (const s of subs || []) {
        if (!s.subscription_id || s.subscription_status === 'cancelled') continue
        try {
          await stripe.subscriptions.cancel(s.subscription_id)
        } catch (err) {
          if (err?.code === 'resource_missing') continue
          console.error('[account-delete] stripe cancel failed — aborting deletion:', { subscription_id: s.subscription_id, code: err?.code, message: err?.message })
          return res.status(500).json({ error: 'Failed to cancel Stripe subscription. Account not deleted.' })
        }
      }

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
  const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 2000)
try {
  await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ triggeredBy: 'cron' }),
    signal: controller.signal,
  })
} catch (_) {
  // Timeout oder abort ist ok — Request wurde trotzdem abgeschickt
} finally {
  clearTimeout(timeoutId)
}

return res.status(200).json({ success: true, message: 'Agent run started via Edge Function' })

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

      // 3d/3i: also write to agent_business_dna so the DNA tab and Claude prompt see this
      await recordDNA(
        test.subscription_id, test.run_id, test.change_type || 'other',
        winner === 'treatment' ? 'success' : 'rollback',
        winner === 'treatment'
          ? `A/B winner (treatment): ${test.summary} (+${delta}% conversion)`
          : `A/B loser (control won): ${test.summary} (${delta}% vs control)`
      )

      await supabase.from('agent_ab_tests')
        .update({ status: 'completed', winner, delta_pct: delta })
        .eq('id', test.id)

      // 3i: if control won, auto-revert the change via a follow-up PR
      let revertedPrUrl = null
      if (winner === 'control') {
        try {
          const { data: run } = await supabase.from('agent_runs').select('*').eq('id', test.run_id).single()
          if (run?.analysis_result?.file_to_edit && conn?.github_installation_id) {
            const octokit = await getOctokit(conn.github_installation_id)
            const owner   = conn.github_repo_owner
            const repo    = conn.github_repo_name
            const { data: commits } = await octokit.rest.repos.listCommits({ owner, repo, per_page: 30 })
            const agentCommit = commits.find(c =>
              c.commit.message.startsWith('fix:') &&
              c.commit.message.includes((run.analysis_result.problem || '').slice(0, 30))
            )
            const parentSha = agentCommit?.parents?.[0]?.sha
            if (parentSha) {
              const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: 'heads/main' })
              const branchName    = `agent/ab-revert-${test.run_id.slice(0, 8)}`
              await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: ref.object.sha })
              const { data: originalFile } = await octokit.rest.repos.getContent({ owner, repo, path: run.analysis_result.file_to_edit, ref: parentSha })
              const { data: currentFile  } = await octokit.rest.repos.getContent({ owner, repo, path: run.analysis_result.file_to_edit })
              await octokit.rest.repos.createOrUpdateFileContents({
                owner, repo, path: run.analysis_result.file_to_edit,
                message: `revert: A/B test — control won (${delta}%)`,
                content: originalFile.content, sha: currentFile.sha, branch: branchName,
              })
              const { data: revertPr } = await octokit.rest.pulls.create({
                owner, repo,
                title: `🔄 A/B Auto-Revert: ${run.analysis_result.problem}`,
                body: `## A/B Test — Control Won\n\nAfter 7 days, the control variant outperformed the treatment by ${Math.abs(delta)}%.\n\nThis PR reverts the change to restore the original.`,
                head: branchName, base: 'main',
              })
              await octokit.rest.pulls.merge({ owner, repo, pull_number: revertPr.number, merge_method: 'squash' })
              revertedPrUrl = revertPr.html_url
            }
          }
        } catch (revertErr) {
          console.error('A/B auto-revert failed:', revertErr)
        }
      }

      const outcomeMsg = winner === 'treatment'
        ? `✅ *A/B Test Winner: Treatment*\n📈 +${delta}% conversion lift confirmed.\nSaved to your Business DNA.`
        : `📊 *A/B Result: Control Won*\n📉 Change did not improve conversions (${delta}%).\nLearning saved — agent will avoid similar patterns.${revertedPrUrl ? `\n🔄 Auto-revert PR merged: ${revertedPrUrl}` : ''}`

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
  // Promote DNA entries that have stayed deployed for 7+ days to 'success'.
  await promotePendingDNAToSuccess().catch(e => console.error('DNA promote error:', e))

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

      // 3a: capture after-screenshot at the same URL targeted by the original run
      const targetUrl = (() => {
        if (!conn?.website_url) return null
        const editPath = run.analysis_result?.is_multi_page
          ? run.analysis_result?.multi_file_changes?.[0]?.file_to_edit
          : run.analysis_result?.file_to_edit
        const route = (editPath || '').replace(/^(src\/pages|pages|src\/views|src\/screens)\//, '/').replace(/\.(jsx|tsx|js|ts)$/, '').replace(/\/index$/, '/').toLowerCase()
        const base  = conn.website_url.replace(/\/$/, '')
        return route && route !== '/' ? `${base}${route}` : base
      })()
      const screenshotAfter = await captureScreenshot(targetUrl)

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

      // Persist new agent_runs columns (Part 1) for the public timeline + dashboard
      await supabase.from('agent_runs').update({
        bounce_rate_after: bounceAfter,
        screenshot_after:  screenshotAfter,
        ...(shouldRollback ? { rollback_reason: 'metrics_dropped' } : {}),
      }).eq('id', run.id)

      // 3d: Business DNA — record outcome
      const fixType = run.analysis_result?.change_type || 'other'
      const noteSuffix = `${run.analysis_result?.problem || ''} (bounce ${bounceBefore}% → ${bounceAfter}%, Δ${bounceDelta >= 0 ? '+' : ''}${bounceDelta}%)`
      if (shouldRollback) {
        await recordDNA(run.subscription_id, run.id, fixType, 'rollback', `Auto-rolled back: ${noteSuffix}`)
      } else {
        // Pending — gets promoted to 'success' after 7 days if still deployed
        await recordDNA(run.subscription_id, run.id, fixType, 'pending', `48h check positive: ${noteSuffix}`)
      }

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
    .eq('agent_subscriptions.subscription_status', 'active')

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
    .eq('agent_subscriptions.subscription_status', 'active')

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

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC TIMELINE / SETTINGS / DNA EXPORT — handlers consolidated here to stay
// within the Vercel Hobby 12-function limit. All routed via ?action=… branches
// at the top of the default handler.
// ════════════════════════════════════════════════════════════════════════════

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/

// ─── Public Timeline (no auth) ────────────────────────────────────────────────
async function handlePublicTimeline(req, res) {
  const slug = (req.query?.slug || '').toLowerCase().trim()
  if (!slug || !SLUG_REGEX.test(slug)) return res.status(404).json({ error: 'Not found' })

  const { data: sub } = await supabase
    .from('agent_subscriptions')
    .select('id, website_url, created_at, public_slug, is_public')
    .eq('public_slug', slug).eq('is_public', true).maybeSingle()
  if (!sub) return res.status(404).json({ error: 'Not found' })

  const [runsRes, dnaRes] = await Promise.all([
    supabase.from('agent_runs')
      .select('id, status, created_at, completed_at, problem_description, screenshot_before, screenshot_after, bounce_rate_before, bounce_rate_after, score_before, score_after, pr_url, competitor_changes, ab_test_variants, analysis_result, pages_fixed')
      .eq('subscription_id', sub.id)
      .order('created_at', { ascending: false }).limit(50),
    supabase.from('agent_business_dna')
      .select('fix_type, outcome, notes, created_at')
      .eq('subscription_id', sub.id)
      .order('created_at', { ascending: false }).limit(100),
  ])

  // Derive problem_description from analysis_result if column is null (legacy rows).
  // Strip A/B variants details to "winner only if resolved".
  const runs = (runsRes.data || []).map(r => {
    const ab = r.ab_test_variants
    const abPublic = ab && ab.winner ? { winner: ab.winner, change_type: ab.change_type } : null
    return {
      id: r.id, status: r.status,
      date: r.completed_at || r.created_at,
      problem: r.problem_description || r.analysis_result?.problem || null,
      screenshot_before: r.screenshot_before, screenshot_after: r.screenshot_after,
      bounce_rate_before: r.bounce_rate_before, bounce_rate_after: r.bounce_rate_after,
      score_before: r.score_before, score_after: r.score_after,
      pr_url: r.pr_url,
      competitor_changes: r.competitor_changes,
      ab_test: abPublic,
      pages_fixed: r.pages_fixed,
    }
  })

  // Group DNA by fix_type with success/rollback counts
  const dnaByType = {}
  for (const d of (dnaRes.data || [])) {
    if (!dnaByType[d.fix_type]) dnaByType[d.fix_type] = { fix_type: d.fix_type, success: 0, rollback: 0, pending: 0, latest_note: null }
    dnaByType[d.fix_type][d.outcome]++
    if (!dnaByType[d.fix_type].latest_note) dnaByType[d.fix_type].latest_note = d.notes
  }

  return res.status(200).json({
    website_url: sub.website_url,
    created_at:  sub.created_at,
    runs,
    business_dna: Object.values(dnaByType),
  })
}

// ─── Update Agent Settings (Supabase JWT) ─────────────────────────────────────
async function handleUpdateSettings(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const body = req.body || {}
  const updates = {}

  if (typeof body.is_public === 'boolean') updates.is_public = body.is_public

  if (body.public_slug !== undefined) {
    const slug = body.public_slug == null ? null : String(body.public_slug).toLowerCase().trim()
    if (slug !== null) {
      if (!SLUG_REGEX.test(slug)) return res.status(400).json({ error: 'Slug must be 3-30 lowercase letters, numbers, or hyphens' })
      // Uniqueness check (excluding rows owned by this user)
      const { data: existing } = await supabase
        .from('agent_subscriptions').select('id, auth_user_id')
        .eq('public_slug', slug).maybeSingle()
      if (existing && existing.auth_user_id !== user.id) {
        return res.status(409).json({ error: 'Slug already taken' })
      }
    }
    updates.public_slug = slug
  }

  if (Array.isArray(body.competitors)) {
    const cleaned = body.competitors
      .map(u => String(u || '').trim())
      .filter(Boolean)
      .filter(u => { try { new URL(u); return true } catch { return false } })
      .slice(0, 5)
    updates.competitors = cleaned
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields provided' })

  const { data, error } = await supabase
    .from('agent_subscriptions').update(updates)
    .eq('auth_user_id', user.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true, subscription: data })
}

// ─── Export DNA Playbook (Supabase JWT) ───────────────────────────────────────
async function handleExportDNA(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { data: sub } = await supabase
    .from('agent_subscriptions').select('id, website_url').eq('auth_user_id', user.id).single()
  if (!sub) return res.status(404).json({ error: 'No subscription found' })

  const [dnaRes, snapsRes] = await Promise.all([
    supabase.from('agent_business_dna')
      .select('fix_type, outcome, notes, created_at')
      .eq('subscription_id', sub.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('agent_competitor_snapshots')
      .select('competitor_url, snapshot_data, captured_at')
      .eq('subscription_id', sub.id).order('captured_at', { ascending: false }).limit(20),
  ])
  const dna   = dnaRes.data   || []
  const snaps = snapsRes.data || []

  // Keep only most recent snapshot per competitor (max 4)
  const latestByCompetitor = {}
  for (const s of snaps) if (!latestByCompetitor[s.competitor_url]) latestByCompetitor[s.competitor_url] = s
  const competitorBlock = Object.values(latestByCompetitor).slice(0, 4)
    .map(s => `${s.competitor_url}: ${JSON.stringify(s.snapshot_data)}`).join('\n') || 'no competitors tracked'

  const wins     = dna.filter(d => d.outcome === 'success')
  const losses   = dna.filter(d => d.outcome === 'rollback')
  const pending  = dna.filter(d => d.outcome === 'pending')

  const prompt = `You are a senior conversion strategist. Based on this website's 90-day agent history, write a Website Playbook.

WEBSITE: ${sub.website_url}

WHAT HAS WORKED (${wins.length} successes):
${wins.map(d => `- ${d.fix_type}: ${d.notes || ''}`).join('\n') || 'none yet'}

WHAT WAS ROLLED BACK (${losses.length} failures):
${losses.map(d => `- ${d.fix_type}: ${d.notes || ''}`).join('\n') || 'none yet'}

CURRENTLY PENDING (${pending.length}):
${pending.map(d => `- ${d.fix_type}: ${d.notes || ''}`).join('\n') || 'none'}

COMPETITOR CONTEXT:
${competitorBlock}

Write the Playbook in 4 sections, no fluff:
1. What has worked — proven fix patterns for THIS specific site (be concrete with the data above).
2. What to avoid — patterns that were rolled back and why.
3. Top 3 recommendations for the next 90 days based on what hasn't been tried yet.
4. Competitor context — what the tracked competitors are doing differently.
Max 600 words. Clear, direct language. Use short headers for each section.`

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-5',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await aiRes.json()
    const playbook = data.choices?.[0]?.message?.content?.trim()
    if (!playbook) return res.status(502).json({ error: 'Empty response from AI' })
    return res.status(200).json({ playbook })
  } catch (err) {
    console.error('export-dna AI error:', err)
    return res.status(500).json({ error: 'AI request failed' })
  }
}