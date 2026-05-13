const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages'

console.log('Claude key loaded:', CLAUDE_API_KEY ? 'YES — starts with: ' + CLAUDE_API_KEY.slice(0, 10) : 'NO — KEY IS MISSING')

async function callGemini(
  prompt: string,
  images?: Array<{ base64: string; mimeType: string }>,
  useHighQuality?: boolean,
  maxTokens: number = 2048
): Promise<string> {
  const model = useHighQuality ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'

  const content: any[] = []
  if (images && images.length > 0) {
    for (const img of images) {
      content.push({ type: 'image', source: { type: 'base64', media_type: img.mimeType, data: img.base64 } })
    }
  }
  content.push({ type: 'text', text: prompt })

  console.log('Calling Claude API...', { model, hasImages: !!images?.length, maxTokens })

  const response = await fetch(CLAUDE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content }] })
  })

  console.log('Claude response status:', response.status)

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Claude error body:', errorBody)
    throw new Error('Claude API error: ' + response.status + ' ' + errorBody)
  }

  const data = await response.json()
  console.log('Claude raw response:', JSON.stringify(data).slice(0, 200))
  return data.content?.[0]?.text ?? ''
}

function safeParseJSON<T>(text: string, fallback: T): T {
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    // Truncation salvage: when the response was cut mid-output, try to recover the
    // largest valid prefix. Useful for plan generation where some tasks > no tasks.
    try {
      // Try to close the JSON at the last complete object/array boundary
      const lastValidObject = cleaned.lastIndexOf('},')
      const lastValidArray = cleaned.lastIndexOf('],')
      const cutAt = Math.max(lastValidObject, lastValidArray)
      if (cutAt > 0) {
        // Close any open brackets to make valid JSON
        let salvage = cleaned.slice(0, cutAt + 1)
        // Count remaining open brackets and close them
        const openBraces = (salvage.match(/\{/g) ?? []).length - (salvage.match(/\}/g) ?? []).length
        const openSquares = (salvage.match(/\[/g) ?? []).length - (salvage.match(/\]/g) ?? []).length
        for (let i = 0; i < openSquares; i++) salvage += ']'
        for (let i = 0; i < openBraces; i++) salvage += '}'
        const partial = JSON.parse(salvage)
        console.warn('[safeParseJSON] Salvaged partial JSON after truncation')
        return partial
      }
    } catch { /* salvage failed, fall through to fallback */ }
    console.error('[safeParseJSON] Failed to parse:', e, 'Input was:', cleaned.slice(0, 300), '... length:', cleaned.length)
    return fallback
  }
}

const STRONG_URL_PATTERNS = ['github.com', 'figma.com', 'notion.so', 'vercel.app', 'netlify.app', 'docs.google.com', 'drive.google.com', 'loom.com', 'linear.app', 'jira.', 'trello.com', 'miro.com']

// ── AI-1: GOAL DECOMPOSITION ──

export interface GeneratedTask {
  day: number
  task_text: string
  task_type: 'build' | 'research' | 'review'
  ongoing_habits?: string[]
  rationale?: string
}

export type GoalScope = 'realistic' | 'ambitious' | 'unrealistic'

export interface ScopeAssessment {
  scope: GoalScope
  message: string
  reframed_goal?: string
}

/**
 * Pre-flight scope check. Run before generateSprintPlan to detect impossible asks
 * (e.g. "lose 20 kg in 30 days", "learn Mandarin fluently in 14 days") so the user
 * can adjust before committing to a plan they can't actually follow.
 */
