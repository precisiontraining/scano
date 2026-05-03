import { createClient } from '@supabase/supabase-js'
import { App } from '@octokit/app'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function analyzeRepo(octokit, owner, repo) {
  // Liest die wichtigsten Dateien aus dem Repo
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
      // Datei existiert nicht, skip
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
        content: `Du bist ein Web-Optimierungs-Experte. Analysiere diesen Website-Code und identifiziere das EINE wichtigste Problem das Conversions kostet.

Code:
${JSON.stringify(repoContent, null, 2)}

Antworte NUR als JSON:
{
  "problem": "kurze Beschreibung des Problems",
  "impact": "warum das Conversions kostet",
  "solution": "was geändert werden soll",
  "expected_improvement": "geschätzte Verbesserung in %",
  "file_to_edit": "welche Datei",
  "code_change": {
    "find": "exakter Text der ersetzt wird",
    "replace": "neuer Text"
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
  // Branch erstellen
  const { data: ref } = await octokit.rest.git.getRef({
    owner, repo, ref: 'heads/main'
  })
  
  const branchName = `agent/fix-${Date.now()}`
  await octokit.rest.git.createRef({
    owner, repo,
    ref: `refs/heads/${branchName}`,
    sha: ref.object.sha
  })

  // Datei lesen und ändern
  const { data: fileData } = await octokit.rest.repos.getContent({
    owner, repo, path: analysis.file_to_edit
  })
  
  const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8')
  const newContent = currentContent.replace(
    analysis.code_change.find,
    analysis.code_change.replace
  )

  // Datei pushen
  await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo,
    path: analysis.file_to_edit,
    message: `fix: ${analysis.problem}`,
    content: Buffer.from(newContent).toString('base64'),
    sha: fileData.sha,
    branch: branchName
  })

  // PR erstellen
  const { data: pr } = await octokit.rest.pulls.create({
    owner, repo,
    title: `🤖 Agent: ${analysis.problem}`,
    body: `## Problem\n${analysis.problem}\n\n## Warum das wichtig ist\n${analysis.impact}\n\n## Lösung\n${analysis.solution}\n\n## Erwartete Verbesserung\n${analysis.expected_improvement}`,
    head: branchName,
    base: 'main'
  })

  return pr
}

async function sendTelegramNotification(analysis, pr, runId) {
  const approvalToken = Buffer.from(JSON.stringify({
    runId, prNumber: pr.number, action: 'approve'
  })).toString('base64')
  
  const rejectToken = Buffer.from(JSON.stringify({
    runId, prNumber: pr.number, action: 'reject'
  })).toString('base64')

  const message = `🤖 *Scano Growth Agent*

🔍 *Problem erkannt:*
${analysis.problem}

💥 *Impact:*
${analysis.impact}

✅ *Lösung:*
${analysis.solution}

📈 *Erwartete Verbesserung:* ${analysis.expected_improvement}

🔗 [PR ansehen](${pr.html_url})

Soll ich den PR mergen?`

  const keyboard = {
    inline_keyboard: [[
      { text: '✅ Approve & Merge', callback_data: `approve_${approvalToken}` },
      { text: '❌ Ablehnen', callback_data: `reject_${rejectToken}` }
    ]]
  }

  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      })
    }
  )
  
  const data = await response.json()
  return data.result.message_id
}

export default async function handler(req, res) {
  // Cron-Auth
  if (req.headers['x-cron-secret'] !== process.env.AGENT_CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Aktive Subscriptions + Connections laden
    const { data: connections } = await supabase
      .from('agent_connections')
      .select('*, agent_subscriptions!inner(*)')
      .eq('agent_subscriptions.status', 'active')

    for (const conn of connections) {
      // Agent Run erstellen
      const { data: run } = await supabase
        .from('agent_runs')
        .insert({
          subscription_id: conn.subscription_id,
          status: 'running'
        })
        .select()
        .single()

      // GitHub App initialisieren
      const app = new App({
        appId: process.env.GITHUB_APP_ID,
        privateKey: Buffer.from(
          process.env.GITHUB_APP_PRIVATE_KEY_BASE64, 'base64'
        ).toString('utf-8')
      })

      const octokit = await app.getInstallationOctokit(conn.github_installation_id)

      // Repo analysieren
      const repoContent = await analyzeRepo(
        octokit, conn.github_repo_owner, conn.github_repo_name
      )

      // KI-Analyse
      const analysis = await callAI(repoContent)

      // PR erstellen
      const pr = await createPR(
        octokit, conn.github_repo_owner, conn.github_repo_name, analysis
      )

      // Telegram Notification
      const messageId = await sendTelegramNotification(analysis, pr, run.id)

      // Run updaten
      await supabase.from('agent_runs').update({
        status: 'waiting_approval',
        analysis_result: analysis,
        pr_number: pr.number,
        pr_url: pr.html_url,
        telegram_message_id: messageId
      }).eq('id', run.id)
    }

    res.json({ success: true, processed: connections.length })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}