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

export default async function handler(req, res) {
  const { callback_query } = req.body
  if (!callback_query) return res.json({ ok: true })

  const { data: callbackData, id: callbackId } = callback_query
  const underscoreIndex = callbackData.indexOf('_')
  const action = callbackData.substring(0, underscoreIndex)
  const token = callbackData.substring(underscoreIndex + 1)

  const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
  const { runId, prNumber } = payload

  const { data: run } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .single()

  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId })
  })

  if (action === 'approve') {
    const { data: conn } = await supabase
      .from('agent_connections')
      .select('*')
      .eq('subscription_id', run.subscription_id)
      .single()

    const octokit = await getOctokit(conn.github_installation_id)

    await octokit.rest.pulls.merge({
      owner: conn.github_repo_owner,
      repo: conn.github_repo_name,
      pull_number: prNumber,
      merge_method: 'squash'
    })

    await supabase.from('agent_runs').update({ status: 'deployed' }).eq('id', runId)

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: callback_query.message.chat.id,
        message_id: callback_query.message.message_id,
        reply_markup: { inline_keyboard: [] }
      })
    })

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: callback_query.message.chat.id,
        text: '✅ PR merged! Vercel is deploying the change now.'
      })
    })

  } else {
    await supabase.from('agent_runs').update({ status: 'rejected' }).eq('id', runId)

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: callback_query.message.chat.id,
        text: '❌ PR rejected. The agent will analyze again on the next run.'
      })
    })
  }

  res.json({ ok: true })
}