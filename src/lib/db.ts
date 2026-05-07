import { supabase } from './supabase'

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
}

export interface Task {
  id: string
  sprint_id: string
  day_number: number
  task_text: string
  task_type: 'build' | 'research' | 'review'
  is_completed: boolean
  is_revised: boolean
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
  sprints?: { goal_text: string }
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
      sprints:sprint_id(goal_text)
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
