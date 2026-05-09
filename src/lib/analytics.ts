/* Lightweight typed wrapper around the Mixpanel snippet loaded in index.html. */

type Props = Record<string, unknown>

interface MixpanelStub {
  track: (event: string, props?: Props) => void
  identify: (id: string) => void
  alias: (alias: string, original?: string) => void
  reset: () => void
  register: (props: Props) => void
  register_once: (props: Props) => void
  people: {
    set: (props: Props) => void
    set_once: (props: Props) => void
    increment: (prop: string, by?: number) => void
  }
  start_session_recording?: () => void
}

declare global {
  interface Window {
    mixpanel?: MixpanelStub
  }
}

function mp(): MixpanelStub | undefined {
  return typeof window !== 'undefined' ? window.mixpanel : undefined
}

export function track(event: string, props?: Props) {
  try { mp()?.track(event, props) } catch (e) { console.warn('[mixpanel]', e) }
}

export function identify(userId: string, peopleProps?: Props) {
  try {
    mp()?.identify(userId)
    if (peopleProps) mp()?.people.set(peopleProps)
  } catch (e) { console.warn('[mixpanel]', e) }
}

export function setPeople(props: Props) {
  try { mp()?.people.set(props) } catch (e) { console.warn('[mixpanel]', e) }
}

export function setPeopleOnce(props: Props) {
  try { mp()?.people.set_once(props) } catch (e) { console.warn('[mixpanel]', e) }
}

export function incrementPeople(prop: string, by = 1) {
  try { mp()?.people.increment(prop, by) } catch (e) { console.warn('[mixpanel]', e) }
}

export function registerSuper(props: Props) {
  try { mp()?.register(props) } catch (e) { console.warn('[mixpanel]', e) }
}

export function reset() {
  try { mp()?.reset() } catch (e) { console.warn('[mixpanel]', e) }
}

/* ── Strongly typed event names — keeps Mixpanel dashboards clean ── */
export const Events = {
  // Acquisition
  WelcomeCtaClicked: 'Welcome CTA Clicked',
  AuthSignupCompleted: 'Auth Signup Completed',
  AuthSigninCompleted: 'Auth Signin Completed',
  AuthSignedOut: 'Auth Signed Out',

  // Onboarding
  OnboardingStarted: 'Onboarding Started',
  OnboardingStepCompleted: 'Onboarding Step Completed',
  GoalSet: 'Goal Set',
  PastReflectionAdded: 'Past Reflection Added',
  ExtraContextUsed: 'Extra Context Used',
  PlanGenerated: 'Plan Generated',
  PlanRegenerated: 'Plan Regenerated',
  TaskEdited: 'Task Edited',
  SprintStarted: 'Sprint Started',

  // Core engagement
  LogPageOpened: 'Log Page Opened',
  LogVerifyAttempted: 'Log Verify Attempted',
  LogVerified: 'Log Verified',
  LogVerificationFailed: 'Log Verification Failed',
  LogHonestSubmitted: 'Log Honest Submitted',
  FeedPostCreated: 'Feed Post Created',
  AiInsightShown: 'AI Insight Shown',

  // Feed
  FeedScopeChanged: 'Feed Scope Changed',
  FeedReactionAdded: 'Feed Reaction Added',
  CohortLockShown: 'Cohort Lock Shown',

  // Records
  SprintRecordViewed: 'Sprint Record Viewed',
  RecordShareClicked: 'Record Share Clicked',
  LockedSprintTapped: 'Locked Sprint Tapped',

  // Dashboard
  DashboardSprintSwitched: 'Dashboard Sprint Switched',
  StartNewSprintClicked: 'Start New Sprint Clicked',

  // Reminders / push
  ReminderEnabled: 'Reminder Enabled',
  ReminderDisabled: 'Reminder Disabled',
  ReminderTimeChanged: 'Reminder Time Changed',
  PushPermissionRequested: 'Push Permission Requested',
  PushPermissionGranted: 'Push Permission Granted',
  PushPermissionDenied: 'Push Permission Denied',
  IosInstallNudgeShown: 'iOS Install Nudge Shown',

  // PWA
  PwaInstallPromptShown: 'PWA Install Prompt Shown',
  PwaInstalled: 'PWA Installed',

  // Errors
  ErrorOccurred: 'Error Occurred',
} as const

export type EventName = (typeof Events)[keyof typeof Events]