export async function assessGoalScope(goalText: string, sprintLength: number): Promise<ScopeAssessment> {
  const prompt = `
You are a brutally honest, kind sprint coach assessing whether a user's goal is achievable in their chosen timeframe.

GOAL: "${goalText}"
SPRINT LENGTH: ${sprintLength} days

Classify the scope as exactly ONE of:
- "realistic": The goal can be achieved in ${sprintLength} days with daily effort. No warning needed.
- "ambitious": The goal is at the upper edge of what's possible. It demands daily compliance and a bit of luck. Warn the user but still proceed.
- "unrealistic": The goal cannot be achieved in ${sprintLength} days by any reasonable interpretation. Either the timeframe is too short, the outcome depends on factors outside daily action (luck, external decisions), or it violates physical/economic reality (e.g. "make $1M in 30 days", "lose 20 kg in 30 days", "become fluent in a language in 14 days").

If "unrealistic", you MUST provide a "reframed_goal" — a tight, achievable version that uses the same ${sprintLength} days to BUILD THE FOUNDATION for the bigger ambition. Examples:
- "Lose 15 kg in 30 days" → reframe to "Lose 5 kg + lock in a daily routine that gets you the rest in months 2–3"
- "Make $1M in 30 days" → reframe to "Set up the system + acquire your first 10 paying customers"
- "Become fluent in Mandarin in 14 days" → reframe to "Build a daily 30-min practice habit + reach HSK-1 vocabulary"

The "message" field should be 1–2 sentences directly to the user, in second person ("You're...", "This is..."). For realistic, a warm acknowledgement. For ambitious, naming the stakes. For unrealistic, an honest coach-level pushback explaining why and pointing at the reframe.

Output STRICTLY this JSON shape — no markdown, no commentary:
{
  "scope": "realistic" | "ambitious" | "unrealistic",
  "message": "...",
  "reframed_goal": "..."  // ONLY when scope is "unrealistic"
}
`
  try {
    // Scope check output is tiny (~3 fields, <500 tokens) — keep budget small for fast response
    const raw = await callGemini(prompt, undefined, false, 1024)
    const parsed = safeParseJSON<ScopeAssessment>(raw, { scope: 'realistic', message: '' })
    if (parsed.scope !== 'realistic' && parsed.scope !== 'ambitious' && parsed.scope !== 'unrealistic') {
      return { scope: 'realistic', message: '' }
    }
    return parsed
  } catch (err) {
    console.error('[AI scope] error:', err)
    return { scope: 'realistic', message: '' }
  }
}

