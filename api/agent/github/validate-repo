import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { installationId, repoOwner, repoName } = req.body

  if (!installationId || !repoOwner || !repoName) {
    return res.status(400).json({ valid: false, message: 'Missing installationId, repoOwner, or repoName.' })
  }

  try {
    const auth = createAppAuth({
      appId:         process.env.GITHUB_APP_ID,
      privateKey:    Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY_BASE64, 'base64').toString('utf8'),
      installationId: parseInt(installationId),
    })

    const { token } = await auth({ type: 'installation' })
    const octokit = new Octokit({ auth: token })

    await octokit.repos.get({ owner: repoOwner, repo: repoName })

    return res.status(200).json({ valid: true })
  } catch (err) {
    console.error('validate-repo error:', err.message)

    let message = 'Could not access this repository. Check your details and try again.'
    if (err.status === 404) message = 'Repository not found. Check the owner name, repo name, and installation ID.'
    if (err.status === 401) message = 'GitHub App authentication failed. Contact support.'

    return res.status(200).json({ valid: false, message })
  }
}