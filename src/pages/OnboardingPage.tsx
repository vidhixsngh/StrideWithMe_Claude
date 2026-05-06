import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Rss, PlusCircle, BookOpen, User, Lock, Users, Globe, Sprout } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { createSprint, createTasks, calculateEndDate } from '../lib/db'

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
  const [sprintLength, setSprintLength] = useState<number | null>(null)
  const [visibility, setVisibility] = useState<Visibility>('PRIVATE')
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

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
      const today = new Date().toISOString().split('T')[0]
      const endDate = calculateEndDate(today, sprintLength)

      const sprint = await createSprint({
        user_id: user.id,
        goal_text: goal,
        goal_category: 'general',
        sprint_length: sprintLength,
        visibility: visibility,
        start_date: today,
        end_date: endDate,
      })

      if (!sprint) {
        setSubmitError('Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      const placeholderTasks = [
        { sprint_id: sprint.id, day_number: 1, task_text: 'Define your core value proposition', task_type: 'research' as const },
        { sprint_id: sprint.id, day_number: 2, task_text: 'Map your target customer', task_type: 'research' as const },
        { sprint_id: sprint.id, day_number: 3, task_text: 'Write hero copy for your approach', task_type: 'build' as const },
        { sprint_id: sprint.id, day_number: 4, task_text: 'Identify your 3 closest competitors', task_type: 'research' as const },
        { sprint_id: sprint.id, day_number: 5, task_text: 'Build a clickable prototype or outline', task_type: 'build' as const },
      ]

      await createTasks(placeholderTasks)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Sprint creation error:', err)
      setSubmitError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
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
        {step === 1 && <Step1Goal goal={goal} setGoal={setGoal} onNext={() => goToStep(2)} />}
        {step === 2 && (
          <Step2Sprint sprintLength={sprintLength} setSprintLength={setSprintLength} onNext={() => goToStep(3)} />
        )}
        {step === 3 && (
          <Step3Visibility visibility={visibility} setVisibility={setVisibility} onNext={() => goToStep(4)} />
        )}
        {step === 4 && <Step4Preview goal={goal} onBegin={handleBeginDay1} submitting={submitting} submitError={submitError} />}
      </div>

      {/* Bottom Nav */}
      <div
        className="w-full max-w-[430px] px-6 pb-4 pt-2 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--color-primary-200)' }}
      >
        <NavIcon icon={<Home size={20} />} />
        <NavIcon icon={<Rss size={20} />} />
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#3D7A5F' }}
        >
          <PlusCircle size={24} color="white" />
        </div>
        <NavIcon icon={<BookOpen size={20} />} />
        <NavIcon icon={<User size={20} />} />
      </div>
    </div>
  )
}

function NavIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center w-10 h-10" style={{ color: 'var(--color-text-secondary)' }}>
      {icon}
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
        backgroundColor: '#3D7A5F',
        borderRadius: 'var(--radius-btn)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: '14px',
        fontWeight: 500,
        letterSpacing: '0.01em',
        border: 'none',
        boxShadow: '0 4px 20px rgba(61, 122, 95, 0.30)',
      }}
    >
      {label}
    </button>
  )
}

