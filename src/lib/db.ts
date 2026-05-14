import { supabase } from './supabase'

export type SprintPhase = 'foundation' | 'build' | 'peak' | 'finish'

export interface Sprint {
  id: string
  user_id: string
  goal_text: string
  goal_category: string
  sprint_length: number
  visibility: 'PRIVATE' | 'COHORT' | 'PUBLIC'
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED'
  cohort_id: string | null
  start_date: string
  end_date: string
  created_at: string
  phase_themes?: Partial<Record<SprintPhase, string>>
  last_generated_phase?: SprintPhase
}

/** Day-range for each phase, scaled to the sprint length. Mirrors gemini.ts prompt math.
 *  Sprints < 10 days skip Peak (peak.from > peak.to as a "skipped" sentinel). */
export function getPhaseBoundaries(total: number): Record<SprintPhase, { from: number; to: number }> {
  if (total < 10) {
    const F = Math.max(1, Math.round(total * 0.3))
    const B = Math.max(F + 1, Math.round(total * 0.75))
    return {
      foundation: { from: 1, to: F },
      build: { from: F + 1, to: B },
      peak: { from: 0, to: -1 },
      finish: { from: B + 1, to: total },
    }
  }
  const F = Math.max(1, Math.round(total * 0.2))
  const B = Math.max(F + 1, Math.round(total * 0.6))
  const P = Math.max(B + 1, Math.round(total * 0.85))
  return {
    foundation: { from: 1, to: F },
    build: { from: F + 1, to: B },
    peak: { from: B + 1, to: P },
    finish: { from: P + 1, to: total },
  }
}

export function isPhaseSkipped(b: { from: number; to: number }): boolean {
  return b.from > b.to
}

export function getPhaseForDay(day: number, total: number): SprintPhase {
  const b = getPhaseBoundaries(total)
  if (day <= b.foundation.to) return 'foundation'
  if (day <= b.build.to) return 'build'
  if (!isPhaseSkipped(b.peak) && day <= b.peak.to) return 'peak'
  return 'finish'
}

export function nextPhaseAfter(phase: SprintPhase, total?: number): SprintPhase | null {
  const skipPeak = typeof total === 'number' && total < 10
  const order: SprintPhase[] = skipPeak ? ['foundation', 'build', 'finish'] : ['foundation', 'build', 'peak', 'finish']
  const idx = order.indexOf(phase)
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null
}

export async function setSprintPhaseThemes(
  sprintId: string,
  themes: Partial<Record<SprintPhase, string>>
): Promise<boolean> {
  const { error } = await supabase.from('sprints').update({ phase_themes: themes }).eq('id', sprintId)
  if (error) { console.error('setSprintPhaseThemes:', error); return false }
  return true
}

export async function markPhaseGenerated(sprintId: string, phase: SprintPhase): Promise<boolean> {
  const { error } = await supabase.from('sprints').update({ last_generated_phase: phase }).eq('id', sprintId)
  if (error) { console.error('markPhaseGenerated:', error); return false }
  return true
}

export interface Task {
  id: string
  sprint_id: string
  day_number: number
  task_text: string
  task_type: 'build' | 'research' | 'review'
  is_completed: boolean
  is_revised: boolean
  ongoing_habits?: string[]
  rationale?: string | null
}

export interface DailyLog {
  id: string
  sprint_id: string
  user_id: string
  day_number: number
  log_type: 'VERIFIED' | 'HONEST' | 'FAILED_VERIFICATION'
  log_text: string | null
  media_url: string | null
  ai_verification_result: {
    verified: boolean
    reason: string
    confidence: 'high' | 'medium' | 'low'
  } | null
  ai_draft_post: string | null
  posted_to_feed: boolean
  verification_attempts: number
  logged_at: string
}

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  reminder_time?: string | null
  reminder_timezone?: string | null
  reminder_enabled?: boolean
}

export async function updateReminderSettings(
  userId: string,
  settings: { reminder_time?: string | null; reminder_timezone?: string | null; reminder_enabled?: boolean }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update(settings)
    .eq('id', userId)
  if (error) {
    console.error('updateReminderSettings:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function savePushSubscription(
  userId: string,
  sub: PushSubscription
): Promise<{ ok: boolean; error?: string }> {
  const json = sub.toJSON()
  const endpoint = json.endpoint ?? sub.endpoint
  const keys = json.keys ?? {}
  if (!endpoint || !keys.p256dh || !keys.auth) {
    return { ok: false, error: 'Subscription missing endpoint/keys' }
  }
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
  }, { onConflict: 'user_id,endpoint' })
  if (error) {
    console.error('savePushSubscription:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export interface FeedbackSubmission {
  rating: number
  message?: string
  context?: string
  would_share?: boolean
  allow_contact?: boolean
}

export async function submitFeedback(
  userId: string,
  payload: FeedbackSubmission
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    rating: payload.rating,
    message: payload.message ?? null,
    context: payload.context ?? 'profile',
    would_share: payload.would_share ?? false,
    allow_contact: payload.allow_contact ?? false,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
  })
  if (error) {
    console.error('submitFeedback:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<boolean> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
  if (error) { console.error('deletePushSubscription:', error); return false }
  return true
}

// ── PROFILE OPERATIONS ──

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) { console.error('getProfile:', error); return null }
  return data
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'display_name' | 'avatar_url'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  if (error) { console.error('updateProfile:', error); return false }
  return true
}

// ── SPRINT OPERATIONS ──

