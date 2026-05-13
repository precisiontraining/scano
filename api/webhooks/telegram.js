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

async function sendMessage(chatId, text, extra = {}) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', ...extra })
  })
}

async function getActiveSubId(chatId) {
  const { data } = await supabase
    .from('agent_connections')
    .select('subscription_id, agent_subscriptions!inner(subscription_status, status)')
    .eq('telegram_chat_id', chatId)
    .eq('agent_subscriptions.subscription_status', 'active')
    .eq('agent_subscriptions.status', 'active')
    .single()
  return data?.subscription_id ?? null
}

async function notifyInactive(chatId) {
  await sendMessage(chatId, 'Your Velyr subscription is no longer active. Visit velyr.io to reactivate.')
}

// ─── HELPER: Generate unique verification code ────────────────────────────────
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I)
  let code = 'VELYR-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ─── /start — Onboarding verification ────────────────────────────────────────
async function handleStart(message) {
  const chatId = message.chat.id
  const username = message.from?.username || null
  const firstName = message.from?.first_name || 'there'

  // Delete any old unused codes for this chat_id
  await supabase
    .from('telegram_verification_codes')
    .delete()
    .eq('chat_id', chatId)
    .eq('used', false)

  // Generate a new unique code
  let code
  let attempts = 0
  while (attempts < 10) {
    const candidate = generateCode()
    const { data: existing } = await supabase
      .from('telegram_verification_codes')
      .select('id')
      .eq('code', candidate)
      .single()
    if (!existing) { code = candidate; break }
    attempts++
  }

  if (!code) {
    return sendMessage(chatId, '❌ Something went wrong generating your code. Please try again.')
  }

  // Save code to DB — include expires_at so the frontend query works
  await supabase.from('telegram_verification_codes').insert({
    code,
    chat_id: chatId,
    telegram_username: username,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // ✅ 30 min TTL
  })

  await sendMessage(
    chatId,
    `👋 *Hi ${firstName}!*\n\n` +
    `Welcome to *Velyr Growth Agent*.\n\n` +
    `Your verification code is:\n\n` +
    `\`${code}\`\n\n` +
    `Copy this code and paste it into the setup wizard on velyr.io to connect your Telegram.\n\n` +
    `_This code expires in 30 minutes._`
  )
}

// ─── FIND LATEST PENDING RUN FOR CHAT ────────────────────────────────────────
// Used by the simple YES/NO flow — locates the most recent waiting_approval run
// belonging to the subscription that owns this Telegram chat.
async function findPendingRunForChat(chatId) {
  const subscriptionId = await getActiveSubId(chatId)
  if (!subscriptionId) return null

  const { data: run } = await supabase
    .from('agent_runs')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'waiting_approval')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return run?.id || null
}

// ─── APPROVE ────────────────────────────────────────────────────────────────
async function handleApprove(runId, chatId) {
  const subscriptionId = await getActiveSubId(chatId)
  if (!subscriptionId) return notifyInactive(chatId)

  const { data: run } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .eq('subscription_id', subscriptionId)
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

  await supabase.from('agent_runs').update({ status: 'deployed', completed_at: new Date().toISOString() }).eq('id', runId)

  // 3d: Business DNA — record as 'pending'; the 48h rollback check will promote to 'success' after 7 days deployed
  await supabase.from('agent_business_dna').insert({
    subscription_id: run.subscription_id, run_id: runId,
    fix_type: run.analysis_result?.change_type || 'other',
    outcome: 'pending',
    notes: `Approved (YES): ${(run.analysis_result?.problem || '').slice(0, 400)}`,
  })

  await sendMessage(
    chatId,
    `✅ *PR merged!* Vercel is deploying the change now.\n\n_The agent will check impact after 48h and auto-rollback if metrics drop._`
  )
}

// ─── REJECT ─────────────────────────────────────────────────────────────────
async function handleReject(runId, chatId) {
  const subscriptionId = await getActiveSubId(chatId)
  if (!subscriptionId) return notifyInactive(chatId)

  const { data: run } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .eq('subscription_id', subscriptionId)
    .single()

  if (!run) return sendMessage(chatId, '❌ Run not found.')
  if (run.status !== 'waiting_approval')
    return sendMessage(chatId, '⚠️ This run is no longer waiting for approval.')

  await supabase.from('agent_runs').update({
    status: 'rejected',
    rollback_reason: 'user_rejected',
  }).eq('id', runId)

  // 3d: Business DNA — record rollback so future runs avoid the pattern
  await supabase.from('agent_business_dna').insert({
    subscription_id: run.subscription_id, run_id: runId,
    fix_type: run.analysis_result?.change_type || 'other',
    outcome: 'rollback',
    notes: `User rejected (NO): ${(run.analysis_result?.problem || '').slice(0, 400)}`,
  })

  await sendMessage(
    chatId,
    `❌ *PR skipped.* The agent will analyze again on the next scheduled run.\n\n_Optionally add context: *note ${runId} <reason>*_`
  )
}