/* ============ STEP 1 ============ */
function Step1Goal({
  goal,
  setGoal,
  onNext,
}: {
  goal: string
  setGoal: (v: string) => void
  onNext: () => void
}) {
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

      <div className="mt-auto" style={{ paddingBottom: '32px' }}>
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
  const options = [7, 14, 30]

  return (
    <div className="flex-1 flex flex-col">
      <StepLabel step={2} label="Your sprint" />
      <Heading>How much time do we have?</Heading>
      <Subtext>
        Pick what feels honest — not what sounds impressive. You can always run another sprint after.
      </Subtext>

      <div className="flex flex-col gap-3" style={{ marginTop: '24px' }}>
        {options.map((days) => (
          <button
            key={days}
            onClick={() => setSprintLength(days)}
            className="w-full flex items-center justify-center"
            style={{
              height: '56px',
              borderRadius: 'var(--radius-btn)',
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              fontWeight: 500,
              cursor: 'pointer',
              ...(sprintLength === days
                ? {
                    backgroundColor: '#3D7A5F',
                    color: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(61, 122, 95, 0.25)',
                  }
                : {
                    backgroundColor: '#FFFFFF',
                    color: '#2D4A3E',
                    border: '1px solid #B8D9CC',
                    boxShadow: 'none',
                  }),
            }}
          >
            {days} days
          </button>
        ))}
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
}: {
  visibility: Visibility
  setVisibility: (v: Visibility) => void
  onNext: () => void
}) {
  const options: { value: Visibility; icon: React.ReactNode; title: string; desc: string }[] = [
    { value: 'PRIVATE', icon: <Lock size={20} />, title: 'Just me for now', desc: 'Your logs stay completely private' },
    { value: 'COHORT', icon: <Users size={20} />, title: 'My sprint group', desc: 'A small group building alongside you' },
    { value: 'PUBLIC', icon: <Globe size={20} />, title: 'Building in public', desc: 'Your journey is visible to anyone' },
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
              className="w-full flex items-center gap-4 p-4 text-left"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '20px',
                border: isSelected ? '1.5px solid #3D7A5F' : '1px solid #D4EDE3',
                boxShadow: isSelected
                  ? '0 0 0 2px rgba(61, 122, 95, 0.15)'
                  : '0 2px 12px rgba(45, 90, 71, 0.06)',
                cursor: 'pointer',
              }}
            >
              <div style={{ color: isSelected ? '#3D7A5F' : '#9BBFB2' }}>{opt.icon}</div>
              <div>
                <p
                  className="font-semibold"
                  style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: '#2D4A3E', margin: 0 }}
                >
                  {opt.title}
                </p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#6B9E8A', margin: 0 }}>
                  {opt.desc}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-auto" style={{ paddingBottom: '32px' }}>
        <CTAButton label="Got it, let's go →" onClick={onNext} />
      </div>
    </div>
  )
}

/* ============ STEP 4 ============ */
function Step4Preview({ goal, onBegin, submitting, submitError }: { goal: string; onBegin: () => void; submitting?: boolean; submitError?: string }) {
  return (
    <div className="flex-1 flex flex-col">
      <StepLabel step={4} label="Your plan" />
      <Heading>Here's your first 5 days</Heading>
      <Subtext>
        I've mapped this out based on your goal. Think of it as a starting point — we'll adapt as you go.
      </Subtext>

      {/* Goal card */}
      <div
        className="p-4"
        style={{
          background: '#B8D9CC',
          border: '1.5px solid #7AB5A0',
          borderRadius: '20px',
          marginTop: '24px',
          marginBottom: '16px',
        }}
      >
        <p
          className="uppercase"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '10px',
            letterSpacing: '0.1em',
            color: '#3D7A5F',
            margin: '0 0 4px 0',
          }}
        >
          Your 30-Day Commitment
        </p>
        <p
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '16px',
            fontStyle: 'italic',
            color: '#1A3028',
            margin: 0,
          }}
        >
          {goal}
        </p>
      </div>

      {/* Day cards */}
      <div className="flex flex-col gap-3 mb-4">
        {PLACEHOLDER_TASKS.map((task, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3"
            style={CARD_STYLE}
          >
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#D4EDE3',
                color: '#3D7A5F',
                borderRadius: '10px',
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {i + 1}
            </div>
            <div>
              <p
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: '#7AB5A0',
                  margin: '0 0 2px 0',
                }}
              >
                Day {i + 1}
              </p>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                lineHeight: 1.5,
                color: '#2D4A3E',
                margin: 0,
              }}>
                {task}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div
        className="flex items-start gap-3 p-4 mb-6"
        style={{
          backgroundColor: '#E4F5ED',
          border: 'none',
          borderLeft: '3px solid #7AB5A0',
          borderRadius: '12px',
        }}
      >
        <Sprout size={20} style={{ color: '#3D7A5F', flexShrink: 0, marginTop: '2px' }} />
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          fontStyle: 'italic',
          color: '#3D7A5F',
          margin: 0,
        }}>
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
