const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + GEMINI_API_KEY

console.log('Gemini key loaded:', GEMINI_API_KEY ? 'YES — starts with: ' + GEMINI_API_KEY.slice(0, 8) : 'NO — KEY IS MISSING')

async function callGemini(prompt: string): Promise<string> {
  console.log('Calling Gemini API...')

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    })
  })

  console.log('Gemini response status:', response.status)

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Gemini error body:', errorBody)
    throw new Error('Gemini API error: ' + response.status + ' ' + errorBody)
  }

  const data = await response.json()
  console.log('Gemini raw response:', JSON.stringify(data).slice(0, 200))
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const result = JSON.parse(cleaned)
    return result
  } catch (e) {
    console.error('[safeParseJSON] Failed to parse:', e, 'Input was:', text.slice(0, 300))
    return fallback
  }
}

// ── AI-1: GOAL DECOMPOSITION ──

export interface GeneratedTask {
  day: number
  task_text: string
  task_type: 'build' | 'research' | 'review'
}

export async function generateSprintPlan(
  goalText: string,
  sprintLength: number,
  goalCategory: string
): Promise<{ tasks: GeneratedTask[], wasVague: boolean }> {
  const prompt = `
You are a sprint planning assistant for StrideWithMe, an AI-verified accountability platform.

A user has set this goal:
"${goalText}"

Sprint length: ${sprintLength} days
Goal category: ${goalCategory}

TASK:
Generate a daily task plan SPECIFICALLY for this exact goal. Every task must directly contribute to achieving "${goalText}". Do NOT generate generic productivity tasks.

RULES:
1. Output ONLY a valid JSON object. No explanation, no markdown.
2. Each task must be completable in 1-3 hours.
3. Tasks must be SPECIFIC to the user's goal — reference their exact domain, deliverables, and milestones.
4. Tasks must escalate in complexity:
   - First 30% of days: research, planning, and foundation tasks specific to this goal
   - Middle 50% of days: build and execution tasks that create real deliverables toward this goal
   - Last 20% of days: review, refine, ship, and validate progress toward this goal
5. Each task_text must be under 80 characters.
6. task_type must be exactly: "build", "research", or "review"
7. If the goal is vague or lacks specificity, set wasVague: true.
   A goal is vague if it lacks: what specifically, by when, or measurable outcome.
   Even if vague, still generate the BEST tasks you can infer from the goal.
8. If the goal contains unrealistic financial targets (eg. make $100k in 30 days), extreme physical goals, or interpersonal manipulation — reframe it as a skill-building goal in your task generation. Still generate tasks but make them realistic.
9. Goal text must be in English. If not, generate tasks in English anyway.
10. NEVER generate filler tasks like "reflect on progress" or "review your notes" in the first 80% of the sprint. Every task should produce a tangible output.

OUTPUT FORMAT (strict JSON):
{
  "wasVague": false,
  "tasks": [
    { "day": 1, "task_text": "...", "task_type": "research" },
    { "day": 2, "task_text": "...", "task_type": "research" }
  ]
}

Generate exactly ${sprintLength} tasks, one per day.
`

  try {
    console.log('[AI-1] Sending goal to Gemini:', goalText)
    const raw = await callGemini(prompt)
    console.log('[AI-1] Raw Gemini response:', raw.slice(0, 500))
    const parsed = safeParseJSON<{ wasVague: boolean; tasks: GeneratedTask[] }>(raw, { wasVague: false, tasks: [] })
    console.log('[AI-1] Parsed tasks count:', parsed.tasks?.length ?? 0)

    if (!parsed.tasks || parsed.tasks.length === 0) {
      console.warn('[AI-1] No tasks parsed — using fallback. Raw was:', raw.slice(0, 300))
      return { tasks: getFallbackTasks(sprintLength), wasVague: false }
    }

    return {
      tasks: parsed.tasks.slice(0, sprintLength),
      wasVague: parsed.wasVague ?? false
    }
  } catch (err) {
    console.error('[AI-1] Error:', err)
    return { tasks: getFallbackTasks(sprintLength), wasVague: false }
  }
}

function getFallbackTasks(sprintLength: number): GeneratedTask[] {
  const base = [
    { task_text: 'Define your goal clearly and write it in one sentence', task_type: 'research' as const },
    { task_text: 'Research 3 people who have achieved something similar', task_type: 'research' as const },
    { task_text: 'List the 5 biggest obstacles you expect to face', task_type: 'research' as const },
    { task_text: 'Create your first tangible output — even if rough', task_type: 'build' as const },
    { task_text: 'Share your work with one person and get feedback', task_type: 'build' as const },
    { task_text: 'Identify what is working and what needs to change', task_type: 'review' as const },
    { task_text: 'Double down on the highest-leverage activity', task_type: 'build' as const },
  ]
  return Array.from({ length: sprintLength }, (_, i) => ({
    day: i + 1,
    task_text: base[i % base.length].task_text,
    task_type: base[i % base.length].task_type,
  }))
}