// ─── BUSINESS DNA ─────────────────────────────────────────────────────────────
async function handleDNA(chatId) {
  const subId = await getActiveSubId(chatId)
  if (!subId) return notifyInactive(chatId)

  const { data: learnings } = await supabase
    .from('agent_learnings')
    .select('*')
    .eq('subscription_id', subId)
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
  const subId = await getActiveSubId(chatId)
  if (!subId) return notifyInactive(chatId)

  const { data: runs } = await supabase
    .from('agent_runs')
    .select('id, status, pr_url, created_at')
    .eq('subscription_id', subId)
    .order('created_at', { ascending: false })
    .limit(5)

  const statusEmoji = {
    pending: '⏳', running: '🔄', waiting_approval: '⏸',
    approved: '✅', rejected: '❌', deployed: '🚀', failed: '💥', rolled_back: '🔄'
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
    .eq('subscription_id', subId)
    .order('created_at', { ascending: false })
    .limit(3)

  const abLines = abTests?.map(t => {
    const evalDate = new Date(t.evaluate_after).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    if (t.status === 'completed') {
      return `📊 ${t.summary} → ${t.winner === 'treatment' ? `✅ +${t.delta_pct}%` : `❌ ${t.delta_pct}%`}`
    }
    return `🔬 ${t.summary} — results on ${evalDate}`
  }) ?? []

  const { data: competitors } = await supabase
    .from('agent_competitor_urls')
    .select('url, active')
    .eq('subscription_id', subId)
    .limit(5)

  const competitorLines = competitors?.map(c =>
    `${c.active ? '🟢' : '⚫'} ${c.url}`
  ) ?? []

  let msg = `📊 *Velyr Agent Status*\n\n*Last 5 runs:*\n${lines.join('\n') || '_No runs yet_'}`
  if (abLines.length) msg += `\n\n*A/B Tests:*\n${abLines.join('\n')}`
  if (competitorLines.length) msg += `\n\n*Tracked Competitors:*\n${competitorLines.join('\n')}`

  await sendMessage(chatId, msg)
}

// ─── NOTE ─────────────────────────────────────────────────────────────────────
async function handleNote(runId, reason, chatId) {
  const subId = await getActiveSubId(chatId)
  if (!subId) return notifyInactive(chatId)

  const { data: run } = await supabase
    .from('agent_runs')
    .select('subscription_id, analysis_result')
    .eq('id', runId)
    .eq('subscription_id', subId)
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

// ─── COMPETITOR ───────────────────────────────────────────────────────────────
async function handleAddCompetitor(url, chatId) {
  const subId = await getActiveSubId(chatId)
  if (!subId) return notifyInactive(chatId)

  try { new URL(url) } catch {
    return sendMessage(chatId, `❌ Invalid URL: \`${url}\`\n\nUsage: *competitor add https://example.com*`)
  }

  const { data: existing } = await supabase
    .from('agent_competitor_urls')
    .select('id')
    .eq('subscription_id', subId)
    .eq('active', true)

  if (existing && existing.length >= 2) {
    return sendMessage(chatId, `⚠️ You already have 2 competitors tracked (maximum).\n\nRemove one first: *competitor remove <url>*`)
  }

  await supabase.from('agent_competitor_urls').upsert({
    subscription_id: subId,
    url,
    active: true,
  }, { onConflict: 'subscription_id,url' })

  await sendMessage(chatId, `✅ *Competitor added:* \`${url}\`\n\nThe agent will scan this site on every Monday run and suggest differentiation opportunities.`)
}

async function handleRemoveCompetitor(url, chatId) {
  const subId = await getActiveSubId(chatId)
  if (!subId) return notifyInactive(chatId)

  await supabase
    .from('agent_competitor_urls')
    .update({ active: false })
    .eq('subscription_id', subId)
    .ilike('url', `%${url}%`)

  await sendMessage(chatId, `🗑️ *Competitor removed.* The agent will no longer scan that URL.`)
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
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

    // /start — always respond, no auth needed
    if (cmd === '/start' || cmd === 'start') {
      await handleStart(message)

    } else if ((cmd === 'yes' || cmd === 'y' || cmd === '✅') && parts.length === 1) {
      const runId = await findPendingRunForChat(chatId)
      if (!runId) await sendMessage(chatId, '⚠️ No pending approval found. The agent will message you when the next run is ready.')
      else        await handleApprove(runId, chatId)

    } else if ((cmd === 'no' || cmd === 'n' || cmd === '❌') && parts.length === 1) {
      const runId = await findPendingRunForChat(chatId)
      if (!runId) await sendMessage(chatId, '⚠️ No pending approval found.')
      else        await handleReject(runId, chatId)

    } else if (cmd === 'approve' && parts.length === 2) {
      await handleApprove(parts[1], chatId)

    } else if (cmd === 'reject' && parts.length === 2) {
      await handleReject(parts[1], chatId)

    } else if (cmd === 'dna') {
      await handleDNA(chatId)

    } else if (cmd === 'status') {
      await handleStatus(chatId)

    } else if (cmd === 'note' && parts.length >= 3) {
      await handleNote(parts[1], parts.slice(2).join(' '), chatId)

    } else if (cmd === 'competitor' && parts.length >= 3) {
      const subCmd = parts[1].toLowerCase()
      const url = parts[2]
      if (subCmd === 'add') {
        await handleAddCompetitor(url, chatId)
      } else if (subCmd === 'remove') {
        await handleRemoveCompetitor(url, chatId)
      } else {
        await sendMessage(chatId, `❓ Unknown competitor command.\n\n*competitor add <url>* — track a competitor\n*competitor remove <url>* — stop tracking`)
      }

    } else {
      await sendMessage(
        chatId,
        `🤖 *Velyr Growth Agent*\n\n` +
        `*Commands:*\n` +
        `*YES* — deploy the pending PR\n` +
        `*NO* — skip the pending PR\n` +
        `*approve <run-id>* — deploy a specific run (power users)\n` +
        `*reject <run-id>* — skip a specific run (power users)\n` +
        `*note <run-id> <reason>* — add a manual learning\n` +
        `*dna* — view your Business DNA\n` +
        `*status* — last runs, A/B tests & competitors\n` +
        `*competitor add <url>* — track a competitor site\n` +
        `*competitor remove <url>* — stop tracking`
      )
    }

    res.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    res.status(500).json({ error: error.message })
  }
}