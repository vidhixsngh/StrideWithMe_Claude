import type { VercelRequest, VercelResponse } from '@vercel/node'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

// Allowed origins for the proxy. Anything else is rejected to prevent unauthorized use of our key.
const ALLOWED_ORIGINS = new Set([
  'https://stridewithme.club',
  'https://www.stridewithme.club',
  'https://stridewithme.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
])

export const config = {
  maxDuration: 60, // Sonnet narrative can take ~6-10s; give plenty of headroom
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS (allowed origins only)
  const origin = (req.headers.origin as string) ?? ''
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Reject anyone calling from outside our allow-list (origin OR referer for safety).
  // Server-to-server calls don't send origin — those are fine to keep blocked for now.
  const referer = (req.headers.referer as string) ?? ''
  const isAllowed = ALLOWED_ORIGINS.has(origin) || [...ALLOWED_ORIGINS].some((o) => referer.startsWith(o))
  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    console.error('[ai/claude] CLAUDE_API_KEY missing on server')
    return res.status(500).json({ error: 'Server misconfigured: API key not set' })
  }

  // Validate body shape: { model, max_tokens, messages }
  const { model, max_tokens, messages } = req.body ?? {}
  if (!model || !max_tokens || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body — expected { model, max_tokens, messages }' })
  }

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens, messages }),
    })

    const body = await upstream.text()
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(body)
  } catch (err) {
    console.error('[ai/claude] upstream error:', err)
    res.status(502).json({ error: 'Upstream Anthropic call failed' })
  }
}