export async function generateSprintPlan(
  goalText: string,
  sprintLength: number,
  goalCategory: string,
  pastReflection?: string,
  extraContext?: string
): Promise<{ tasks: GeneratedTask[], wasVague: boolean }> {
  const extraContextBlock = extraContext && extraContext.trim().length > 0
    ? `

ADDITIONAL CONTEXT (the user's clarifications, blockers, scope details, tools, or deadlines they want you to know):
"${extraContext.trim()}"

Treat this as AUTHORITATIVE additions to the goal. The plan MUST reflect these specifics:
- Named tools / platforms → tasks must reference them by name (e.g. "Open the Figma file", "Push to the Vercel preview")
- Stated blockers / constraints → tasks must work AROUND them (e.g. "limited to 30 min/day" → split work into 30-min units)
- Concrete deliverables they mentioned → those become explicit task milestones in the right week
- Deadlines or fixed dates → schedule the matching milestone task on a specific Day N
- Skills they're missing → add a learn/research task on Day 1–3 specifically for that gap
- Side projects, dependencies, prior work → reference those in the relevant task text

Do NOT generate generic tasks when this context is available. Specificity is the whole point.
`
    : ''

  const reflectionBlock = pastReflection && pastReflection.trim().length > 0
    ? `

PAST-FAILURE REFLECTION (CRITICAL — this user has tried before and told you what tripped them up):
"${pastReflection.trim()}"

You MUST adapt the plan to defuse the specific failure pattern they described. This is non-negotiable — the plan should look measurably different from a generic plan because of this context. Apply ALL relevant heuristics below:

- "lost motivation / faded / steam died / Day N" → Front-load DAYS 1–4 with three quick wins (a finished tangible artifact each). DAY 6 must be a visible milestone or external share — exactly when they typically quit. Avoid abstract research tasks before Day 5.
- "burned out / overwhelmed / too much / overcommitted" → Cap each task at strictly 1-hour scope. Use shorter task_text (under 60 chars). Build in a deliberately-light task at Day 7, 14, 21 ("review and rest" framing). Reduce build-density in the middle 50%.
- "got busy / no time / life got in the way / family / work" → Tasks must be doable in fragmented 30-min sessions. Task wording should imply small, isolatable units of work. Avoid tasks that assume long blocks of focus.
- "fear / scared / afraid to share / imposter / not ready" → Add forced-share/exposure tasks at Days 3, 10, 18 (e.g. "Share rough version with one person"). Don't let them hide.
- "started over / quit and restarted / abandoned" → DAY 1 must be deliberately small and achievable in 20 mins. The first week must build evidence they can sustain it; complexity climbs only after Day 7.
- "no accountability / alone / solo / no one watching" → Weave in cohort/share/external-feedback tasks at Days 5, 12, 22.
- "perfectionism / kept rewriting / never shipped / never finished" → Force ship-first tasks: rough drafts shipped on Day 4, public version on Day 14, final on Day 25. Frame as "publish ugly first."
- "distracted / scope creep / chased shiny things" → Lock the goal scope; tasks should explicitly reference the original goal phrasing. Add a Day 8 "kill the side ideas" review task.

If their reflection doesn't match any pattern above, infer the closest one and apply its heuristic. The first week's tasks (Days 1–7) MUST visibly reflect this adaptation.
`
    : ''

  const prompt = `
You are a sprint planning assistant for StrideWithMe, an AI-verified accountability platform.

A user has set this goal:
"${goalText}"

Sprint length: ${sprintLength} days
Goal category: ${goalCategory}
${reflectionBlock}${extraContextBlock}
YOUR ROLE:
You are a sprint coach — like a personal trainer, mentor, or shipping partner — building a daily plan that a real human would follow with discipline. This is not a generic productivity list. This is THE plan that determines whether they succeed at "${goalText}" in ${sprintLength} days.

UNIVERSAL COACHING PRINCIPLES (apply to EVERY goal, fitness/build/career/learning/creative/mindset/anything):

1. PHASE STRUCTURE — divide the ${sprintLength} days into 4 phases:
   ${sprintLength >= 30
      ? '- Foundation (Days 1–6): tiny wins, daily habit installation, no big swings\n   - Build (Days 7–20): compound and escalate, real output starts\n   - Peak (Days 21–28): hardest, most ambitious tasks, the actual push\n   - Finish (Days 29–30): ship, measure, share, lock-in'
      : sprintLength >= 14
      ? '- Foundation (Days 1–3): tiny wins, daily habit installation\n   - Build (Days 4–' + Math.floor(sprintLength * 0.6) + '): compound and escalate, real output starts\n   - Peak (Days ' + (Math.floor(sprintLength * 0.6) + 1) + '–' + (sprintLength - 2) + '): hardest, most ambitious tasks\n   - Finish (Days ' + (sprintLength - 1) + '–' + sprintLength + '): ship, measure, share, lock-in'
      : '- Foundation (Days 1–2): tiny wins, fast habit installation\n   - Build (Days 3–' + Math.max(3, sprintLength - 3) + '): real output, compound\n   - Peak (Day ' + (sprintLength - 1) + '): hardest task\n   - Finish (Day ' + sprintLength + '): ship/measure/share'
   }

2. HABIT CONTINUITY — every habit introduced on Day N must appear in "ongoing_habits" on Day N+1, N+2, …, until the sprint ends. The user's effort COMPOUNDS, it does not vanish. If Day 1 task is "log all meals", Day 2's ongoing_habits MUST include "Log all meals (from Day 1)". Same for any daily ritual the goal requires.

3. EACH DAY = ONE NEW ACTION + CARRIED HABITS — task_text is the SINGLE NEW thing for today. ongoing_habits is the cumulative list of established daily commitments. Do not stuff multiple new actions into one task_text.

4. NO FAKE MILESTONES — you may NOT use words like "halfway", "midpoint", "final push", "almost there" unless the day_number is mathematically near that point. Halfway = Day ${Math.round(sprintLength / 2)}. Final = last 2 days.

5. NO PREMATURE REST in Foundation phase. Rest/light-review days only legal in Peak phase (or weekly recovery if sprint is ≥21 days, on Day 7 / 14 / 21).

6. DOMAIN VOCABULARY — use the user's own language. For weight loss: "calorie deficit, log meals, walk, weigh in". For shipping a SaaS: "user research, prototype, deploy, demo". For learning German: "vocabulary, comprehension, conversation". Generic productivity speak ("review notes", "plan next steps") is BANNED.

7. RATIONALE — for each day, write a 1-sentence "rationale" explaining why this specific task today, in the context of the phase. Examples:
   - "Day 1 starts with the smallest viable habit so you build a streak before willpower runs out."
   - "Day 14 introduces resistance because by now the baseline is automatic — time to make it harder."
   - "Day 28 is a pre-ship rehearsal so the final two days don't surprise you."

OUTPUT REQUIREMENTS:
- Output ONLY a valid JSON object. No markdown, no commentary.
- Each task_text must be under 100 characters.
- task_type must be exactly "build", "research", or "review".
- ongoing_habits is an array of strings (≤ 5 items per day). Each string is short, declarative, in second person ("Stay in deficit", "Continue daily walk", "Keep 30-min practice block"). For Day 1, ongoing_habits should be empty array [].
- rationale is one sentence, under 140 characters.
- wasVague: true ONLY if the goal lacks any specificity (e.g. just "be better"). For most user inputs, false.

OUTPUT FORMAT (strict JSON):
{
  "wasVague": false,
  "tasks": [
    {
      "day": 1,
      "task_text": "Pick your tracking method and set up the app or notebook",
      "task_type": "research",
      "ongoing_habits": [],
      "rationale": "Day 1 is about removing friction from tomorrow — when the work begins, the tool is ready."
    },
    {
      "day": 2,
      "task_text": "Log every meal in your tracker — no calorie target yet, just the data",
      "task_type": "build",
      "ongoing_habits": ["Use the tracker daily (from Day 1)"],
      "rationale": "Visibility before intervention — you can't change what you don't measure."
    }
  ]
}

Generate exactly ${sprintLength} tasks, one per day. Day numbers run 1 to ${sprintLength} sequentially.
`

  try {
    console.log('[AI-1] Sending goal to Gemini:', goalText)
    // Plan output is large: 30 tasks × (task_text + ongoing_habits[] + rationale)
    // ≈ 6-9k tokens of structured JSON. Need headroom or the response truncates mid-day.
    const planMaxTokens = sprintLength <= 7 ? 4096 : sprintLength <= 15 ? 8192 : 12288
    const raw = await callGemini(prompt, undefined, false, planMaxTokens)
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
    ongoing_habits: i === 0 ? [] : ['Stay consistent with daily action'],
    rationale: 'Fallback plan — could not reach the AI service. Edit your goal to retry.',
  }))
}

