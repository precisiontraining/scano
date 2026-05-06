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

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  })
}

// ─── APPROVE ────────────────────────────────────────────────────────────────
async function handleApprove(runId, chatId) {
  const { data: run } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (!run) return sendMessage(chatId, '❌ Run not found.')
  if (run.status !== 'waiting_approval')
    return sendMessage(chatId, '⚠️ This run is no longer waiting for approval.')

  const { data: conn } = await supabase
    .from('agent_connections')
    .select('*')
    .eq('subscription_id', run.subscription_id)
    .single()

  const octokit = await getOctokit(conn.github_installation_id)

  await octokit.rest.pulls.merge({
    owner: conn.github_repo_owner,
    repo: conn.github_repo_name,
    pull_number: run.pr_number,
    merge_method: 'squash'
  })

  await supabase.from('agent_runs').update({ status: 'deployed' }).eq('id', runId)

  await sendMessage(
    chatId,
    `✅ *PR merged!* Vercel is deploying the change now.\n\n_The agent will track impact and update your Business DNA once A/B data comes in._`
  )
}

// ─── REJECT ─────────────────────────────────────────────────────────────────
async function handleReject(runId, chatId) {
  const { data: run } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (!run) return sendMessage(chatId, '❌ Run not found.')
  if (run.status !== 'waiting_approval')
    return sendMessage(chatId, '⚠️ This run is no longer waiting for approval.')

  await supabase.from('agent_runs').update({ status: 'rejected' }).eq('id', runId)

  await sendMessage(
    chatId,
    `❌ *PR rejected.* The agent will analyze again on the next scheduled run.\n\n_Optionally add context: *note ${runId} <reason>*_`
  )
}

// ─── BUSINESS DNA ─────────────────────────────────────────────────────────────
async function handleDNA(chatId) {
  const { data: sub } = await supabase
    .from('agent_subscriptions')
    .select('id')
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!sub) return sendMessage(chatId, '❌ No active subscription found.')

  const { data: learnings } = await supabase
    .from('agent_learnings')
    .select('*')
    .eq('subscription_id', sub.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!learnings || learnings.length === 0) {
    return sendMessage(
      chatId,
      `🧬 *Business DNA*\n\nNo learnings yet. DNA builds up after approved changes and A/B test results.`
    )
  }

  const wins = learnings.filter(l => l.outcome === 'positive')
  const losses = learnings.filter(l => l.outcome === 'negative')
  const fmtDelta = d => (d > 0 ? `+${d}%` : `${d}%`)

  const winsText = wins.length
    ? wins.map(l => `✅ ${l.change_type}: ${l.summary} (${fmtDelta(l.delta)} ${l.metric_type})`).join('\n')
    : '_None yet_'

  const lossesText = losses.length
    ? losses.map(l => `❌ ${l.change_type}: ${l.summary} (${fmtDelta(l.delta)} ${l.metric_type})`).join('\n')
    : '_None yet_'

  await sendMessage(
    chatId,
    `🧬 *Business DNA* (${learnings.length} learnings)\n\n*What worked:*\n${winsText}\n\n*What didn't work:*\n${lossesText}`
  )
}

// ─── STATUS ──────────────────────────────────────────────────────────────────
async function handleStatus(chatId) {
  const { data: sub } = await supabase
    .from('agent_subscriptions')
    .select('id')
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!sub) return sendMessage(chatId, '❌ No active subscription found.')

  const { data: runs } = await supabase
    .from('agent_runs')
    .select('id, status, pr_url, created_at')
    .eq('subscription_id', sub.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const statusEmoji = {
    pending: '⏳', running: '🔄', waiting_approval: '⏸',
    approved: '✅', rejected: '❌', deployed: '🚀', failed: '💥'
  }

  const lines = runs?.map(r => {
    const emoji = statusEmoji[r.status] ?? '❓'
    const date = new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    const prLink = r.pr_url ? ` — [PR](${r.pr_url})` : ''
    return `${emoji} \`${r.id.slice(0, 8)}\` ${r.status.replace('_', ' ')} (${date})${prLink}`
  }) ?? []

  const { data: abTests } = await supabase
    .from('agent_ab_tests')
    .select('summary, status, winner, delta_pct, evaluate_after')
    .eq('subscription_id', sub.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const abLines = abTests?.map(t => {
    const evalDate = new Date(t.evaluate_after).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    if (t.status === 'completed') {
      return `📊 ${t.summary} → ${t.winner === 'treatment' ? `✅ +${t.delta_pct}%` : `❌ ${t.delta_pct}%`}`
    }
    return `🔬 ${t.summary} — results on ${evalDate}`
  }) ?? []

  let msg = `📊 *Velyr Agent Status*\n\n*Last 5 runs:*\n${lines.join('\n') || '_No runs yet_'}`
  if (abLines.length) msg += `\n\n*A/B Tests:*\n${abLines.join('\n')}`

  await sendMessage(chatId, msg)
}

// ─── NOTE (manual learning) ──────────────────────────────────────────────────
async function handleNote(runId, reason, chatId) {
  const { data: run } = await supabase
    .from('agent_runs')
    .select('subscription_id, analysis_result')
    .eq('id', runId)
    .single()

  if (!run) return sendMessage(chatId, '❌ Run not found.')

  await supabase.from('agent_learnings').insert({
    subscription_id: run.subscription_id,
    run_id: runId,
    change_type: run.analysis_result?.change_type || 'other',
    summary: reason,
    outcome: 'negative',
    metric_type: 'manual',
    delta: 0,
    confidence: 'low'
  })

  await sendMessage(chatId, `🧬 *Note saved to Business DNA.*\n_"${reason}"_\n\nThe agent will factor this in on the next run.`)
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    const body = req.body
    if (!body) return res.json({ ok: true })

    const message = body.message
    if (!message || !message.text) return res.json({ ok: true })

    const chatId = message.chat.id
    const text = message.text.trim()
    const parts = text.split(' ')
    const cmd = parts[0].toLowerCase()

    if (cmd === 'approve' && parts.length === 2) {
      await handleApprove(parts[1], chatId)

    } else if (cmd === 'reject' && parts.length === 2) {
      await handleReject(parts[1], chatId)

    } else if (cmd === 'dna') {
      await handleDNA(chatId)

    } else if (cmd === 'status') {
      await handleStatus(chatId)

    } else if (cmd === 'note' && parts.length >= 3) {
      await handleNote(parts[1], parts.slice(2).join(' '), chatId)

    } else {
      await sendMessage(
        chatId,
        `🤖 *Velyr Growth Agent*\n\n` +
        `*Commands:*\n` +
        `*approve <run-id>* — merge & deploy the PR\n` +
        `*reject <run-id>* — skip this change\n` +
        `*note <run-id> <reason>* — add a manual learning\n` +
        `*dna* — view your Business DNA\n` +
        `*status* — last runs & A/B tests`
      )
    }

    res.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    res.status(500).json({ error: error.message })
  }
}