export async function createSprint(sprint: {
  user_id: string
  goal_text: string
  goal_category: string
  sprint_length: number
  visibility: 'PRIVATE' | 'COHORT' | 'PUBLIC'
  start_date: string
  end_date: string
}): Promise<Sprint | null> {
  const { data, error } = await supabase
    .from('sprints')
    .insert({ ...sprint, status: 'ACTIVE' })
    .select()
    .single()
  if (error) { console.error('createSprint:', error.message, error.code, error.details, error.hint); return null }
  return data
}

export async function getActiveSprint(userId: string): Promise<Sprint | null> {
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('getActiveSprint:', error)
    return null
  }
  return data
}

export async function updateSprintVisibility(sprintId: string, visibility: 'PRIVATE' | 'COHORT' | 'PUBLIC'): Promise<boolean> {
  const { error } = await supabase
    .from('sprints')
    .update({ visibility })
    .eq('id', sprintId)
  if (error) { console.error('updateSprintVisibility:', error); return false }
  return true
}

export async function getAllActiveSprints(userId: string): Promise<Sprint[]> {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('user_id', userId)
    .gte('end_date', today)
    .order('created_at', { ascending: false })
  if (error) { console.error('getAllActiveSprints:', error); return [] }
  return data || []
}

export async function getAllSprints(userId: string): Promise<Sprint[]> {
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('getAllSprints:', error); return [] }
  return data || []
}

// ── TASK OPERATIONS ──

export async function createTasks(
  tasks: Omit<Task, 'id' | 'is_completed' | 'is_revised'>[]
): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .insert(tasks)
  if (error) { console.error('createTasks:', error); return false }
  return true
}

export async function getTasksForSprint(sprintId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('sprint_id', sprintId)
    .order('day_number', { ascending: true })
  if (error) { console.error('getTasksForSprint:', error); return [] }
  return data || []
}

export async function getTodayTask(sprintId: string, dayNumber: number): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('sprint_id', sprintId)
    .eq('day_number', dayNumber)
    .maybeSingle()
  if (error) { console.error('getTodayTask:', error); return null }
  return data
}

// ── LOG OPERATIONS ──

export async function createLog(
  log: Omit<DailyLog, 'id' | 'logged_at'>
): Promise<DailyLog | null> {
  const { data, error } = await supabase
    .from('daily_logs')
    .insert(log)
    .select()
    .single()
  if (error) { console.error('createLog:', error); return null }
  return data
}

export async function getLogsForSprint(sprintId: string): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('sprint_id', sprintId)
    .order('day_number', { ascending: true })
  if (error) { console.error('getLogsForSprint:', error); return [] }
  return data || []
}

export async function getTodayLog(sprintId: string, dayNumber: number): Promise<DailyLog | null> {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('sprint_id', sprintId)
    .eq('day_number', dayNumber)
    .maybeSingle()
  if (error) { console.error('getTodayLog:', error); return null }
  return data
}

// ── HELPERS ──

export function calculateDayNumber(startDate: string): number {
  const start = new Date(startDate)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.min(diff + 1, 999)
}

export function calculateEndDate(startDate: string, sprintLength: number): string {
  const start = new Date(startDate)
  start.setDate(start.getDate() + sprintLength - 1)
  return start.toISOString().split('T')[0]
}

export function isSprintLocked(endDate: string): boolean {
  const today = new Date()
  const end = new Date(endDate)
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return end > today
}

// ── FEED OPERATIONS ──

export interface FeedPost {
  id: string
  log_id: string
  sprint_id: string
  user_id: string
  post_text: string
  created_at: string
  // joined fields
  profiles?: { display_name: string | null }
  daily_logs?: { day_number: number; log_type: string }
  sprints?: { goal_text: string; visibility: 'PRIVATE' | 'COHORT' | 'PUBLIC' }
}

export async function createFeedPost(post: {
  log_id: string
  sprint_id: string
  user_id: string
  post_text: string
}): Promise<FeedPost | null> {
  const { data, error } = await supabase
    .from('feed_posts')
    .insert(post)
    .select()
    .single()
  if (error) { console.error('createFeedPost:', error.message); return null }
  return data
}

export async function getFeedPosts(): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('feed_posts')
    .select(`
      *,
      profiles:user_id(display_name),
      daily_logs:log_id(day_number, log_type),
      sprints:sprint_id(goal_text, visibility)
    `)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) { console.error('getFeedPosts:', error.message); return [] }
  return data || []
}

export async function markLogPostedToFeed(logId: string): Promise<void> {
  await supabase
    .from('daily_logs')
    .update({ posted_to_feed: true })
    .eq('id', logId)
}

export async function updateLogDraft(logId: string, draft: string): Promise<void> {
  await supabase
    .from('daily_logs')
    .update({ ai_draft_post: draft })
    .eq('id', logId)
}

// ── REACTION OPERATIONS ──

export async function toggleReaction(postId: string, userId: string, reactionType: 'WITNESSED' | 'FACING_THIS_TOO'): Promise<boolean> {
  // Check if reaction exists
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('reaction_type', reactionType)
    .maybeSingle()

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id)
    return false // removed
  } else {
    await supabase.from('reactions').insert({ post_id: postId, user_id: userId, reaction_type: reactionType })
    return true // added
  }
}

export async function getReactionCounts(postId: string): Promise<{ witnessed: number; facingThis: number }> {
  const { count: witnessed } = await supabase
    .from('reactions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('reaction_type', 'WITNESSED')

  const { count: facingThis } = await supabase
    .from('reactions')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)
    .eq('reaction_type', 'FACING_THIS_TOO')

  return { witnessed: witnessed ?? 0, facingThis: facingThis ?? 0 }
}
