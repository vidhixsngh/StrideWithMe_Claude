import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const APP_URL = process.env.APP_URL ?? 'https://stridewithme.app'
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? 'reminders@stridewithme.app'
const SENDER_NAME = process.env.BREVO_SENDER_NAME ?? 'StrideWithMe'
const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:reminders@stridewithme.app'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

function getLocalDateAndTime(timezone: string): { date: string; minutes: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date())
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  const date = `${get('year')}-${get('month')}-${get('day')}`
  const hour = parseInt(get('hour'), 10)
  const minute = parseInt(get('minute'), 10)
  return { date, minutes: hour * 60 + minute }
}

async function sendBrevoEmail(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Brevo ${res.status}: ${text}`)
  }
  return res.json()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const brevoKey = process.env.BREVO_API_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase env not configured' })
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn('[reminder] VAPID keys missing — push will be skipped, only email path will run')
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, display_name, reminder_time, reminder_timezone')
    .eq('reminder_enabled', true)
    .not('reminder_time', 'is', null)

  if (profErr) return res.status(500).json({ error: profErr.message })
  if (!profiles || profiles.length === 0) return res.status(200).json({ checked: 0, push: 0, email: 0 })

  const WINDOW_MIN = 32
  let pushSent = 0
  let emailSent = 0
  const skipped: string[] = []

  for (const p of profiles) {
    const tz = p.reminder_timezone ?? 'UTC'
    const { date: localDate, minutes: nowMin } = getLocalDateAndTime(tz)
    const [rh, rm] = (p.reminder_time as string).split(':').map(Number)
    const reminderMin = rh * 60 + rm

    const diff = Math.abs(nowMin - reminderMin)
    const wrappedDiff = Math.min(diff, 1440 - diff)
    if (wrappedDiff > WINDOW_MIN) { skipped.push(`${p.id}:out-of-window`); continue }

    const { data: sprints } = await supabase
      .from('sprints')
      .select('id, goal_text, start_date, sprint_length')
      .eq('user_id', p.id)
      .eq('status', 'ACTIVE')
      .gte('end_date', localDate)
      .order('created_at', { ascending: false })
      .limit(1)

    const sprint = sprints?.[0]
    if (!sprint) { skipped.push(`${p.id}:no-sprint`); continue }

    const start = new Date(sprint.start_date + 'T00:00:00Z')
    const today = new Date(localDate + 'T00:00:00Z')
    const dayNum = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1
    if (dayNum < 1 || dayNum > sprint.sprint_length) { skipped.push(`${p.id}:out-of-range`); continue }

    const { data: existingLog } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('sprint_id', sprint.id)
      .eq('user_id', p.id)
      .eq('day_number', dayNum)
      .maybeSingle()

    if (existingLog) { skipped.push(`${p.id}:already-logged`); continue }

    const name = p.display_name ?? 'Strider'
    const goal = sprint.goal_text
    const title = `Day ${dayNum} of your sprint`
    const body = `${name}, "${goal.length > 70 ? goal.slice(0, 67) + '…' : goal}" — log it before today ends 🌱`

    // Try push first
    let pushDelivered = false
    if (VAPID_PUBLIC && VAPID_PRIVATE) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', p.id)

      if (subs && subs.length > 0) {
        for (const s of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title, body, url: `${APP_URL}/log` })
            )
            pushDelivered = true
          } catch (e) {
            const err = e as { statusCode?: number; body?: string }
            console.error('[reminder] push failed', p.id, err.statusCode, err.body)
            // 404/410 = subscription gone, clean it up
            if (err.statusCode === 404 || err.statusCode === 410) {
              await supabase.from('push_subscriptions').delete().eq('id', s.id)
            }
          }
        }
      }
    }

    if (pushDelivered) { pushSent++; continue }

    // Fallback: email via Brevo (if configured)
    if (!brevoKey) { skipped.push(`${p.id}:no-push-no-email`); continue }

    const { data: userResult } = await supabase.auth.admin.getUserById(p.id)
    const email = userResult?.user?.email
    if (!email) { skipped.push(`${p.id}:no-email`); continue }

    const subject = `${title} — log it before today ends`
    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F5F0E8;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:480px;margin:0 auto;padding:32px 24px;background:#FFFFFF;border-radius:20px;">
  <div style="text-align:center;margin-bottom:20px;"><span style="font-size:32px;">🌱</span></div>
  <h1 style="font-family:Lora,Georgia,serif;font-size:22px;color:#1A3028;margin:0 0 12px;letter-spacing:-0.01em;">Hey ${name},</h1>
  <p style="color:#3D5949;font-size:14px;line-height:1.6;margin:0 0 16px;">You haven't logged <strong>Day ${dayNum}</strong> yet for:</p>
  <div style="background:#EAF5F0;border-left:3px solid #6BB048;border-radius:6px;padding:12px 14px;margin:0 0 18px;">
    <p style="font-family:Lora,Georgia,serif;font-style:italic;font-size:14px;color:#1A3028;margin:0;">"${goal}"</p>
  </div>
  <p style="color:#6B9E8A;font-size:13px;font-style:italic;line-height:1.6;margin:0 0 22px;">Honest day or verified day — both count. Just show up.</p>
  <div style="text-align:center;">
    <a href="${APP_URL}/log" style="display:inline-block;background:linear-gradient(180deg,#76C548,#6BB048);color:#FFFFFF;padding:14px 32px;border-radius:9999px;text-decoration:none;font-weight:500;font-size:14px;letter-spacing:0.02em;">Log Day ${dayNum} →</a>
  </div>
  <p style="color:#9BBFB2;font-size:11px;font-style:italic;text-align:center;margin:28px 0 0;">— StrideWithMe · Add the app to your home screen for instant push reminders</p>
</div></body></html>`

    try {
      await sendBrevoEmail(brevoKey, email, subject, html)
      emailSent++
    } catch (e) {
      console.error('[reminder] email failed', p.id, e)
      skipped.push(`${p.id}:email-failed`)
    }
  }

  return res.status(200).json({ checked: profiles.length, push: pushSent, email: emailSent, skipped })
}
