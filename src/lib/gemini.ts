const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages'

console.log('Claude key loaded:', CLAUDE_API_KEY ? 'YES — starts with: ' + CLAUDE_API_KEY.slice(0, 10) : 'NO — KEY IS MISSING')

async function callGemini(
  prompt: string,
  images?: Array<{ base64: string; mimeType: string }>,
  useHighQuality?: boolean
): Promise<string> {
  const model = useHighQuality ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'

  const content: any[] = []
  if (images && images.length > 0) {
    for (const img of images) {
      content.push({ type: 'image', source: { type: 'base64', media_type: img.mimeType, data: img.base64 } })
    }
  }
  content.push({ type: 'text', text: prompt })

  console.log('Calling Claude API...', { model, hasImages: !!images?.length })

  const response = await fetch(CLAUDE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: 'user', content }] })
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
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const result = JSON.parse(cleaned)
    return result
  } catch (e) {
    console.error('[safeParseJSON] Failed to parse:', e, 'Input was:', text.slice(0, 300))
    return fallback
  }
}

const STRONG_URL_PATTERNS = ['github.com', 'figma.com', 'notion.so', 'vercel.app', 'netlify.app', 'docs.google.com', 'drive.google.com', 'loom.com', 'linear.app', 'jira.', 'trello.com', 'miro.com']

// ── AI-1: GOAL DECOMPOSITION ──

export interface GeneratedTask {
  day: number
  task_text: string
  task_type: 'build' | 'research' | 'review'
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