// ── AI-2: LOG VERIFICATION ──

export interface VerificationResult {
  verified: boolean
  reason: string
  confidence: 'high' | 'medium' | 'low'
  guidanceForRetry?: string
}

export async function verifyLog(params: {
  goalText: string
  todayTask: string
  logText: string
  dayNumber: number
  sprintLength: number
  attemptNumber: number
  mediaType?: 'image' | 'link' | null
  mediaDescription?: string
  linkUrl?: string
  recentLogs?: string[]
}): Promise<VerificationResult> {
  const { goalText, todayTask, logText, dayNumber, sprintLength, attemptNumber, mediaType, linkUrl, recentLogs = [] } = params

  const STRONG_URL_PATTERNS = ['github.com', 'figma.com', 'notion.so', 'vercel.app', 'netlify.app', 'docs.google.com', 'drive.google.com', 'loom.com', 'linear.app', 'jira.', 'trello.com', 'miro.com']
  const isStrongUrl = linkUrl ? STRONG_URL_PATTERNS.some(p => linkUrl.includes(p)) : false

  const mediaContext = mediaType === 'image'
    ? `The user also attached an image as proof of work. Treat as visual evidence. Verify as true if the image could plausibly show progress toward their goal. Verify as false ONLY if clearly unrelated. When in doubt — verify.`
    : mediaType === 'link'
      ? isStrongUrl
        ? `The user shared a link: ${linkUrl}. This URL pattern strongly implies a work artifact. Treat as strong evidence of work done. ${logText.length < 20 ? 'Even with minimal text, verify as true given the strong URL evidence.' : ''}`
        : `The user shared a link: ${linkUrl}. This is a general platform URL. Require their text to specifically describe what they did on this platform today. Do not verify based on URL alone.`
      : ''

  const recentLogsContext = recentLogs.length > 0
    ? `Recent logs for context (last ${recentLogs.length} days):\n${recentLogs.map((l, i) => `Day ${dayNumber - recentLogs.length + i}: "${l}"`).join('\n')}\nIf today's log appears near-identical to a recent log, flag as not-verified.`
    : ''

  const attemptGuidance = attemptNumber === 1
    ? `This is attempt 1. If not verified, provide specific guidance in guidanceForRetry.`
    : attemptNumber === 2
      ? `This is attempt 2. Be slightly more lenient. If still not verified, provide final guidance in guidanceForRetry.`
      : `This is attempt 3 (final). Apply the same strict-but-fair standard. This result is final.`

  const prompt = `
You are the AI verification system for StrideWithMe, an accountability platform where users log daily progress toward a meaningful goal.

USER'S GOAL: "${goalText}"
TODAY'S PLANNED TASK (Day ${dayNumber} of ${sprintLength}): "${todayTask}"
USER'S LOG: "${logText}"

${mediaContext}
${recentLogsContext}
${attemptGuidance}

VERIFICATION RULES:
1. Output ONLY valid JSON. No explanation outside JSON.
2. Verify as TRUE if the log shows genuine forward movement toward the stated goal. A small step counts.
3. Verify as FALSE if: Log is vague, describes yesterday's work, is clearly unrelated to the goal, or appears copy-pasted from a recent entry.
4. Be strict but fair. Effort counts. Perfect execution is not required.
5. reason must be under 60 characters.
6. If not verified, guidanceForRetry must be specific.
7. confidence reflects how certain you are.

OUTPUT FORMAT (strict JSON):
{
  "verified": true,
  "reason": "Clear progress on today's task",
  "confidence": "high",
  "guidanceForRetry": null
}
`

  try {
    const raw = await callGemini(prompt)
    return safeParseJSON<VerificationResult>(raw, {
      verified: false,
      reason: 'Could not process your log',
      confidence: 'low',
      guidanceForRetry: 'Please describe specifically what you did today, how long you spent, and what the output was.'
    })
  } catch (err) {
    console.error('AI-2 error:', err)
    return { verified: false, reason: 'Verification service unavailable', confidence: 'low', guidanceForRetry: 'Please try again in a moment.' }
  }
}

// ── AI-3: POST AUTO-DRAFT ──