// ── AI-2: LOG VERIFICATION ──

export interface VerificationResult {
  verified: boolean
  reason: string
  confidence: 'high' | 'medium' | 'low'
  guidanceForRetry?: string
  insight?: string
  insightQuote?: string
}

export async function verifyLog(params: {
  goalText: string; todayTask: string; logText: string; dayNumber: number; sprintLength: number; attemptNumber: number;
  mediaType?: 'image' | 'link' | null; linkUrl?: string; linkCaption?: string; recentLogs?: string[];
  images?: Array<{ base64: string; mimeType: string; caption?: string }>
}): Promise<VerificationResult> {
  const { goalText, todayTask, logText, dayNumber, sprintLength, attemptNumber, mediaType, linkUrl, linkCaption, recentLogs = [], images = [] } = params

  const hasImages = images.length > 0
  const hasText = logText.trim().length >= 10
  const hasLink = mediaType === 'link' && !!linkUrl
  const isStrongUrl = hasLink ? STRONG_URL_PATTERNS.some(p => linkUrl!.includes(p)) : false

  let mediaContext = ''
  if (hasImages) {
    const captions = images.map((img, i) => img.caption ? `Image ${i+1} caption: "${img.caption}"` : `Image ${i+1}: no caption`).join('\n')
    mediaContext = `\nThe user has attached ${images.length} image(s) as visual proof.\n${captions}\n\nIMPORTANT — Image verification rules:\nAnalyze each image carefully. Verify as TRUE if ANY image shows notes, notebooks, screenshots, code, designs, physical work output, workspace showing active work, or any artifact plausibly related to the goal. Verify as FALSE only if images are clearly unrelated (pure selfies, entertainment). When in doubt — VERIFY TRUE.`
  }
  if (hasLink) {
    mediaContext += `\nThe user shared a link: ${linkUrl}\n${linkCaption ? `Link caption: "${linkCaption}"` : ''}\n${isStrongUrl ? 'This is a recognized work platform URL. Treat as strong evidence.' : hasText ? 'Evaluate based on their text description.' : 'No supporting text — cannot verify on URL alone.'}`
  }

  const recentContext = recentLogs.length > 0 ? `\nRecent logs:\n${recentLogs.map((l, i) => `Day ${dayNumber - recentLogs.length + i}: "${l}"`).join('\n')}\nIf today's log is near-identical, mark not-verified.` : ''

  const attemptContext = attemptNumber === 1 ? 'This is attempt 1. If not verified: provide specific guidanceForRetry.' : attemptNumber === 2 ? 'This is attempt 2. Be slightly more lenient.' : 'This is attempt 3 — final. Strict-but-fair.'

  const logDisplay = hasText ? `"${logText}"` : hasImages ? '(no text — image provided as sole proof)' : hasLink ? '(no text — link provided as sole proof)' : '(empty)'

  const prompt = `You are the verification system for StrideWithMe.\n\nUSER GOAL: "${goalText}"\nTODAY'S TASK (Day ${dayNumber}/${sprintLength}): "${todayTask}"\nLOG TEXT: ${logDisplay}\n${mediaContext}\n${recentContext}\n${attemptContext}\n\nRULES:\n1. Output ONLY valid JSON. Nothing else.\n2. Verify TRUE if log shows genuine forward movement. Small steps count.\n3. Verify FALSE if: vague text, yesterday's work, unrelated, copy-paste, empty.\n4. If image is provided and plausibly work-related — lean toward TRUE.\n5. reason: under 60 characters.\n6. guidanceForRetry: specific, only when false.\n7. insight: Write 2-3 sentences specifically about THIS user's log entry. Reference what they actually wrote or showed. Never generic statements — be specific to their actual words, images, and goal.\n8. insightQuote: One short punchy sentence under 100 chars that captures something true about what they did today. Should feel like something a mentor would say. Personal and earned, not a motivational poster.\n\nOUTPUT (strict JSON):\n{"verified": true, "reason": "Clear progress", "confidence": "high", "guidanceForRetry": null, "insight": "2-3 sentences about their specific log...", "insightQuote": "One punchy mentor-like sentence."}`

  try {
    const raw = await callGemini(prompt, hasImages ? images : undefined)
    const result = safeParseJSON<VerificationResult>(raw, { verified: false, reason: 'Could not process your log', confidence: 'low', guidanceForRetry: 'Please describe specifically what you did today.' })
    console.log('AI-2 result:', result)
    return result
  } catch (err) {
    console.error('AI-2 error:', err)
    return { verified: false, reason: 'Verification service unavailable', confidence: 'low', guidanceForRetry: 'Please try again in a moment.' }
  }
}

