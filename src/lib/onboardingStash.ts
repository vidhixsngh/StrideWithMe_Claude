import type { GeneratedTask, ScopeAssessment } from './gemini'

const STASH_KEY = 'stride.onboarding.pendingSprint.v1'
const TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface OnboardingStash {
  goal: string
  sprintLength: number
  visibility: 'PRIVATE' | 'COHORT' | 'PUBLIC'
  pastReflection: string
  extraContext: string
  hasUsedExtraContext: boolean
  aiTasks: GeneratedTask[]
  scopeAssessment: ScopeAssessment | null
  phaseThemes: Record<string, string> | null
  reminderTime: string | null
  savedAt: string
}

export function saveOnboardingStash(stash: OnboardingStash): void {
  try {
    localStorage.setItem(STASH_KEY, JSON.stringify(stash))
  } catch (err) {
    console.error('saveOnboardingStash:', err)
  }
}

export function loadOnboardingStash(): OnboardingStash | null {
  try {
    const raw = localStorage.getItem(STASH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OnboardingStash
    if (parsed.savedAt && Date.now() - new Date(parsed.savedAt).getTime() > TTL_MS) {
      clearOnboardingStash()
      return null
    }
    return parsed
  } catch (err) {
    console.error('loadOnboardingStash:', err)
    return null
  }
}

export function clearOnboardingStash(): void {
  try { localStorage.removeItem(STASH_KEY) } catch { /* ignore */ }
}

export function hasOnboardingStash(): boolean {
  try { return localStorage.getItem(STASH_KEY) !== null } catch { return false }
}
