import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Users, Globe, Sprout, ChevronLeft } from 'lucide-react'
import PlanGeneratingScreen from '../components/PlanGeneratingScreen'
import { useAuth } from '../context/AuthContext'
import { createSprint, createTasks, calculateEndDate, updateReminderSettings, setSprintPhaseThemes } from '../lib/db'
import { enablePush, isPushSupported, isStandaloneInstalled, isIOS } from '../lib/push'
import { supabase } from '../lib/supabase'
import { generateSprintPlan, assessGoalScope } from '../lib/gemini'
import type { GeneratedTask, ScopeAssessment } from '../lib/gemini'
import { track, Events, setPeople, incrementPeople } from '../lib/analytics'

type Visibility = 'PRIVATE' | 'COHORT' | 'PUBLIC'

const PLACEHOLDER_TASKS = [
  'Define your core value proposition in one sentence. Rewrite it 5 times.',
  'Map your target customer: write a 1-page persona with their biggest pain.',
  'Write the hero copy for your landing page — headline, subheadline, CTA.',
  'Identify your 3 closest competitors. Note their weakest point.',
  'Build a clickable prototype of your core feature in Figma or on paper.',
]

const CARD_STYLE: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.85)',
  border: '1px solid #EDF2EF',
  boxShadow: '0 2px 12px rgba(45, 90, 71, 0.06)',
  borderRadius: '20px',
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState('')
  const [pastReflection, setPastReflection] = useState('')
  const [sprintLength, setSprintLength] = useState<number | null>(null)
  const [visibility, setVisibility] = useState<Visibility>('PRIVATE')
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [aiTasks, setAiTasks] = useState<GeneratedTask[]>([])
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [wasVague, setWasVague] = useState(false)
  const [, setPlanGenerated] = useState(false)
  const [extraContext, setExtraContext] = useState('')
  const [hasUsedExtraContext, setHasUsedExtraContext] = useState(false)
  const [scopeAssessment, setScopeAssessment] = useState<ScopeAssessment | null>(null)
  const [scopeModalState, setScopeModalState] = useState<'closed' | 'unrealistic'>('closed')
  const [assessingScope, setAssessingScope] = useState(false)
  const [phaseThemes, setPhaseThemes] = useState<Record<string, string> | undefined>(undefined)

  const goToStep = (next: number) => {
    setDirection('out')
    setAnimating(true)
    track(Events.OnboardingStepCompleted, { from: step, to: next })
    setTimeout(() => {
      setStep(next)
      setDirection('in')
      setTimeout(() => setAnimating(false), 300)
    }, 200)
  }

  const handleBeginDay1 = async () => {
    if (!user || !sprintLength) return
    setSubmitting(true)
    setSubmitError('')

    try {
      // Ensure profile exists before creating sprint
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
      if (!existingProfile) {
        await supabase.from('profiles').upsert({ id: user.id, display_name: user.user_metadata?.full_name ?? user.email ?? '' })
      }

      const today = new Date().toISOString().split('T')[0]
      const endDate = calculateEndDate(today, sprintLength)

      console.log('[Onboarding] Creating sprint:', { userId: user.id, goal, sprintLength, visibility, today, endDate })
      const sprint = await createSprint({
        user_id: user.id,
        goal_text: goal,
        goal_category: 'general',
        sprint_length: sprintLength!,
        visibility: visibility,
        start_date: today,
        end_date: endDate,
      })

      console.log('[Onboarding] Sprint result:', sprint)
      if (!sprint) {
        setSubmitError('Failed to create sprint. Check console for details.')
        setSubmitting(false)
        return
      }

      const tasksToSave = aiTasks.map((t, index) => ({
        sprint_id: sprint.id,
        day_number: index + 1,
        task_text: t.task_text,
        task_type: t.task_type ?? 'build',
        ongoing_habits: t.ongoing_habits ?? [],
        rationale: t.rationale ?? null,
      }))

      console.log('[Onboarding] Inserting tasks:', tasksToSave.length)
      const tasksOk = await createTasks(tasksToSave)
      console.log('[Onboarding] Tasks result:', tasksOk)

      // Persist phase themes (only present in 15/30-day Foundation-mode generation)
      if (phaseThemes) {
        await setSprintPhaseThemes(sprint.id, phaseThemes)
      }

      track(Events.SprintStarted, {
        sprint_id: sprint.id,
        sprint_length: sprintLength,
        visibility,
        had_past_reflection: !!pastReflection?.trim(),
        had_extra_context: !!extraContext?.trim(),
      })
      setPeople({ has_active_sprint: true, last_sprint_started_at: new Date().toISOString() })
      incrementPeople('total_sprints_started', 1)

      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Sprint creation error:', err)
      setSubmitError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  // Pass 1: assess scope. If unrealistic, pause for user input.
  // Pass 2 (proceedToPlanGeneration): generate full plan and advance to Step 4.
  const handleGoToStep4 = async () => {
    setAssessingScope(true)
    const assessment = await assessGoalScope(goal, sprintLength ?? 30)
    setAssessingScope(false)
    setScopeAssessment(assessment)

    if (assessment.scope === 'unrealistic') {
      setScopeModalState('unrealistic')
      return // pause — wait for user to accept reframe / revise / override
    }
    await proceedToPlanGeneration(goal)
  }

  const proceedToPlanGeneration = async (effectiveGoal: string) => {
    setGeneratingPlan(true)
    track(Events.PlanGenerated, {
      sprint_length: sprintLength,
      visibility,
      goal_length: effectiveGoal.length,
      has_past_reflection: !!pastReflection?.trim(),
      has_extra_context: !!extraContext?.trim(),
      scope: scopeAssessment?.scope ?? 'realistic',
    })
    // Progressive generation: 15+ day sprints get Foundation-only, others get full
    const mode = (sprintLength ?? 30) >= 14 ? 'foundation' : 'full'
    const result = await generateSprintPlan(effectiveGoal, sprintLength ?? 30, 'general', pastReflection, extraContext, mode)
    setAiTasks(result.tasks)
    setWasVague(result.wasVague)
    setPhaseThemes(result.phase_themes)
    setPlanGenerated(true)
    setGeneratingPlan(false)
    if (pastReflection?.trim()) track(Events.PastReflectionAdded, { length: pastReflection.length })
    goToStep(4)
  }

  const handleRegenerateWithContext = async (text: string) => {
    setExtraContext(text)
    setHasUsedExtraContext(true)
    setGeneratingPlan(true)
    track(Events.PlanRegenerated, { length: text.length })
    track(Events.ExtraContextUsed, { length: text.length })
    const mode = (sprintLength ?? 30) >= 14 ? 'foundation' : 'full'
    const result = await generateSprintPlan(goal, sprintLength ?? 30, 'general', pastReflection, text, mode)
    setAiTasks(result.tasks)
    setWasVague(result.wasVague)
    setPhaseThemes(result.phase_themes)
    setPlanGenerated(true)
    setGeneratingPlan(false)
  }

  const transitionStyle: React.CSSProperties = {
    opacity: animating && direction === 'out' ? 0 : 1,
    transform: animating && direction === 'out' ? 'translateY(8px)' : 'translateY(0)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
  }

  return (
    <div
      className="flex flex-col items-center"
      style={{
        background: 'linear-gradient(180deg, #EAF5F0 0%, #F0F7F4 35%, #F5F0E8 100%)',
        minHeight: '100vh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Progress Bar */}
      <div className="w-full max-w-[430px] px-6 pt-4 flex" style={{ gap: '4px' }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className="flex-1"
            style={{
              height: '3px',
              borderRadius: '9999px',
              backgroundColor: s <= step ? '#7AB5A0' : '#D4EDE3',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="w-full max-w-[430px] px-6 flex-1 flex flex-col" style={transitionStyle}>
        {step === 1 && <Step1Goal goal={goal} setGoal={setGoal} pastReflection={pastReflection} setPastReflection={setPastReflection} onNext={() => goToStep(2)} />}
        {step === 2 && (
          <Step2Sprint sprintLength={sprintLength} setSprintLength={setSprintLength} onNext={() => goToStep(3)} onBack={() => goToStep(1)} />
        )}
        {step === 3 && (
          <Step3Visibility visibility={visibility} setVisibility={setVisibility} onNext={handleGoToStep4} generatingPlan={generatingPlan} onBack={() => goToStep(2)} />
        )}
        {step === 4 && <Step4Preview goal={goal} sprintLength={sprintLength ?? 30} onBegin={() => goToStep(5)} submitError={undefined} aiTasks={aiTasks} wasVague={wasVague} generatingPlan={generatingPlan} pastReflection={pastReflection} extraContext={extraContext} hasUsedExtraContext={hasUsedExtraContext} onRegenerateWithContext={handleRegenerateWithContext} onBack={() => goToStep(3)} scopeAssessment={scopeAssessment} phaseThemes={phaseThemes} />}
        {step === 5 && <Step5Reminder onBeginDay1={handleBeginDay1} submitting={submitting} submitError={submitError} onBack={() => goToStep(4)} />}
      </div>

      {/* Unrealistic-scope modal — pause flow before plan generation */}
      {scopeModalState === 'unrealistic' && scopeAssessment && (
        <>
          <div onClick={() => setScopeModalState('closed')} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9998 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 40px)', maxWidth: '380px', zIndex: 9999, background: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 24px 64px rgba(28,61,48,0.22)' }}>
            <div style={{ width: '52px', height: '52px', margin: '0 auto 14px', borderRadius: '50%', background: 'linear-gradient(135deg, #FEF3E8 0%, #F5D5A8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🪞</div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.12em', color: '#D97706', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 700, textAlign: 'center' }}>An honest take</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 600, color: '#1A3028', margin: '0 0 10px', letterSpacing: '-0.01em', textAlign: 'center', lineHeight: 1.3 }}>
              {sprintLength} days isn't enough for this goal
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#3D5949', margin: '0 0 14px', lineHeight: 1.55, textAlign: 'center' }}>
              {scopeAssessment.message}
            </p>
            {scopeAssessment.reframed_goal && (
              <div style={{ background: 'linear-gradient(135deg, rgba(118,197,72,0.10) 0%, rgba(118,197,72,0.04) 100%)', border: '1.5px solid rgba(107,176,72,0.30)', borderRadius: '14px', padding: '12px 14px', marginBottom: '16px' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A9A3A', margin: '0 0 4px', fontWeight: 700 }}>🌱 Reframed goal</p>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontStyle: 'italic', color: '#1A3028', margin: 0, lineHeight: 1.5 }}>
                  "{scopeAssessment.reframed_goal}"
                </p>
              </div>
            )}
            <button
              onClick={async () => {
                if (!scopeAssessment.reframed_goal) return
                setGoal(scopeAssessment.reframed_goal)
                setScopeModalState('closed')
                await proceedToPlanGeneration(scopeAssessment.reframed_goal)
              }}
              style={{ width: '100%', height: '46px', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', border: 'none', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 4px 12px rgba(107,176,72,0.25)', marginBottom: '8px' }}
            >
              Use the reframed goal →
            </button>
            <button
              onClick={() => { setScopeModalState('closed'); goToStep(1) }}
              style={{ width: '100%', height: '40px', background: '#FFFFFF', border: '1px solid #D4EDE3', color: '#3D7A5F', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', marginBottom: '8px' }}
            >
              Edit my goal
            </button>
            <button
              onClick={async () => {
                setScopeModalState('closed')
                await proceedToPlanGeneration(goal)
              }}
              style={{ width: '100%', background: 'none', border: 'none', color: '#9BBFB2', fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', cursor: 'pointer', padding: '6px' }}
            >
              I understand — generate the plan anyway
            </button>
          </div>
        </>
      )}

      {/* Quick scope assessment loader — coach reading your goal */}
      {assessingScope && <ScopeCheckLoader />}

      {generatingPlan && (
        <PlanGeneratingScreen sprintLength={sprintLength ?? 30} goalText={goal} />
      )}
    </div>
  )
}

function StepLabel({ step, label }: { step: number; label: string }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '11px',
        fontStyle: 'italic',
        color: '#7AB5A0',
        margin: 0,
        paddingTop: '24px',
        letterSpacing: '0.01em',
      }}
    >
      Step {step} of 5 — {label}
    </p>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'none',
        border: 'none',
        padding: '6px 10px 6px 0',
        cursor: 'pointer',
        color: '#6B9E8A',
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        fontStyle: 'italic',
        marginTop: '12px',
        marginLeft: '-10px',
      }}
    >
      <ChevronLeft size={16} /> Back
    </button>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '22px',
        fontWeight: 700,
        color: '#1A3028',
        lineHeight: 1.2,
        margin: '12px 0 0 0',
      }}
    >
      {children}
    </h1>
  )
}

