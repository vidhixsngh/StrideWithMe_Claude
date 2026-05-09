import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Users, Globe, Sprout } from 'lucide-react'
import PlanGeneratingScreen from '../components/PlanGeneratingScreen'
import { useAuth } from '../context/AuthContext'
import { createSprint, createTasks, calculateEndDate } from '../lib/db'
import { supabase } from '../lib/supabase'
import { generateSprintPlan } from '../lib/gemini'
import type { GeneratedTask } from '../lib/gemini'

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

  const goToStep = (next: number) => {
    setDirection('out')
    setAnimating(true)
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
      }))

      console.log('[Onboarding] Inserting tasks:', tasksToSave.length)
      const tasksOk = await createTasks(tasksToSave)
      console.log('[Onboarding] Tasks result:', tasksOk)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Sprint creation error:', err)
      setSubmitError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const handleGoToStep4 = async () => {
    setGeneratingPlan(true)
    const result = await generateSprintPlan(goal, sprintLength ?? 30, 'general', pastReflection)
    setAiTasks(result.tasks)
    setWasVague(result.wasVague)
    setPlanGenerated(true)
    setGeneratingPlan(false)
    goToStep(4)
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
        {[1, 2, 3, 4].map((s) => (
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
          <Step2Sprint sprintLength={sprintLength} setSprintLength={setSprintLength} onNext={() => goToStep(3)} />
        )}
        {step === 3 && (
          <Step3Visibility visibility={visibility} setVisibility={setVisibility} onNext={handleGoToStep4} generatingPlan={generatingPlan} />
        )}
        {step === 4 && <Step4Preview goal={goal} onBegin={handleBeginDay1} submitting={submitting} submitError={submitError} aiTasks={aiTasks} wasVague={wasVague} onRegenerate={handleGoToStep4} generatingPlan={generatingPlan} onUpdateTasks={setAiTasks} />}
      </div>

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
      Step {step} of 4 — {label}
    </p>
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
        onChange={(e) => setGoal(e.target.value)}
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
}: {
  sprintLength: number | null
  setSprintLength: (v: number) => void
  onNext: () => void
}) {
  const options = [
    { days: 7, title: '7 days', subtitle: 'A focused mini-sprint', tagline: 'Best for goals you can wrap up in a week — ship a feature, finish a draft, run a test.', tag: 'Quick wins' },
    { days: 14, title: '14 days', subtitle: 'Two weeks of momentum', tagline: 'A sweet spot — long enough to build a real habit, short enough to feel close.', tag: 'Most popular' },
    { days: 30, title: '30 days', subtitle: 'A full transformation arc', tagline: "When you mean it. Big goals — your first client, a launched product, a new role — happen here.", tag: 'Most rewarding' },
  ]

  return (
    <div className="flex-1 flex flex-col">
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
}: {
  visibility: Visibility
  setVisibility: (v: Visibility) => void
  onNext: () => void
  generatingPlan?: boolean
}) {
  const options: { value: Visibility; icon: React.ReactNode; title: string; subtitle: string; tagline: string; tag: string }[] = [
    { value: 'PRIVATE', icon: <Lock size={18} />, title: 'Just me', subtitle: 'A quiet build', tagline: "Your logs stay completely private. Best for personal goals or when you're not ready to share yet.", tag: 'Most chosen' },
    { value: 'COHORT', icon: <Users size={18} />, title: 'My sprint group', subtitle: 'Build alongside others', tagline: 'A small group going through the same 30 days. You see their logs, they see yours — gentle accountability.', tag: 'Best for momentum' },
    { value: 'PUBLIC', icon: <Globe size={18} />, title: 'Build in public', subtitle: 'Open to the world', tagline: 'Anyone with the link can see your Sprint Record. Best when your goal benefits from an audience.', tag: 'Highest stakes' },
  ]

  return (
    <div className="flex-1 flex flex-col">
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
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: isSelected ? '#5A9A3A' : '#6B9E8A', margin: '2px 0 0' }}>{opt.subtitle}</p>
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
function Step4Preview({ goal, onBegin, submitting, submitError, aiTasks, wasVague, onRegenerate, generatingPlan, onUpdateTasks }: { goal: string; onBegin: () => void; submitting?: boolean; submitError?: string; aiTasks?: GeneratedTask[]; wasVague?: boolean; onRegenerate?: () => void; generatingPlan?: boolean; onUpdateTasks?: (tasks: GeneratedTask[]) => void }) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragStartY = useRef(0)
  const dragItemRef = useRef<number | null>(null)

  const tasks = aiTasks && aiTasks.length > 0
    ? aiTasks.slice(0, 5)
    : PLACEHOLDER_TASKS.map((t, i) => ({ day: i + 1, task_text: t, task_type: 'build' as const }))

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditText(tasks[index].task_text)
  }

  const handleSaveEdit = () => {
    if (editingIndex === null || !onUpdateTasks || !aiTasks) return
    const updated = [...aiTasks]
    updated[editingIndex] = { ...updated[editingIndex], task_text: editText.trim() || updated[editingIndex].task_text }
    onUpdateTasks(updated)
    setEditingIndex(null)
    setEditText('')
  }

  const handleDelete = (index: number) => {
    if (!onUpdateTasks || !aiTasks || aiTasks.length <= 1) return
    const updated = aiTasks.filter((_, i) => i !== index).map((t, i) => ({ ...t, day: i + 1 }))
    onUpdateTasks(updated)
  }




  const handleDragDrop = (fromIndex: number, toIndex: number) => {
    if (!onUpdateTasks || !aiTasks || fromIndex === toIndex) return
    const updated = [...aiTasks]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    onUpdateTasks(updated.map((t, i) => ({ ...t, day: i + 1 })))
  }

  const onTouchStart = (index: number, e: React.TouchEvent) => {
    if (editingIndex !== null) return
    dragItemRef.current = index
    dragStartY.current = e.touches[0].clientY
    setDragIndex(index)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (dragItemRef.current === null) return
    const y = e.touches[0].clientY
    const cards = document.querySelectorAll('[data-task-card]')
    let overIdx = dragItemRef.current
    cards.forEach((card, i) => {
      const rect = card.getBoundingClientRect()
      if (y > rect.top && y < rect.bottom) overIdx = i
    })
    setDragOverIndex(overIdx)
  }

  const onTouchEnd = () => {
    if (dragItemRef.current !== null && dragOverIndex !== null) {
      handleDragDrop(dragItemRef.current, dragOverIndex)
    }
    dragItemRef.current = null
    setDragIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="flex-1 flex flex-col">
      <StepLabel step={4} label="Your plan" />
      <Heading>Here's your first 5 days</Heading>
      <Subtext>
        I've mapped this out based on your goal. Tap any task to edit it.
      </Subtext>

      {/* Goal card — sprout green theme */}
      <div style={{ background: 'linear-gradient(135deg, rgba(118,197,72,0.10) 0%, rgba(107,176,72,0.06) 100%)', border: '1.5px solid rgba(107,176,72,0.35)', borderRadius: '20px', padding: '14px 16px', marginTop: '24px', marginBottom: '16px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px' }}>🌱</span>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.1em', color: '#5A9A3A', margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>
            Your commitment
          </p>
        </div>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontStyle: 'italic', color: '#1A3028', margin: 0, lineHeight: 1.4 }}>
          {goal}
        </p>
      </div>

      {/* Editable hint (always shown) */}
      <div style={{ backgroundColor: '#FEF3E8', border: '1px solid #F5D5A8', borderRadius: '12px', padding: '10px 14px', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>💡</span>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#D97706', margin: 0, lineHeight: 1.5 }}>
          {wasVague ? "We made some assumptions. Edit any task below to match your actual plan." : 'Tasks are fully editable. Tap any one to refine it before you begin.'}
        </p>
      </div>

      {/* Section label with hint */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.1em', color: '#5A9A3A', margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>
          Your first 5 days
        </p>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2' }}>Tap to edit · drag to reorder</span>
      </div>

      {/* Day cards — minimal, sprout green */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {tasks.map((task, i) => {
          const isEditing = editingIndex === i
          const isDragOver = dragOverIndex === i && dragIndex !== i
          return (
            <div
              key={i}
              data-task-card
              onTouchStart={(e) => onTouchStart(i, e)}
              style={{
                background: isDragOver ? 'rgba(118,197,72,0.10)' : 'rgba(255,255,255,0.85)',
                border: isDragOver ? '1.5px solid #6BB048' : '1px solid #E8F0EC',
                borderRadius: '14px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: dragIndex === i ? 0.5 : 1,
                transition: 'all 0.15s ease',
                touchAction: editingIndex !== null ? 'auto' : 'none',
                boxShadow: '0 1px 3px rgba(28,61,48,0.04)',
              }}
            >
              {/* Day badge */}
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(107,176,72,0.25)' }}>
                {i + 1}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingIndex(null) }}
                    autoFocus
                    style={{ width: '100%', border: '1.5px solid #6BB048', borderRadius: '8px', padding: '5px 8px', fontFamily: 'var(--font-body)', fontSize: '13px', color: '#1A3028', outline: 'none', boxSizing: 'border-box', background: '#FFFFFF' }}
                  />
                ) : (
                  <p onClick={() => handleEdit(i)} style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.45, color: '#2D4A3E', margin: 0, cursor: 'pointer' }}>
                    {task.task_text}
                  </p>
                )}
              </div>

              {/* Actions */}
              {isEditing ? (
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button onClick={handleSaveEdit} style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: '#FFFFFF', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setEditingIndex(null)} style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#9BBFB2', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', color: '#B8D9CC', cursor: 'grab', userSelect: 'none', padding: '0 4px' }}>⠿</span>
                  {tasks.length > 1 && (
                    <button onClick={() => handleDelete(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#C8DDD5', padding: '4px 6px', lineHeight: 1 }}>✕</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Regenerate */}
      {onRegenerate && (
        <button onClick={onRegenerate} disabled={generatingPlan} style={{ width: '100%', fontFamily: 'var(--font-body)', fontSize: '12px', color: '#5A9A3A', background: 'rgba(118,197,72,0.06)', border: '1px dashed rgba(107,176,72,0.45)', borderRadius: '12px', padding: '10px', cursor: generatingPlan ? 'wait' : 'pointer', opacity: generatingPlan ? 0.6 : 1, fontWeight: 500, marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px' }}>{generatingPlan ? '⏳' : '✨'}</span>
          <span>{generatingPlan ? 'Regenerating plan...' : 'Regenerate plan'}</span>
        </button>
      )}

      {/* Info note — minimal sprout green */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', marginBottom: '20px', borderRadius: '12px', background: 'rgba(118,197,72,0.06)', border: '1px solid rgba(107,176,72,0.20)' }}>
        <Sprout size={14} style={{ color: '#5A9A3A', flexShrink: 0 }} />
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#5A9A3A', margin: 0, lineHeight: 1.5 }}>
          The rest unfolds as you show up. No pressure to be perfect — just consistent.
        </p>
      </div>

      <div className="mt-auto" style={{ paddingBottom: '32px' }}>
        <CTAButton label={submitting ? "Setting up your sprint..." : "I'm ready. Begin Day 1 →"} disabled={submitting} onClick={onBegin} />
        {submitError && (
          <div style={{ backgroundColor: '#FEF3E8', border: '1px solid #F5D5A8', borderRadius: '10px', padding: '10px 14px', marginTop: '8px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#D97706', margin: 0 }}>{submitError}</p>
          </div>
        )}
      </div>
    </div>
  )
}
