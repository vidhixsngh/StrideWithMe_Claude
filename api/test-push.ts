import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:reminders@stridewithme.app'
const APP_URL = process.env.APP_URL ?? 'https://stridewithme.app'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Supabase env missing' })
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return res.status(500).json({ error: 'VAPID env missing — push will not work. Set VITE_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing Authorization header' })
  const accessToken = authHeader.slice(7)

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // Verify the user from the access token
  const { data: userResp, error: userErr } = await supabase.auth.getUser(accessToken)
  if (userErr || !userResp?.user) return res.status(401).json({ error: 'Invalid auth token', detail: userErr?.message })
  const userId = userResp.user.id

  // Pull subscriptions for this user
  const { data: subs, error: subsErr } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (subsErr) return res.status(500).json({ error: 'subs query failed', detail: subsErr.message })
  if (!subs || subs.length === 0) return res.status(400).json({ error: 'No push subscriptions saved for this user. Migration may not have run, or the browser refused to subscribe.' })

  const results: Array<{ endpoint: string; ok: boolean; status?: number; error?: string }> = []
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({
          title: 'StrideWithMe — test push',
          body: 'If you see this, your push pipeline works.',
          url: `${APP_URL}/log`,
        })
      )
      results.push({ endpoint: s.endpoint.slice(0, 60) + '…', ok: true })
    } catch (e) {
      const err = e as { statusCode?: number; body?: string }
      results.push({ endpoint: s.endpoint.slice(0, 60) + '…', ok: false, status: err.statusCode, error: err.body })
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', s.id)
      }
    }
  }

  return res.status(200).json({ subscriptions: subs.length, results })
}
