import freeHandler from './_scan-free.js'
import premiumHandler from './_scan-premium.js'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const type = req.query?.type || req.body?.type
  if (type === 'premium') return premiumHandler(req, res)
  return freeHandler(req, res)
}
