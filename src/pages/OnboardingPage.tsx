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
    const result = await generateSprintPlan(goal, sprintLength ?? 30, 'general')
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
        {step === 1 && <Step1Goal goal={goal} setGoal={setGoal} onNext={() => goToStep(2)} />}
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
  generatingPlan,
}: {
  visibility: Visibility
  setVisibility: (v: Visibility) => void
  onNext: () => void
  generatingPlan?: boolean
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
        <CTAButton label={generatingPlan ? "Building your plan..." : "Got it, let's go →"} disabled={generatingPlan} onClick={onNext} />
      </div>
    </div>
  )
}

/* ============ STEP 4 ============ */
function Step4Preview({ goal, onBegin, submitting, submitError, aiTasks, wasVague, onRegenerate, generatingPlan, onUpdateTasks }: { goal: string; onBegin: () => void; submitting?: boolean; submitError?: string; aiTasks?: GeneratedTask[]; wasVague?: boolean; onRegenerate?: () => void; generatingPlan?: boolean; onUpdateTasks?: (tasks: GeneratedTask[]) => void }) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskText, setNewTaskText] = useState('')
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

  const handleMoveUp = (index: number) => {
    if (!onUpdateTasks || !aiTasks || index === 0) return
    const updated = [...aiTasks]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    onUpdateTasks(updated.map((t, i) => ({ ...t, day: i + 1 })))
  }

  const handleMoveDown = (index: number) => {
    if (!onUpdateTasks || !aiTasks || index >= tasks.length - 1) return
    const updated = [...aiTasks]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    onUpdateTasks(updated.map((t, i) => ({ ...t, day: i + 1 })))
  }

  const handleAddTask = () => {
    if (!onUpdateTasks || !aiTasks || !newTaskText.trim()) return
    const newTask: GeneratedTask = { day: aiTasks.length + 1, task_text: newTaskText.trim(), task_type: 'build' }
    onUpdateTasks([...aiTasks, newTask])
    setNewTaskText('')
    setAddingTask(false)
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
      {wasVague && (
        <div style={{ backgroundColor: '#FEF3E8', border: '1px solid #F5D5A8', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#D97706', margin: 0 }}>We made some assumptions about your goal. Edit any task below that doesn't fit your actual plan.</p>
        </div>
      )}
      <div className="flex flex-col gap-3 mb-4" onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {tasks.map((task, i) => (
          <div
            key={i}
            data-task-card
            onTouchStart={(e) => onTouchStart(i, e)}
            style={{
              ...CARD_STYLE,
              padding: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              opacity: dragIndex === i ? 0.5 : 1,
              borderColor: dragOverIndex === i && dragIndex !== i ? '#3D7A5F' : undefined,
              borderWidth: dragOverIndex === i && dragIndex !== i ? '2px' : undefined,
              transition: 'opacity 0.15s ease, border-color 0.15s ease',
              touchAction: editingIndex !== null ? 'auto' : 'none',
            }}
          >
            {/* Drag handle + Day number */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
              <span style={{ fontSize: '10px', color: '#B8D9CC', lineHeight: 1, cursor: 'grab', userSelect: 'none' }}>⠿</span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#D4EDE3',
                  color: '#3D7A5F',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {i + 1}
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.08em', color: '#7AB5A0', margin: '0 0 2px', textTransform: 'uppercase' }}>
                Day {i + 1}
              </p>

              {editingIndex === i ? (
                <div>
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingIndex(null) }}
                    autoFocus
                    style={{ width: '100%', border: '1.5px solid #3D7A5F', borderRadius: '8px', padding: '6px 8px', fontFamily: 'var(--font-body)', fontSize: '13px', color: '#1A3028', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button onClick={handleSaveEdit} style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 500, color: '#FFFFFF', backgroundColor: '#3D7A5F', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingIndex(null)} style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#9BBFB2', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => handleEdit(i)}
                  style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.5, color: '#2D4A3E', margin: 0, cursor: 'pointer' }}
                >
                  {task.task_text}
                </p>
              )}
            </div>

            {/* Actions */}
            {editingIndex !== i && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                {i > 0 && (
                  <button onClick={() => handleMoveUp(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#9BBFB2', padding: '2px', lineHeight: 1 }}>↑</button>
                )}
                {i < tasks.length - 1 && (
                  <button onClick={() => handleMoveDown(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#9BBFB2', padding: '2px', lineHeight: 1 }}>↓</button>
                )}
                {tasks.length > 1 && (
                  <button onClick={() => handleDelete(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#D97706', padding: '2px', lineHeight: 1 }}>✕</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add task */}
      {addingTask ? (
        <div style={{ marginBottom: '12px' }}>
          <input
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setAddingTask(false) }}
            placeholder="Write your custom task..."
            autoFocus
            style={{ width: '100%', border: '1.5px solid #D4EDE3', borderRadius: '10px', padding: '10px 12px', fontFamily: 'var(--font-body)', fontSize: '13px', color: '#1A3028', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => (e.target.style.borderColor = '#3D7A5F')}
            onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button onClick={handleAddTask} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: '#FFFFFF', backgroundColor: '#3D7A5F', border: 'none', borderRadius: '9999px', padding: '6px 14px', cursor: 'pointer' }}>Add task</button>
            <button onClick={() => { setAddingTask(false); setNewTaskText('') }} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#9BBFB2', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingTask(true)} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#3D7A5F', background: 'none', border: '1px dashed #B8D9CC', borderRadius: '10px', padding: '10px', cursor: 'pointer', marginBottom: '12px', width: '100%' }}>
          + Add a custom task
        </button>
      )}

      {/* Regenerate */}
      {onRegenerate && (
        <button onClick={onRegenerate} disabled={generatingPlan} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#3D7A5F', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: '12px' }}>
          {generatingPlan ? '↺ Regenerating...' : '↺ Regenerate entire plan'}
        </button>
      )}
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
