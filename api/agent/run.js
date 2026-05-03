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
    'src/main.jsx', 'src/main.tsx'
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

async function callAI(repoContent) {
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
        content: `You are a web conversion optimization expert. Analyze this website code and identify the ONE most important problem hurting conversions.

IMPORTANT - Do NOT suggest changes to:
- The /premium route (intentionally disabled for now)
- Payment or Stripe integration (not yet active)
- Any feature that is intentionally commented out
- Authentication or login flows
- Focus only on: copy, UX, performance, SEO, CTAs, layout, and design issues

Code:
${JSON.stringify(repoContent, null, 2)}

Reply ONLY as JSON without Markdown:
{
  "problem": "short description of the problem",
  "impact": "why this is hurting conversions",
  "solution": "what should be changed",
  "expected_improvement": "estimated improvement in %",
  "file_to_edit": "which file to edit",
  "code_change": {
    "find": "exact text to be replaced",
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
    body: `## Problem\n${analysis.problem}\n\n## Why this matters\n${analysis.impact}\n\n## Solution\n${analysis.solution}\n\n## Expected Improvement\n${analysis.expected_improvement}`,
    head: branchName,
    base: 'main'
  })

  return pr
}

async function sendTelegramNotification(analysis, pr, runId) {
  const message = `🤖 *Scano Growth Agent*

🔍 *Problem found:*
${analysis.problem}

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
  if (req.headers['x-cron-secret'] !== process.env.AGENT_CRON_SECRET) {
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

      const repoContent = await analyzeRepo(
        octokit, conn.github_repo_owner, conn.github_repo_name
      )

      const analysis = await callAI(repoContent)

      const pr = await createPR(
        octokit, conn.github_repo_owner, conn.github_repo_name, analysis
      )

      const messageId = await sendTelegramNotification(analysis, pr, run.id)

      await supabase.from('agent_runs').update({
        status: 'waiting_approval',
        analysis_result: analysis,
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