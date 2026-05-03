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

async function handleApprove(runId, chatId) {
  const { data: run } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (!run) return sendMessage(chatId, '❌ Run not found.')
  if (run.status !== 'waiting_approval') return sendMessage(chatId, '⚠️ This run is no longer waiting for approval.')

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

  await sendMessage(chatId, '✅ PR merged! Vercel is deploying the change now.')
}

async function handleReject(runId, chatId) {
  const { data: run } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (!run) return sendMessage(chatId, '❌ Run not found.')
  if (run.status !== 'waiting_approval') return sendMessage(chatId, '⚠️ This run is no longer waiting for approval.')

  await supabase.from('agent_runs').update({ status: 'rejected' }).eq('id', runId)

  await sendMessage(chatId, '❌ PR rejected. The agent will analyze again on the next run.')
}

export default async function handler(req, res) {
  try {
    const body = req.body
    if (!body) return res.json({ ok: true })

    const message = body.message
    if (!message || !message.text) return res.json({ ok: true })

    const chatId = message.chat.id
    const text = message.text.trim().toLowerCase()
    const parts = text.split(' ')

    if (parts.length === 2 && (parts[0] === 'approve' || parts[0] === 'reject')) {
      const action = parts[0]
      const runId = parts[1]

      if (action === 'approve') {
        await handleApprove(runId, chatId)
      } else {
        await handleReject(runId, chatId)
      }
    } else {
      await sendMessage(chatId, `🤖 *Scano Growth Agent*\n\nCommands:\n*approve <run-id>* - Merge the PR\n*reject <run-id>* - Reject the PR`)
    }

    res.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    res.status(500).json({ error: error.message })
  }
}