function Subtext({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        fontStyle: 'italic',
        color: '#6B9E8A',
        lineHeight: 1.6,
        margin: '12px 0 0 0',
        letterSpacing: '0.01em',
      }}
    >
      {children}
    </p>
  )
}

function CTAButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 text-white transition-opacity"
      style={{
        background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)',
        borderRadius: 'var(--radius-btn)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: '14px',
        fontWeight: 500,
        letterSpacing: '0.01em',
        border: 'none',
        boxShadow: '0 8px 24px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)',
      }}
    >
      {label}
    </button>
  )
}

/* ============ STEP 1 ============ */
const GOAL_THEMES: { key: string; label: string; emoji: string; goals: string[] }[] = [
  {
    key: 'build', label: 'Build', emoji: '🚀',
    goals: [
      'Ship my SaaS landing page and get 10 waitlist signups',
      'Build and launch a Notion template business',
      'Create a clickable prototype of my product idea',
      'Launch my first newsletter with 50 subscribers',
    ],
  },
  {
    key: 'career', label: 'Career', emoji: '💼',
    goals: [
      'Land my first 3 freelance clients with custom outreach',
      'Build a portfolio that gets me a senior PM role',
      'Switch from engineering to product management',
      'Apply to 30 roles with personalised cover letters',
    ],
  },
  {
    key: 'fitness', label: 'Fitness', emoji: '🏃',
    goals: [
      'Run a 5K and build a daily morning workout habit',
      'Train for and complete a half-marathon',
      'Hit the gym 4× a week and gain 3kg of muscle',
      'Yoga every morning and 10K steps every day',
    ],
  },
  {
    key: 'skills', label: 'Skills', emoji: '📚',
    goals: [
      'Finish writing the first draft of my technical e-book',
      'Build 3 portfolio projects in a new framework',
      'Read one book a week and write reflections',
      'Complete a certification course end-to-end',
    ],
  },
  {
    key: 'mental', label: 'Mental wellness', emoji: '🧘',
    goals: [
      'Meditate 10 minutes daily and journal nightly',
      'Take a screen-free hour every evening',
      'Write a gratitude entry every single day',
      'Build a calming evening wind-down ritual',
    ],
  },
  {
    key: 'money', label: 'Money', emoji: '💰',
    goals: [
      'Track every rupee spent and cut my expenses by 20%',
      'Build a 3-month emergency fund',
      'Start a monthly index fund SIP and stay consistent',
      'Earn my first 10K in side income this month',
    ],
  },
  {
    key: 'content', label: 'Content', emoji: '✍️',
    goals: [
      'Post one LinkedIn article every weekday',
      'Publish 30 days of build-in-public posts on X',
      'Record and ship my first 5 short-form videos',
      'Grow my newsletter to 500 engaged subscribers',
    ],
  },
  {
    key: 'health', label: 'Health', emoji: '❤️',
    goals: [
      'Cook every meal at home and improve my energy levels',
      'Sleep 8 hours daily and build a calm morning routine',
      'Cut sugar and processed food for 30 days',
      'Track water intake and hit 3L every day',
    ],
  },
]

