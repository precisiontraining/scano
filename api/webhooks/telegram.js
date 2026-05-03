import { createClient } from '@supabase/supabase-js'
import { App } from '@octokit/app'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { callback_query } = req.body
  if (!callback_query) return res.json({ ok: true })

  const { data: callbackData, id: callbackId } = callback_query
  const [action, token] = callbackData.split('_')
  
  const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
  const { runId, prNumber } = payload

  // Run laden
  const { data: run } = await supabase
    .from('agent_runs')
    .select('*, agent_connections(*)')
    .eq('id', runId)
    .single()

  // Callback sofort bestätigen
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId })
  })

  if (action === 'approve') {
    // GitHub App + PR mergen
    const app = new App({
      appId: process.env.GITHUB_APP_ID,
      privateKey: Buffer.from(
        process.env.GITHUB_APP_PRIVATE_KEY_BASE64, 'base64'
      ).toString('utf-8')
    })

    const { data: conn } = await supabase
      .from('agent_connections')
      .select('*')
      .eq('subscription_id', run.subscription_id)
      .single()

    const octokit = await app.getInstallationOctokit(conn.github_installation_id)

    await octokit.rest.pulls.merge({
      owner: conn.github_repo_owner,
      repo: conn.github_repo_name,
      pull_number: prNumber,
      merge_method: 'squash'
    })

    await supabase.from('agent_runs').update({ status: 'deployed' }).eq('id', runId)

    // Telegram Update
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
        text: '✅ PR wurde gemergt! Vercel deployed gerade die Änderung.'
      })
    })

  } else {
    // Ablehnen
    await supabase.from('agent_runs').update({ status: 'rejected' }).eq('id', runId)
    
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: callback_query.message.chat.id,
        text: '❌ PR abgelehnt. Beim nächsten Run analysiert der Agent erneut.'
      })
    })
  }

  res.json({ ok: true })
}