export async function generatePostDraft(params: {
  goalText: string
  logText: string
  dayNumber: number
  sprintLength: number
  isHonestDay: boolean
  mediaType?: 'image' | 'link' | null
}): Promise<string> {
  const { goalText, logText, dayNumber, sprintLength, isHonestDay, mediaType } = params

  const verifiedPrompt = `
You are a post-drafting assistant for StrideWithMe.
Write a short post that a real person would share about their daily progress.

GOAL: "${goalText}"
DAY: ${dayNumber} of ${sprintLength}
LOG: "${logText}"
${mediaType ? `User also attached ${mediaType === 'image' ? 'an image' : 'a link'} as proof.` : ''}

RULES:
1. Output ONLY the post text. No JSON. No explanation.
2. Strict maximum: 200 characters including spaces.
3. Tone: honest, grounded, real. Not performative. Not a LinkedIn brag.
4. Sound like a real person reporting progress.
5. Include "Day ${dayNumber}" naturally in the post.
6. NEVER use: "excited to share", "thrilled", "blessed", "grateful to announce", "on my journey", "grinding".
7. Optional: add one relevant hashtag at the end.
8. If the log mentions a specific output — include it.
`

  const honestPrompt = `
You are a post-drafting assistant for StrideWithMe.
Write a short honest check-in post. The user had a hard day.

GOAL: "${goalText}"
DAY: ${dayNumber} of ${sprintLength}
WHAT GOT IN THE WAY: "${logText}"

RULES:
1. Output ONLY the post text. No JSON. No explanation.
2. Strict maximum: 200 characters including spaces.
3. Tone: honest, vulnerable, human. Not self-pitying. Not fake positive.
4. Acknowledge what got in the way briefly.
5. End with something real.
6. Include "Day ${dayNumber}" naturally.
7. NEVER use: "but tomorrow will be better!", "staying positive!", "the grind continues", "back at it tomorrow!"
`

  try {
    const raw = await callGemini(isHonestDay ? honestPrompt : verifiedPrompt)
    const post = raw.trim().replace(/^["']|["']$/g, '')
    if (post.length <= 200) return post
    const sentences = post.match(/[^.!?]+[.!?]+/g) ?? []
    let result = ''
    for (const sentence of sentences) {
      if ((result + sentence).length <= 200) result += sentence
      else break
    }
    return result.trim() || post.slice(0, 197) + '...'
  } catch (err) {
    console.error('AI-3 error:', err)
    return isHonestDay
      ? `Day ${dayNumber}: Honest day. Life got in the way today. Logging it anyway because showing up means telling the truth too.`
      : `Day ${dayNumber}: Made progress today. Showing up consistently. #BuildInPublic`
  }
}

// ── AI-4: ADAPTIVE RE-PLANNING ──

export function getReplanThreshold(sprintLength: number): number {
  return Math.max(2, Math.floor(sprintLength / 10))
}

export function shouldTriggerReplan(
  logs: Array<{ day_number: number; log_type: string }>,
  currentDay: number,
  sprintLength: number
): boolean {
  const threshold = getReplanThreshold(sprintLength)
  let consecutive = 0
  for (let d = currentDay; d >= Math.max(1, currentDay - threshold + 1); d--) {
    const log = logs.find(l => l.day_number === d)
    const isHonestOrMissed = !log || log.log_type === 'HONEST'
    if (isHonestOrMissed) consecutive++
    else break
  }
  return consecutive >= threshold
}

export async function generateReplan(params: {
  goalText: string
  originalTasks: Array<{ day: number; task_text: string; task_type: string }>
  completedLogs: Array<{ day_number: number; log_text: string | null; log_type: string }>
  missedDays: number[]
  daysRemaining: number
  currentDay: number
  sprintLength: number
}): Promise<GeneratedTask[]> {
  const { goalText, completedLogs, missedDays, daysRemaining, currentDay, sprintLength } = params

  const completedTasksSummary = completedLogs
    .filter(l => l.log_type === 'VERIFIED')
    .map(l => `Day ${l.day_number}: ${l.log_text?.slice(0, 100)}`)
    .join('\n')

  const isNearEnd = daysRemaining <= 2

  const prompt = `
You are the adaptive re-planning system for StrideWithMe.
The user has had ${missedDays.length} missed/honest days and needs an adjusted plan.

USER'S GOAL: "${goalText}"
SPRINT: ${sprintLength} days total, ${daysRemaining} days remaining
CURRENT DAY: ${currentDay}

WHAT THEY COMPLETED:
${completedTasksSummary || 'No verified logs yet.'}

MISSED DAYS: ${missedDays.join(', ') || 'None'}

${isNearEnd ? `IMPORTANT: Only ${daysRemaining} day(s) remaining. Generate compressed "essentials only" plan. Final day task MUST be: "Reflect on your sprint journey and document your biggest learning."` : ''}

RULES:
1. Output ONLY valid JSON array. No explanation.
2. Generate exactly ${daysRemaining} tasks. Day numbers start from ${currentDay + 1}.
3. DO NOT punish missed days — make the plan realistic and achievable.
4. Each task_text under 80 characters.
5. task_type: "build", "research", or "review"

OUTPUT FORMAT (strict JSON array):
[
  { "day": ${currentDay + 1}, "task_text": "...", "task_type": "build" }
]
`

  try {
    const raw = await callGemini(prompt)
    const parsed = safeParseJSON<GeneratedTask[]>(raw, [])
    if (!parsed || parsed.length === 0) {
      return getFallbackTasks(daysRemaining).map((t, i) => ({ ...t, day: currentDay + 1 + i }))
    }
    return parsed.slice(0, daysRemaining)
  } catch (err) {
    console.error('AI-4 error:', err)
    return getFallbackTasks(daysRemaining).map((t, i) => ({ ...t, day: currentDay + 1 + i }))
  }
}