function Step1Goal({
  goal,
  setGoal,
  pastReflection,
  setPastReflection,
  onNext,
}: {
  goal: string
  setGoal: (v: string) => void
  pastReflection: string
  setPastReflection: (v: string) => void
  onNext: () => void
}) {
  const [activeTheme, setActiveTheme] = useState<string | null>(null)
  const goalCommitted = goal.length >= 10
  return (
    <div className="flex-1 flex flex-col">
      <StepLabel step={1} label="Your commitment" />
      <Heading>
        What's the one thing
        <br />
        you're going after?
      </Heading>
      <Subtext>
        No pressure — just tell me like you'd tell a friend. The more real it is, the better I can help.
      </Subtext>

      <textarea
        value={goal}
        onChange={(e) => setGoal(e.target.value.slice(0, 800))}
        maxLength={800}
        placeholder="e.g. I want to land my first freelance client in 30 days. I've been putting it off and I'm ready to actually do it."
        className="w-full p-4 resize-none outline-none"
        style={{
          marginTop: '24px',
          minHeight: '160px',
          ...CARD_STYLE,
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'var(--color-text-primary)',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#3D7A5F')}
        onBlur={(e) => (e.target.style.borderColor = '#EDF2EF')}
      />

      <div className="flex justify-between mt-2">
        <span
          className="italic"
          style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#7AB5A0' }}
        >
          The more specific, the more real it feels.
        </span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#7AB5A0' }}>
          {goal.length} chars
        </span>
      </div>

      {/* Theme picker — only when no goal is committed yet */}
      {!goalCommitted && (
        <div style={{ marginTop: '20px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', marginBottom: '10px', letterSpacing: '0.04em' }}>
            ✨ Need inspiration? Pick a theme
          </p>
          <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', margin: '0 -24px', padding: '0 24px 4px', scrollbarWidth: 'none' }}>
            {GOAL_THEMES.map((t) => {
              const isActive = activeTheme === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTheme(isActive ? null : t.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    background: isActive ? 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)' : 'rgba(255,255,255,0.85)',
                    border: isActive ? 'none' : '1px solid #E8F0EC',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: isActive ? '#FFFFFF' : '#3D5949',
                    boxShadow: isActive ? '0 4px 12px rgba(107,176,72,0.25)' : 'none',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: '13px' }}>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>

          {/* Goals for active theme */}
          {activeTheme && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
              {(GOAL_THEMES.find((t) => t.key === activeTheme)?.goals ?? []).map((g, i) => (
                <button
                  key={i}
                  onClick={() => setGoal(g)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '10px 14px',
                    background: 'rgba(118,197,72,0.06)',
                    border: '1px solid rgba(107,176,72,0.20)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: '#3D5949',
                    fontStyle: 'italic',
                    lineHeight: 1.45,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6BB048'; e.currentTarget.style.background = 'rgba(118,197,72,0.12)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(107,176,72,0.20)'; e.currentTarget.style.background = 'rgba(118,197,72,0.06)' }}
                >
                  <span style={{ color: '#6BB048', fontSize: '11px', flexShrink: 0, marginTop: '1px' }}>›</span>
                  <span>{g}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Optional reflection — takes the same slot once a goal is committed */}
      {goalCommitted && (
        <div style={{ marginTop: '20px', padding: '14px 16px', background: 'linear-gradient(135deg, rgba(245,213,71,0.06) 0%, rgba(118,197,72,0.06) 100%)', borderRadius: '14px', border: '1px solid rgba(184,217,204,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px' }}>🪞</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', letterSpacing: '0.08em', color: '#5A9A3A', textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>
              One reflection · Optional
            </p>
          </div>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', color: '#1A3028', margin: '0 0 4px', fontWeight: 500, lineHeight: 1.4 }}>
            What came through the last time you tried chasing a goal?
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 10px', lineHeight: 1.5 }}>
            Lost steam by Day 6? Burned out? Got busy? — naming it helps the AI tailor your plan around what tripped you up.
          </p>
          <textarea
            value={pastReflection}
            onChange={(e) => setPastReflection(e.target.value)}
            placeholder="Last time I tried, I…"
            style={{
              width: '100%',
              minHeight: '80px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #D4EDE3',
              padding: '10px 12px',
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              lineHeight: 1.55,
              color: '#2D4A3E',
              fontStyle: pastReflection ? 'normal' : 'italic',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#7AB5A0')}
            onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
          />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', margin: '4px 0 0', textAlign: 'right' }}>
            {pastReflection.length > 0 ? `${pastReflection.length} chars · skip if you want` : 'Skip if you want'}
          </p>
        </div>
      )}

      <div className="mt-auto" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
        <CTAButton label="This is my goal →" disabled={goal.length < 10} onClick={onNext} />
      </div>
    </div>
  )
}

/* ============ STEP 2 ============ */
function Step2Sprint({
  sprintLength,
  setSprintLength,
  onNext,
  onBack,
}: {
  sprintLength: number | null
  setSprintLength: (v: number) => void
  onNext: () => void
  onBack?: () => void
}) {
  const options = [
    { days: 7, title: '7 days', subtitle: 'A focused mini-sprint', tagline: 'Best for goals you can wrap up in a week — ship a feature, finish a draft, run a test.', tag: 'Quick wins' },
    { days: 14, title: '14 days', subtitle: 'Two weeks of momentum', tagline: 'A sweet spot — long enough to build a real habit, short enough to feel close.', tag: 'Most popular' },
    { days: 30, title: '30 days', subtitle: 'A full transformation arc', tagline: "When you mean it. Big goals — your first client, a launched product, a new role — happen here.", tag: 'Most rewarding' },
  ]

  return (
    <div className="flex-1 flex flex-col">
      {onBack && <BackButton onClick={onBack} />}
      <StepLabel step={2} label="Your sprint" />
      <Heading>How much time do we have?</Heading>
      <Subtext>
        Pick what feels honest — not what sounds impressive. You can always run another sprint after.
      </Subtext>

      <div className="flex flex-col gap-3" style={{ marginTop: '24px' }}>
        {options.map((opt) => {
          const isSelected = sprintLength === opt.days
          return (
            <button
              key={opt.days}
              onClick={() => setSprintLength(opt.days)}
              style={{
                width: '100%',
                padding: '16px 18px',
                borderRadius: '16px',
                background: isSelected ? 'linear-gradient(135deg, rgba(118,197,72,0.10) 0%, rgba(107,176,72,0.06) 100%)' : '#FFFFFF',
                border: isSelected ? '1.5px solid #6BB048' : '1px solid #E8F0EC',
                boxShadow: isSelected ? '0 8px 20px rgba(107,176,72,0.15)' : '0 1px 4px rgba(28,61,48,0.04)',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Tag pill */}
              <span style={{ position: 'absolute', top: '12px', right: '14px', fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', color: isSelected ? '#FFFFFF' : '#5A9A3A', backgroundColor: isSelected ? '#6BB048' : 'rgba(107,176,72,0.10)', borderRadius: '9999px', padding: '3px 9px', fontWeight: 600 }}>
                {opt.tag}
              </span>

              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 600, color: '#1A3028', letterSpacing: '-0.02em' }}>{opt.title}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: isSelected ? '#5A9A3A' : '#6B9E8A' }}>· {opt.subtitle}</span>
              </div>

              {/* Tagline */}
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#6B9E8A', lineHeight: 1.55, margin: '6px 28px 0 0', fontStyle: 'italic' }}>
                {opt.tagline}
              </p>

              {/* Selected indicator */}
              {isSelected && (
                <div style={{ position: 'absolute', bottom: '14px', right: '14px', width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 700, boxShadow: '0 2px 6px rgba(107,176,72,0.3)' }}>✓</div>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-auto" style={{ paddingBottom: '32px' }}>
        <CTAButton label="This works for me →" disabled={sprintLength === null} onClick={onNext} />
      </div>
    </div>
  )
}

/* ============ STEP 3 ============ */
function Step3Visibility({
  visibility,
  setVisibility,
  onNext,
  generatingPlan,
  onBack,
}: {
  visibility: Visibility
  setVisibility: (v: Visibility) => void
  onNext: () => void
  generatingPlan?: boolean
  onBack?: () => void
}) {
  const options: { value: Visibility; icon: React.ReactNode; title: string; subtitle: string; tagline: string; tag: string }[] = [
    { value: 'PRIVATE', icon: <Lock size={18} />, title: 'Just me', subtitle: 'A quiet build', tagline: "Your logs stay completely private. Best for personal goals or when you're not ready to share yet.", tag: 'Most chosen' },
    { value: 'COHORT', icon: <Users size={18} />, title: 'My Cohort', subtitle: 'Build alongside others', tagline: 'A small group going through the same 30 days. You see their logs, they see yours — gentle accountability.', tag: 'Best for momentum' },
    { value: 'PUBLIC', icon: <Globe size={18} />, title: 'Build in public', subtitle: 'Open to the world', tagline: 'Anyone with the link can see your Sprint Record. Best when your goal benefits from an audience.', tag: 'Highest stakes' },
  ]

  return (
    <div className="flex-1 flex flex-col">
      {onBack && <BackButton onClick={onBack} />}
      <StepLabel step={3} label="Your audience" />
      <Heading>Who's in your corner?</Heading>
      <Subtext>
        You're in control. Start private if you need to — you can always open up as you get going.
      </Subtext>

      <div className="flex flex-col gap-3" style={{ marginTop: '24px' }}>
        {options.map((opt) => {
          const isSelected = visibility === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setVisibility(opt.value)}
              style={{
                width: '100%',
                padding: '20px',
                borderRadius: '20px',
                background: isSelected ? 'linear-gradient(135deg, rgba(118,197,72,0.10) 0%, rgba(107,176,72,0.06) 100%)' : '#FFFFFF',
                border: isSelected ? '1.5px solid #6BB048' : '1px solid #E8F0EC',
                boxShadow: isSelected ? '0 8px 20px rgba(107,176,72,0.15)' : '0 1px 4px rgba(28,61,48,0.04)',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Header: icon + title + subtitle, with tag pill on right */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: isSelected ? 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)' : '#F5F8F4', border: isSelected ? 'none' : '1px solid #E8F0EC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? '#FFFFFF' : '#6B9E8A', flexShrink: 0, boxShadow: isSelected ? '0 2px 8px rgba(107,176,72,0.25)' : 'none' }}>
                  {opt.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '17px', fontWeight: 600, color: '#1A3028', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{opt.title}</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: isSelected ? '#5A9A3A' : '#6B9E8A', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.subtitle}</p>
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', letterSpacing: '0.06em', textTransform: 'uppercase', color: isSelected ? '#FFFFFF' : '#5A9A3A', backgroundColor: isSelected ? '#6BB048' : 'rgba(107,176,72,0.10)', borderRadius: '9999px', padding: '3px 9px', fontWeight: 600, flexShrink: 0, alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>
                  {opt.tag}
                </span>
              </div>

              {/* Tagline below */}
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#6B9E8A', lineHeight: 1.55, margin: '12px 0 0', fontStyle: 'italic', paddingRight: isSelected ? '32px' : '0' }}>
                {opt.tagline}
              </p>

              {/* Selected check at bottom-right */}
              {isSelected && (
                <div style={{ position: 'absolute', bottom: '14px', right: '14px', width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 700, boxShadow: '0 2px 6px rgba(107,176,72,0.3)' }}>✓</div>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-auto" style={{ paddingBottom: '32px' }}>
        <CTAButton label={generatingPlan ? "Building your plan..." : "Got it, let's go →"} disabled={generatingPlan} onClick={onNext} />
      </div>
    </div>
  )
}

/* ============ STEP 4 ============ */
function ScopeCheckLoader() {
  const phrases = [
    'Reading your goal carefully…',
    'Checking how much time this realistically takes…',
    'Comparing against similar sprints…',
    'Mapping it onto your timeline…',
    'Almost done — running the numbers…',
  ]
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIdx((v) => (v + 1) % phrases.length), 1800)
    return () => clearInterval(id)
  }, [phrases.length])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'linear-gradient(180deg, #EAF5F0 0%, #F0F7F4 50%, #F5F0E8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '28px', padding: '32px' }}>
      <style>{`
        @keyframes coach-paper-flip { 0%, 18%, 100% { transform: rotate(-3deg) translateY(0); } 25%, 43% { transform: rotate(2deg) translateY(-2px); } 50%, 68% { transform: rotate(-2deg) translateY(0); } 75%, 93% { transform: rotate(3deg) translateY(-1px); } }
        @keyframes coach-magnifier-sweep { 0% { transform: translate(-8px, 6px) rotate(-12deg); } 25% { transform: translate(8px, -4px) rotate(8deg); } 50% { transform: translate(12px, 6px) rotate(-6deg); } 75% { transform: translate(-4px, -2px) rotate(10deg); } 100% { transform: translate(-8px, 6px) rotate(-12deg); } }
        @keyframes coach-sparkle { 0%, 100% { opacity: 0; transform: scale(0.6); } 50% { opacity: 1; transform: scale(1.1); } }
        @keyframes coach-fade { 0% { opacity: 0; transform: translateY(4px); } 12%, 88% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-4px); } }
        @keyframes coach-dot { 0%, 60%, 100% { opacity: 0.25; } 30% { opacity: 1; } }
      `}</style>

      {/* Stage: paper + magnifier + sparkles */}
      <div style={{ position: 'relative', width: '180px', height: '160px' }}>
        {/* Drifting sparkles */}
        <span style={{ position: 'absolute', top: '6px', left: '24px', fontSize: '16px', animation: 'coach-sparkle 2.2s ease-in-out infinite', animationDelay: '0s' }}>✨</span>
        <span style={{ position: 'absolute', top: '12px', right: '20px', fontSize: '14px', animation: 'coach-sparkle 2.4s ease-in-out infinite', animationDelay: '0.7s' }}>✨</span>
        <span style={{ position: 'absolute', bottom: '14px', left: '14px', fontSize: '12px', animation: 'coach-sparkle 2.8s ease-in-out infinite', animationDelay: '1.4s' }}>💭</span>

        {/* Paper stack — gently flipping */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', transformOrigin: 'center', animation: 'coach-paper-flip 3.6s ease-in-out infinite' }}>
            {/* Back papers (offset for depth) */}
            <div style={{ position: 'absolute', top: '-8px', left: '-10px', width: '88px', height: '110px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #D4EDE3', boxShadow: '0 4px 12px rgba(28,61,48,0.08)', transform: 'rotate(-6deg)' }} />
            <div style={{ position: 'absolute', top: '-4px', left: '6px', width: '88px', height: '110px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #D4EDE3', boxShadow: '0 4px 12px rgba(28,61,48,0.08)', transform: 'rotate(4deg)' }} />
            {/* Front paper with goal hint lines */}
            <div style={{ position: 'relative', width: '88px', height: '110px', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #B8D9CC', boxShadow: '0 8px 20px rgba(28,61,48,0.12)', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ width: '55%', height: '4px', background: '#65D454', borderRadius: '2px', opacity: 0.7 }} />
              <div style={{ width: '85%', height: '3px', background: '#D4EDE3', borderRadius: '2px' }} />
              <div style={{ width: '70%', height: '3px', background: '#D4EDE3', borderRadius: '2px' }} />
              <div style={{ width: '90%', height: '3px', background: '#D4EDE3', borderRadius: '2px' }} />
              <div style={{ width: '60%', height: '3px', background: '#D4EDE3', borderRadius: '2px' }} />
              <div style={{ width: '40%', height: '4px', background: '#F59E0B', borderRadius: '2px', opacity: 0.6, marginTop: '4px' }} />
              <div style={{ width: '75%', height: '3px', background: '#D4EDE3', borderRadius: '2px' }} />
            </div>
          </div>
        </div>

        {/* Magnifier sweeping over papers */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-12px', marginLeft: '-12px', fontSize: '44px', filter: 'drop-shadow(0 4px 8px rgba(28,61,48,0.18))', animation: 'coach-magnifier-sweep 3s ease-in-out infinite' }}>
          🔍
        </div>
      </div>

      {/* Rotating coach phrase */}
      <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '260px' }}>
        <p
          key={idx}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontStyle: 'italic',
            color: '#3D5949',
            textAlign: 'center',
            margin: 0,
            animation: 'coach-fade 1.8s ease-in-out',
          }}
        >
          {phrases[idx]}
        </p>
      </div>

      {/* Bouncing dots */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#65D454', animation: 'coach-dot 1.4s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  )
}

function getPhases(total: number): Array<{ name: string; tag: string; from: number; to: number; emoji: string; color: string; accent: string }> {
  // Mirrors db.ts getPhaseBoundaries — keep in sync.
  if (total < 10) {
    const F = Math.max(1, Math.round(total * 0.3))
    const B = Math.max(F + 1, Math.round(total * 0.75))
    return [
      { name: 'Foundation', tag: 'Plant the roots', from: 1, to: F, emoji: '🌱', color: '#65D454', accent: '#A7F3A0' },
      { name: 'Build', tag: 'Stack the wins', from: F + 1, to: B, emoji: '🌿', color: '#14B8A6', accent: '#5EEAD4' },
      { name: 'Finish', tag: 'Land it', from: B + 1, to: total, emoji: '🌻', color: '#8B5CF6', accent: '#C4B5FD' },
    ]
  }
  const F = Math.max(1, Math.round(total * 0.2))
  const B = Math.max(F + 1, Math.round(total * 0.6))
  const P = Math.max(B + 1, Math.round(total * 0.85))
  return [
    { name: 'Foundation', tag: 'Plant the roots', from: 1, to: F, emoji: '🌱', color: '#65D454', accent: '#A7F3A0' },
    { name: 'Build', tag: 'Stack the wins', from: F + 1, to: B, emoji: '🌿', color: '#14B8A6', accent: '#5EEAD4' },
    { name: 'Peak', tag: 'Send it', from: B + 1, to: P, emoji: '⚡', color: '#F59E0B', accent: '#FCD34D' },
    { name: 'Finish', tag: 'Land it', from: P + 1, to: total, emoji: '🌻', color: '#8B5CF6', accent: '#C4B5FD' },
  ]
}

function Step4Preview({ goal, sprintLength, onBegin, submitError, aiTasks, wasVague, generatingPlan, pastReflection, extraContext, hasUsedExtraContext, onRegenerateWithContext, onBack, scopeAssessment, phaseThemes }: { goal: string; sprintLength: number; onBegin: () => void; submitting?: boolean; submitError?: string; aiTasks?: GeneratedTask[]; wasVague?: boolean; generatingPlan?: boolean; pastReflection?: string; extraContext?: string; hasUsedExtraContext?: boolean; onRegenerateWithContext?: (text: string) => void; onBack?: () => void; scopeAssessment?: ScopeAssessment | null; phaseThemes?: Record<string, string> }) {
  const [contextOpen, setContextOpen] = useState(false)
  const [contextDraft, setContextDraft] = useState('')
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [ambitiousOpen, setAmbitiousOpen] = useState(false)
  // Phases collapsed by default except Foundation
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({ Foundation: true, Build: false, Peak: false, Finish: false })

  const tasks = aiTasks && aiTasks.length > 0
    ? aiTasks
    : PLACEHOLDER_TASKS.map((t, i) => ({ day: i + 1, task_text: t, task_type: 'build' as const, ongoing_habits: [], rationale: '' }))

  const phases = getPhases(sprintLength)
  const isAmbitious = scopeAssessment?.scope === 'ambitious'

  // Date anchor for "Day 1 starts today" line — uses local time.
  const today = new Date()
  const dayName = today.toLocaleDateString(undefined, { weekday: 'long' })
  const dateStr = today.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  // Foundation Day 1 task — for the inline hero preview inside the Foundation card.
  const day1Task = tasks.find((t) => t.day === 1)

  return (
    <div className="flex-1 flex flex-col">
      {onBack && <BackButton onClick={onBack} />}
      <StepLabel step={4} label="Your plan" />
      <Heading>Your {sprintLength}-day plan</Heading>
      <Subtext>
        Your plan in 4 phases. Foundation unlocks first.
      </Subtext>

      {/* Goal card — heroed */}
      <div style={{ background: 'linear-gradient(135deg, rgba(118,197,72,0.12) 0%, rgba(107,176,72,0.07) 100%)', border: '2px solid rgba(107,176,72,0.45)', borderRadius: '22px', padding: '18px 20px', marginTop: '24px', marginBottom: '10px', position: 'relative', boxShadow: '0 4px 16px rgba(107,176,72,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px' }}>🌱</span>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.12em', color: '#5A9A3A', margin: 0, textTransform: 'uppercase', fontWeight: 700 }}>
            Your commitment
          </p>
        </div>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontStyle: 'italic', fontWeight: 600, color: '#1A3028', margin: 0, lineHeight: 1.35, letterSpacing: '-0.01em' }}>
          {goal}
        </p>
      </div>

      {/* Day 1 anchor */}
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 18px', textAlign: 'center', letterSpacing: '0.02em' }}>
        Day 1 starts today · {dayName}, {dateStr}
      </p>

      {/* Ambitious scope banner — collapsible */}
      {isAmbitious && scopeAssessment?.message && (
        <button
          onClick={() => setAmbitiousOpen(!ambitiousOpen)}
          style={{ background: 'linear-gradient(135deg, rgba(245,158,74,0.10) 0%, rgba(245,158,74,0.04) 100%)', border: '1.5px solid rgba(245,158,74,0.40)', borderRadius: '14px', padding: '10px 14px', marginBottom: '14px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px' }}>⚡</span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.1em', color: '#D97706', margin: 0, textTransform: 'uppercase', fontWeight: 700 }}>
                Ambitious — daily compliance required
              </p>
            </div>
            <span style={{ fontSize: '11px', color: '#D97706', transform: ambitiousOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s ease' }}>▾</span>
          </div>
          {ambitiousOpen && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#3D5949', margin: '6px 0 0', lineHeight: 1.5 }}>
              {scopeAssessment.message}
            </p>
          )}
        </button>
      )}

      {/* Reflection-tailored badge */}
      {pastReflection && pastReflection.trim().length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, rgba(123,111,160,0.10) 0%, rgba(118,197,72,0.06) 100%)', border: '1px solid rgba(123,111,160,0.30)', borderRadius: '14px', padding: '12px 14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px' }}>🪞</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.1em', color: '#7B6FA0', margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>
              Tailored to what tripped you up
            </p>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: 0, lineHeight: 1.5 }}>
            "{pastReflection.trim().length > 110 ? pastReflection.trim().slice(0, 110) + '…' : pastReflection.trim()}"
          </p>
        </div>
      )}

      {wasVague && (
        <div style={{ backgroundColor: '#FEF3E8', border: '1px solid #F5D5A8', borderRadius: '12px', padding: '10px 14px', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>💡</span>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#D97706', margin: 0, lineHeight: 1.5 }}>
            We made some assumptions — tap "Missed something?" below to refine.
          </p>
        </div>
      )}

      {/* Phase timeline — emojis sit ON the line, centered through their vertical midpoint */}
      <div style={{ marginBottom: '24px', padding: '0 4px' }}>
        <div style={{ position: 'relative', height: '32px' }}>
          {/* The line — passes through the vertical center */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              left: 0,
              right: 0,
              height: '4px',
              borderRadius: '9999px',
              background: `linear-gradient(90deg, ${phases.map((p, i) => {
                const cumulativeStart = phases.slice(0, i).reduce((acc, q) => acc + (q.to - q.from + 1), 0)
                const total = phases.reduce((acc, q) => acc + (q.to - q.from + 1), 0)
                const startPct = (cumulativeStart / total) * 100
                const endPct = ((cumulativeStart + (p.to - p.from + 1)) / total) * 100
                return `${p.accent} ${startPct}%, ${p.accent} ${endPct}%`
              }).join(', ')})`,
              opacity: 0.9,
              boxShadow: '0 2px 8px rgba(28,61,48,0.06)',
            }}
          />
          {/* Emoji checkpoints — vertically centered, soft glow, sit ON the line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>
            {phases.map((phase, i) => {
              const span = phase.to - phase.from + 1
              const isFoundation = phase.name === 'Foundation'
              const justify = i === 0 ? 'flex-start' : i === phases.length - 1 ? 'flex-end' : 'flex-start'
              return (
                <div key={phase.name} style={{ flex: span, display: 'flex', justifyContent: justify, alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '22px',
                      lineHeight: 1,
                      filter: isFoundation
                        ? `drop-shadow(0 2px 8px ${phase.color}aa) drop-shadow(0 0 14px ${phase.color}66)`
                        : `drop-shadow(0 2px 6px ${phase.color}66) drop-shadow(0 0 10px ${phase.color}33)`,
                      opacity: isFoundation ? 1 : 0.95,
                      transform: i === phases.length - 1 ? 'translateX(2px)' : i === 0 ? 'translateX(-2px)' : 'none',
                    }}
                  >
                    {phase.emoji}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Phases — full-width cards, no left rail. Soft, premium feel. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        {phases.map((phase) => {
          const phaseTasks = tasks.filter((t) => t.day >= phase.from && t.day <= phase.to)
          const isExpanded = expandedPhases[phase.name] ?? false
          const phaseKey = phase.name.toLowerCase()
          const themeForPhase = phaseThemes?.[phaseKey]
          const hasTasks = phaseTasks.length > 0
          const isFoundation = phase.name === 'Foundation'
          const isLocked = !hasTasks
          return (
            <div
              key={phase.name}
              style={{
                background: isFoundation
                  ? `linear-gradient(135deg, ${phase.color}14 0%, ${phase.accent}0C 100%)`
                  : isLocked
                  ? 'rgba(255,255,255,0.55)'
                  : `linear-gradient(135deg, ${phase.color}0E 0%, ${phase.accent}06 100%)`,
                border: isFoundation
                  ? `1.5px solid ${phase.color}55`
                  : isLocked
                  ? '1px solid rgba(180,200,190,0.35)'
                  : `1px solid ${phase.color}33`,
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: isFoundation
                  ? `0 8px 24px ${phase.color}1A, 0 2px 6px ${phase.color}10`
                  : '0 1px 4px rgba(28,61,48,0.04)',
              }}
            >
              {/* Phase header — tap to toggle. Emoji sits inline at left, soft glow, no circle. */}
              <button
                onClick={() => setExpandedPhases({ ...expandedPhases, [phase.name]: !isExpanded })}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '28px',
                      lineHeight: 1,
                      flexShrink: 0,
                      filter: isLocked
                        ? `drop-shadow(0 2px 6px ${phase.color}33) saturate(0.7)`
                        : `drop-shadow(0 2px 8px ${phase.color}aa) drop-shadow(0 0 12px ${phase.color}55)`,
                      opacity: isLocked ? 0.7 : 1,
                    }}
                  >
                    {phase.emoji}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.1em', color: phase.color, margin: 0, textTransform: 'uppercase', fontWeight: 800 }}>
                        {phase.name}
                      </p>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: isLocked ? '#9BBFB2' : `${phase.color}cc`, fontWeight: 600, background: isLocked ? 'rgba(155,191,178,0.10)' : `${phase.color}15`, padding: '2px 8px', borderRadius: '9999px' }}>
                        Day {phase.from}{phase.from !== phase.to ? `–${phase.to}` : ''}
                      </span>
                      {isFoundation && (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.1em', color: '#FFFFFF', background: `linear-gradient(135deg, ${phase.color}, ${phase.accent})`, padding: '2px 8px', borderRadius: '9999px', fontWeight: 700, textTransform: 'uppercase', boxShadow: `0 2px 6px ${phase.color}55` }}>Live</span>
                      )}
                      {isLocked && (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#9BBFB2', fontWeight: 600 }}>🔒</span>
                      )}
                    </div>
                    <p style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 600, color: '#1A3028', margin: 0, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                      {phase.tag}
                    </p>
                    {themeForPhase && (
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: '4px 0 0', lineHeight: 1.45 }}>
                        {themeForPhase}
                      </p>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: phase.color, transition: 'transform 0.15s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', marginLeft: '8px', flexShrink: 0, opacity: 0.55 }}>▾</span>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {isFoundation && day1Task && (
                    <div style={{ background: `linear-gradient(135deg, ${phase.color}20, ${phase.accent}10)`, border: `1.5px solid ${phase.color}55`, borderRadius: '14px', padding: '12px 14px', marginBottom: '2px' }}>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.14em', color: phase.color, margin: '0 0 5px', textTransform: 'uppercase', fontWeight: 800 }}>
                        ★ Day 1 quest
                      </p>
                      <p style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 500, color: '#1A3028', margin: 0, lineHeight: 1.45 }}>
                        {day1Task.task_text}
                      </p>
                    </div>
                  )}
                  {hasTasks ? (
                    phaseTasks.map((task) => {
                      const day = task.day
                      const expanded = expandedDay === day
                      const habits = task.ongoing_habits ?? []
                      const hasRationale = Boolean(task.rationale && task.rationale.trim().length > 0)
                      return (
                        <button
                          key={day}
                          onClick={(e) => { e.stopPropagation(); setExpandedDay(expanded ? null : day) }}
                          style={{ textAlign: 'left', width: '100%', background: 'rgba(255,255,255,0.95)', border: expanded ? `1.5px solid ${phase.color}` : '1px solid #E8F0EC', borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(28,61,48,0.04)', position: 'relative' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `linear-gradient(135deg, ${phase.color}, ${phase.color}dd)`, color: '#FFFFFF', fontFamily: 'var(--font-heading)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {day}
                            </div>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.45, color: '#2D4A3E', margin: 0, flex: 1, fontWeight: 500, paddingRight: hasRationale ? '52px' : 0 }}>
                              {task.task_text}
                            </p>
                          </div>
                          {habits.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingLeft: '38px' }}>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', alignSelf: 'center' }}>🔁</span>
                              {habits.map((h, k) => (
                                <span key={k} style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#5A9A3A', background: 'rgba(118,197,72,0.10)', border: '1px solid rgba(107,176,72,0.18)', borderRadius: '9999px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                                  {h}
                                </span>
                              ))}
                            </div>
                          )}
                          {expanded && task.rationale && (
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 0 38px', lineHeight: 1.55, borderLeft: `2px solid ${phase.color}`, paddingLeft: '10px' }}>
                              {task.rationale}
                            </p>
                          )}
                          {hasRationale && !expanded && (
                            <span style={{ position: 'absolute', bottom: '8px', right: '10px', fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: phase.color, background: `${phase.color}14`, border: `1px solid ${phase.color}44`, borderRadius: '9999px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <span style={{ fontSize: '10px' }}>ⓘ</span> Why
                            </span>
                          )}
                        </button>
                      )
                    })
                    ) : (
                      <div style={{ padding: '10px 12px', background: `linear-gradient(135deg, ${phase.color}15, ${phase.accent}10)`, border: `1px dashed ${phase.color}55`, borderRadius: '12px' }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.1em', textTransform: 'uppercase', color: phase.color, margin: '0 0 4px', fontWeight: 800 }}>🔒 Unlocks on Day {phase.from}</p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#3D5949', margin: '0 0 6px', lineHeight: 1.5 }}>
                          {themeForPhase ?? phase.tag}
                        </p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', margin: 0, lineHeight: 1.5 }}>
                        Tasks generated when you reach Day {phase.from} — using your actual Foundation progress.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Missed-something context — one-shot tailoring */}
      {!hasUsedExtraContext && onRegenerateWithContext && !contextOpen && (
        <button
          onClick={() => setContextOpen(true)}
          disabled={generatingPlan}
          style={{ width: '100%', fontFamily: 'var(--font-body)', fontSize: '12px', color: '#5A9A3A', background: 'rgba(118,197,72,0.06)', border: '1px dashed rgba(107,176,72,0.45)', borderRadius: '12px', padding: '10px', cursor: generatingPlan ? 'wait' : 'pointer', opacity: generatingPlan ? 0.6 : 1, fontWeight: 500, marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <span style={{ fontSize: '13px' }}>💭</span>
          <span>Missed something? Tell us more.</span>
        </button>
      )}

      {!hasUsedExtraContext && onRegenerateWithContext && contextOpen && (
        <div style={{ marginBottom: '14px', padding: '14px', background: 'rgba(118,197,72,0.06)', border: '1px solid rgba(107,176,72,0.30)', borderRadius: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px' }}>💭</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', letterSpacing: '0.08em', color: '#5A9A3A', textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>
              Add context · One shot
            </p>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#3D5949', margin: '0 0 8px', lineHeight: 1.5 }}>
            Blockers? Tools you'll use? A deadline? A specific deliverable? Anything that should shape the plan.
          </p>
          <textarea
            value={contextDraft}
            onChange={(e) => setContextDraft(e.target.value)}
            placeholder="e.g. I only have 30 mins/day, and I'm using Figma + Vercel. Need to demo to my manager by Day 20."
            style={{
              width: '100%',
              minHeight: '90px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #D4EDE3',
              padding: '10px 12px',
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              lineHeight: 1.55,
              color: '#2D4A3E',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              fontStyle: contextDraft ? 'normal' : 'italic',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#7AB5A0')}
            onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
          />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', margin: '4px 0 10px', textAlign: 'right' }}>
            {contextDraft.length} chars · this regenerate is one-shot
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setContextOpen(false); setContextDraft('') }}
              disabled={generatingPlan}
              style={{ flex: 1, height: '40px', background: '#FFFFFF', border: '1px solid #D4EDE3', color: '#6B9E8A', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              onClick={() => { if (contextDraft.trim().length >= 5) { onRegenerateWithContext(contextDraft.trim()); setContextOpen(false) } }}
              disabled={generatingPlan || contextDraft.trim().length < 5}
              style={{ flex: 2, height: '40px', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', border: 'none', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, cursor: (generatingPlan || contextDraft.trim().length < 5) ? 'not-allowed' : 'pointer', opacity: (generatingPlan || contextDraft.trim().length < 5) ? 0.5 : 1, boxShadow: '0 4px 12px rgba(107,176,72,0.25)' }}
            >
              {generatingPlan ? 'Regenerating…' : 'Regenerate with this →'}
            </button>
          </div>
        </div>
      )}

      {/* Used-once indicator */}
      {hasUsedExtraContext && extraContext && extraContext.trim().length > 0 && (
        <div style={{ marginBottom: '14px', padding: '10px 14px', background: 'rgba(118,197,72,0.06)', border: '1px solid rgba(107,176,72,0.20)', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{ fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>✓</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', letterSpacing: '0.06em', color: '#5A9A3A', margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 600 }}>
              Plan regenerated with your context
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: 0, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
              "{extraContext.trim()}"
            </p>
          </div>
        </div>
      )}

      {/* Info note — minimal sprout green */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', marginBottom: '20px', borderRadius: '12px', background: 'rgba(118,197,72,0.06)', border: '1px solid rgba(107,176,72,0.20)' }}>
        <Sprout size={14} style={{ color: '#5A9A3A', flexShrink: 0 }} />
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#5A9A3A', margin: 0, lineHeight: 1.5 }}>
          The rest unfolds as you show up. No pressure to be perfect — just consistent.
        </p>
      </div>

      <div
        className="mt-auto"
        style={{
          position: 'sticky',
          bottom: 0,
          paddingTop: '12px',
          paddingBottom: '20px',
          marginLeft: '-24px',
          marginRight: '-24px',
          paddingLeft: '24px',
          paddingRight: '24px',
          background: 'linear-gradient(180deg, rgba(245,240,232,0) 0%, rgba(245,240,232,0.88) 30%, rgba(245,240,232,1) 60%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 50,
        }}
      >
        <CTAButton label="Set my daily reminder →" disabled={false} onClick={onBegin} />
        {submitError && (
          <div style={{ backgroundColor: '#FEF3E8', border: '1px solid #F5D5A8', borderRadius: '10px', padding: '10px 14px', marginTop: '8px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#D97706', margin: 0 }}>{submitError}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============ STEP 5 ============ */
function Step5Reminder({
  onBeginDay1,
  submitting,
  submitError,
  onBack,
}: {
  onBeginDay1: () => Promise<void> | void
  submitting?: boolean
  submitError?: string
  onBack?: () => void
}) {
  const { user } = useAuth()
  const [time, setTime] = useState('20:00')
  const [savingAndStarting, setSavingAndStarting] = useState(false)
  const [error, setError] = useState('')
  const needsIosInstall = isIOS() && !isStandaloneInstalled()

  const TZ = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'

  const handleSetAndBegin = async () => {
    if (!user) return
    setSavingAndStarting(true)
    setError('')

    // Save reminder (best-effort; don't block sprint start)
    const result = await updateReminderSettings(user.id, {
      reminder_time: `${time}:00`,
      reminder_timezone: TZ,
      reminder_enabled: true,
    })
    if (!result.ok) {
      setError(`Couldn't save reminder: ${result.error ?? 'unknown'}. We'll still start your sprint.`)
    } else {
      track(Events.ReminderEnabled, { time, timezone: TZ, source: 'onboarding' })
      setPeople({ reminder_time: time, reminder_timezone: TZ, reminder_enabled: true, reminder_set_during_onboarding: true })
      // Fire push subscription in background (non-blocking)
      if (isPushSupported()) {
        track(Events.PushPermissionRequested)
        enablePush(user.id).then((r) => {
          if (r.ok) { track(Events.PushPermissionGranted); setPeople({ push_subscribed: true }) }
          else if (r.reason === 'denied') track(Events.PushPermissionDenied)
        }).catch((e) => console.warn('enablePush:', e))
      }
    }
    // Always continue to start the sprint, save or not.
    // If creation fails, the parent will set submitError — reset the spinner so user can retry.
    try { await onBeginDay1() } finally { setSavingAndStarting(false) }
  }

  const handleSkip = async () => {
    setSavingAndStarting(true)
    track(Events.ReminderSkippedDuringOnboarding, { source: 'onboarding' })
    setPeople({ reminder_set_during_onboarding: false })
    try { await onBeginDay1() } finally { setSavingAndStarting(false) }
  }

  return (
    <div className="flex-1 flex flex-col">
      {onBack && <BackButton onClick={onBack} />}
      <StepLabel step={5} label="Your nudge" />
      <Heading>When should we nudge you?</Heading>
      <Subtext>
        We'll remind you to log if you haven't by this time each day. You can change it later from Profile.
      </Subtext>

      {/* Centered content block — fills available vertical space between subtext and CTA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '20px', paddingBottom: '20px' }}>
        {/* Time picker with sprout-green selected border */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '32px',
              fontWeight: 600,
              color: '#1A3028',
              background: 'linear-gradient(135deg, rgba(118,197,72,0.10) 0%, rgba(118,197,72,0.04) 100%)',
              border: '2px solid #6BB048',
              borderRadius: '14px',
              padding: '12px 18px',
              outline: 'none',
              letterSpacing: '0.02em',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(107,176,72,0.18)',
            }}
          />
        </div>

        {/* Quick presets */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          {[
            { label: '8 AM', value: '08:00' },
            { label: '1 PM', value: '13:00' },
            { label: '6 PM', value: '18:00' },
            { label: '8 PM', value: '20:00' },
            { label: '10 PM', value: '22:00' },
          ].map((p) => {
            const active = time === p.value
            return (
              <button
                key={p.value}
                onClick={() => setTime(p.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '9999px',
                  border: active ? 'none' : '1px solid #E8F0EC',
                  background: active ? 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)' : 'rgba(255,255,255,0.85)',
                  color: active ? '#FFFFFF' : '#3D5949',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: active ? '0 4px 12px rgba(107,176,72,0.25)' : 'none',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'center', margin: '0 0 14px' }}>
          Detected timezone: {TZ}
        </p>

        {/* iOS install card — only when iOS Safari + not standalone */}
        {needsIosInstall && (
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, rgba(118,197,72,0.10) 0%, rgba(245,213,71,0.06) 100%)', border: '1.5px solid rgba(107,176,72,0.30)', borderRadius: '14px', marginBottom: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '15px' }}>📲</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A9A3A', margin: 0, fontWeight: 700 }}>Required on iPhone</p>
          </div>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: '0 0 4px', lineHeight: 1.4 }}>
            Add StrideWithMe to your Home Screen
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 10px', lineHeight: 1.55 }}>
            iOS only delivers notifications when the app lives on your home screen.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { n: '1', t: 'Tap the Share icon', sub: 'Bottom-center of Safari.' },
              { n: '2', t: 'Tap "Add to Home Screen"', sub: 'Scroll the share sheet if needed.' },
              { n: '3', t: 'Open the app from there', sub: 'Reminders start arriving.' },
            ].map((s) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700 }}>{s.n}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#1A3028', margin: 0, lineHeight: 1.35 }}>{s.t}</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', margin: '1px 0 0', lineHeight: 1.4 }}>{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#FEF3E8', border: '1px solid #F5D5A8', borderRadius: '10px', padding: '8px 12px', marginTop: '10px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#D97706', margin: 0 }}>{error}</p>
        </div>
      )}
      </div>

      <div style={{ paddingTop: '8px', paddingBottom: '32px' }}>
        <CTAButton
          label={(savingAndStarting || submitting) ? 'Starting your sprint…' : 'Begin my Day 1 →'}
          disabled={savingAndStarting || submitting}
          onClick={handleSetAndBegin}
        />
        <button
          onClick={handleSkip}
          disabled={savingAndStarting || submitting}
          style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#9BBFB2', cursor: (savingAndStarting || submitting) ? 'wait' : 'pointer', padding: '6px' }}
        >
          Skip for now — I'll set it later
        </button>
        {submitError && (
          <div style={{ backgroundColor: '#FEF3E8', border: '1px solid #F5D5A8', borderRadius: '10px', padding: '10px 14px', marginTop: '8px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#D97706', margin: 0 }}>{submitError}</p>
          </div>
        )}
      </div>
    </div>
  )
}