// ── AI-3: POST AUTO-DRAFT ──

export async function generatePostDraft(params: {
  goalText: string; logText: string; dayNumber: number; sprintLength: number; isHonestDay: boolean;
  mediaType?: 'image' | 'link' | null; linkUrl?: string;
  images?: Array<{ base64: string; mimeType: string; caption?: string }>
}): Promise<string> {
  const { goalText, logText, dayNumber, sprintLength, isHonestDay, linkUrl, images = [] } = params

  const mediaNote = images.length > 0 ? `User has ${images.length} image(s) as proof.` : linkUrl ? `User shared a link: ${linkUrl}` : ''

  const verifiedPrompt = `You are a post-drafting assistant for StrideWithMe.\n\nGOAL: "${goalText}"\nDAY: ${dayNumber} of ${sprintLength}\nLOG: "${logText}"\n${mediaNote}\n\nWrite a short post a real person would share.\n\nRULES:\n1. Output ONLY the post text. No quotes. No explanation.\n2. Hard maximum: 200 characters.\n3. Honest, grounded, real. Not performative.\n4. Include "Day ${dayNumber}" naturally.\n5. BANNED: "excited to share", "thrilled", "blessed", "grinding", "hustle".\n6. If log mentions specific output — reference it.\n7. One hashtag optional at end.`

  const honestPrompt = `You are a post-drafting assistant for StrideWithMe.\nThe user had a hard day.\n\nGOAL: "${goalText}"\nDAY: ${dayNumber} of ${sprintLength}\nWHAT HAPPENED: "${logText}"\n\nWrite a short honest check-in post.\n\nRULES:\n1. Output ONLY the post text. No quotes. No explanation.\n2. Hard maximum: 200 characters.\n3. Honest, vulnerable, human. Not self-pitying.\n4. Include "Day ${dayNumber}" naturally.\n5. BANNED: "tomorrow will be better!", "staying positive!", "back at it!", "keep pushing".\n6. Reader should think "I've been there".`

  try {
    const raw = await callGemini(isHonestDay ? honestPrompt : verifiedPrompt, images.length > 0 ? images : undefined)
    const post = raw.trim().replace(/^["']|["']$/g, '').replace(/^Here('s| is) (a |the )?post:?\s*/i, '').trim()
    if (post.length <= 200) return post
    const sentences = post.match(/[^.!?]+[.!?]+/g) ?? []
    let result = ''
    for (const s of sentences) { if ((result + s).length <= 200) result += s; else break }
    return result.trim() || post.slice(0, 197) + '...'
  } catch (err) {
    console.error('AI-3 error:', err)
    return isHonestDay ? `Day ${dayNumber}: Honest day. Life got in the way. Logging it anyway.` : `Day ${dayNumber}: Showed up today. #BuildInPublic`
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

// ── AI-4: ADAPTIVE RE-PLANNING ──

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
    // Replan can also be many days — give it generous headroom
    const raw = await callGemini(prompt, undefined, false, 8192)
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

// ── AI-6: SPRINT NARRATIVE ──

export async function generateSprintNarrative(params: {
  goalText: string
  logs: Array<{ day_number: number; log_type: string; log_text: string | null }>
  sprintLength: number
  verifiedCount: number
  honestCount: number
}): Promise<string> {
  const { goalText, logs, sprintLength, verifiedCount, honestCount } = params

  const logsSummary = logs
    .sort((a, b) => a.day_number - b.day_number)
    .map(l => `Day ${l.day_number} (${l.log_type}): ${l.log_text?.slice(0, 120) ?? 'no entry'}`)
    .join('\n')

  const completionRate = Math.round((logs.length / sprintLength) * 100)

  const prompt = `
You are the Sprint Record narrator for StrideWithMe.
Write an AI-generated narrative for a completed sprint.

GOAL: "${goalText}"
SPRINT: ${sprintLength} days
LOGGED: ${logs.length} days (${verifiedCount} verified, ${honestCount} honest)
COMPLETION: ${completionRate}%

DAILY LOG ENTRIES:
${logsSummary}

TASK:
Write exactly 2 paragraphs.

Paragraph 1: What happened — the arc of the sprint. Mention specific days, specific moments, any pivots or breakthroughs you can see in the logs. Be concrete. Reference actual log content where possible.

Paragraph 2: What this shows about the person — their pattern, consistency, resilience, what changed or emerged over the sprint. This should feel like a character observation, not a performance review.

RULES:
1. Output ONLY the two paragraphs as plain text. No JSON. No headers. No markdown. Just paragraph 1, blank line, paragraph 2.
2. Never use corporate language.
3. Never fabricate specific details not present in the logs.
4. If completion is under 50%, be honest about the gaps — but find something true and meaningful to say.
5. If all logs are honest days with no verified logs, acknowledge the difficulty and what that shows.
6. Tone: warm, specific, human. Like a thoughtful mentor who read every single entry.
7. Each paragraph: 60-100 words. Not too long — this lives on a shareable credential.
`

  try {
    const raw = await callGemini(prompt, undefined, true)
    const cleaned = raw.trim()
    if (!cleaned) {
      return 'This sprint tells its own story through the logs above. Every day logged — whether verified or honest — is evidence of someone who chose to show up and be accountable to themselves.\n\nThe consistency of logging, even on hard days, reveals a pattern worth building on.'
    }
    return cleaned
  } catch (err) {
    console.error('AI-6 error:', err)
    return 'This sprint tells its own story through the logs above. Every day logged — whether verified or honest — is evidence of someone who chose to show up and be accountable to themselves.\n\nThe consistency of logging, even on hard days, reveals a pattern worth building on.'
  }
}
