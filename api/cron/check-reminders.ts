import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const APP_URL = process.env.APP_URL ?? 'https://stridewithme.app'
const FROM_EMAIL = process.env.REMINDER_FROM_EMAIL ?? 'StrideWithMe <reminders@stridewithme.app>'

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Cron auth — Vercel sets `Authorization: Bearer <CRON_SECRET>` automatically
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase env not configured' })
  }
  if (!resendKey) {
    return res.status(500).json({ error: 'Resend env not configured' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const resend = new Resend(resendKey)

  // Pull users who opted in
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, display_name, reminder_time, reminder_timezone')
    .eq('reminder_enabled', true)
    .not('reminder_time', 'is', null)

  if (profErr) return res.status(500).json({ error: profErr.message })
  if (!profiles || profiles.length === 0) return res.status(200).json({ checked: 0, sent: 0 })

  // The cron fires hourly — accept reminders within ±32 mins of "now" in the user's local time
  const WINDOW_MIN = 32
  let sent = 0
  const skipped: string[] = []

  for (const p of profiles) {
    const tz = p.reminder_timezone ?? 'UTC'
    const { date: localDate, minutes: nowMin } = getLocalDateAndTime(tz)
    const [rh, rm] = (p.reminder_time as string).split(':').map(Number)
    const reminderMin = rh * 60 + rm

    const diff = Math.abs(nowMin - reminderMin)
    const wrappedDiff = Math.min(diff, 1440 - diff)
    if (wrappedDiff > WINDOW_MIN) { skipped.push(`${p.id}:out-of-window`); continue }

    // Active sprint?
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

    // Day number relative to local date
    const start = new Date(sprint.start_date + 'T00:00:00Z')
    const today = new Date(localDate + 'T00:00:00Z')
    const dayNum = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1
    if (dayNum < 1 || dayNum > sprint.sprint_length) { skipped.push(`${p.id}:out-of-range`); continue }

    // Has logged today (any log_type)?
    const { data: existingLog } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('sprint_id', sprint.id)
      .eq('user_id', p.id)
      .eq('day_number', dayNum)
      .maybeSingle()

    if (existingLog) { skipped.push(`${p.id}:already-logged`); continue }

    // Email lookup via auth admin
    const { data: userResult } = await supabase.auth.admin.getUserById(p.id)
    const email = userResult?.user?.email
    if (!email) { skipped.push(`${p.id}:no-email`); continue }

    const name = p.display_name ?? 'Strider'
    const goal = sprint.goal_text
    const subject = `Day ${dayNum} of your sprint — log it before today ends`
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
  <p style="color:#9BBFB2;font-size:11px;font-style:italic;text-align:center;margin:28px 0 0;">— StrideWithMe · Update reminder time in your profile</p>
</div></body></html>`

    try {
      await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html })
      sent++
    } catch (e) {
      console.error('[reminder] send failed', p.id, e)
      skipped.push(`${p.id}:send-failed`)
    }
  }

  return res.status(200).json({ checked: profiles.length, sent, skipped })
}
