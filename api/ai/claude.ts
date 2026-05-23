import type { VercelRequest, VercelResponse } from '@vercel/node'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

// Origin allow-list — first line of defense. Spoofable via curl but stops casual browser attacks.
const ALLOWED_ORIGINS = new Set([
  'https://stridewithme.club',
  'https://www.stridewithme.club',
  'https://stridewithme.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
])

// Only these models can be called. Prevents an attacker from requesting an arbitrary expensive model.
const ALLOWED_MODELS = new Set([
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
])

// Hard ceiling on tokens per call regardless of what client requests. Caps worst-case cost-per-call.
const MAX_TOKENS_CEILING = 12000

// Body size cap — defends against bulk image abuse.
const MAX_BODY_BYTES = 4 * 1024 * 1024 // 4MB

// Best-effort in-memory rate limit. Doesn't persist across cold starts (each Vercel function instance
// has its own Map) but slows down sustained per-IP abuse meaningfully. For real production protection,
// wire up Upstash Redis or Vercel KV. Marked as TODO.
const ipHits = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 20            // 20 requests/min per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  ipHits.set(ip, recent)
  return recent.length > RATE_LIMIT_MAX
}

function getClientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  return (req.headers['x-real-ip'] as string) ?? 'unknown'
}

export const config = {
  maxDuration: 60, // Sonnet narrative can take ~6-10s; give headroom
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) ?? ''
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Origin check (browser-side defense — spoofable but catches the lazy attacks)
  const referer = (req.headers.referer as string) ?? ''
  const isAllowed = ALLOWED_ORIGINS.has(origin) || [...ALLOWED_ORIGINS].some((o) => referer.startsWith(o))
  if (!isAllowed) {
    console.warn('[ai/claude] rejected non-allowed origin:', origin, 'referer:', referer)
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Per-IP rate limit (best-effort, in-memory)
  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    console.warn('[ai/claude] rate-limited IP:', ip.slice(0, 8) + '…')
    return res.status(429).json({ error: 'Too many requests — slow down' })
  }

  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) {
    console.error('[ai/claude] CLAUDE_API_KEY missing on server')
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  // Body shape validation
  const { model, max_tokens, messages } = req.body ?? {}
  if (!model || !max_tokens || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  // Model allow-list — reject anything not on the cheap-or-needed list
  if (!ALLOWED_MODELS.has(model)) {
    console.warn('[ai/claude] rejected disallowed model:', model)
    return res.status(400).json({ error: 'Model not allowed' })
  }

  // Clamp max_tokens server-side so client cannot inflate
  const cappedMaxTokens = Math.min(typeof max_tokens === 'number' ? max_tokens : 2048, MAX_TOKENS_CEILING)

  // Body size check (raw JSON length is a reasonable proxy)
  const bodySize = JSON.stringify(req.body).length
  if (bodySize > MAX_BODY_BYTES) {
    console.warn('[ai/claude] rejected oversized body:', bodySize)
    return res.status(413).json({ error: 'Request body too large' })
  }

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: cappedMaxTokens, messages }),
    })

    const body = await upstream.text()
    // Lightweight observability for abuse pattern detection
    console.log('[ai/claude] ok', JSON.stringify({ model, max_tokens: cappedMaxTokens, bodyKB: Math.round(bodySize / 1024), ip: ip.slice(0, 8), status: upstream.status }))
    res.status(upstream.status).setHeader('Content-Type', 'application/json').send(body)
  } catch (err) {
    console.error('[ai/claude] upstream error:', err)
    res.status(502).json({ error: 'Upstream call failed' })
  }
}
