import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import WelcomeDashboard from '../components/WelcomeDashboard'
import { useAuth } from '../context/AuthContext'
import { getActiveSprint, getLogsForSprint, getTodayTask, getTodayLog, calculateDayNumber } from '../lib/db'
import type { Sprint, Task, DailyLog } from '../lib/db'
import { shouldTriggerReplan, generateReplan, getReplanThreshold } from '../lib/gemini'
import { createTasks, getTasksForSprint } from '../lib/db'
import { supabase } from '../lib/supabase'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [todayTask, setTodayTask] = useState<Task | null>(null)
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [showFullPlan, setShowFullPlan] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskText, setEditTaskText] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const dragRef = useRef<number | null>(null)
  const [replanNeeded, setReplanNeeded] = useState(false)
  const [replanLoading, setReplanLoading] = useState(false)
  const [replanDone, setReplanDone] = useState(false)

  useEffect(() => {
    if (!user) return
    loadDashboard()
  }, [user])

  async function loadDashboard() {
    setLoading(true)
    const activeSprint = await getActiveSprint(user!.id)

    if (!activeSprint) {
      setLoading(false)
      return
    }

    setSprint(activeSprint)

    const dayNumber = calculateDayNumber(activeSprint.start_date)

    const [sprintLogs, todayT, todayL, allTasks] = await Promise.all([
      getLogsForSprint(activeSprint.id),
      getTodayTask(activeSprint.id, dayNumber),
      getTodayLog(activeSprint.id, dayNumber),
      getTasksForSprint(activeSprint.id),
    ])

    setLogs(sprintLogs)
    setTodayTask(todayT)
    setTodayLog(todayL)
    setUpcomingTasks(allTasks.filter(t => t.day_number >= dayNumber).slice(0, 5))

    const shouldReplan = shouldTriggerReplan(sprintLogs, dayNumber, activeSprint.sprint_length)
    if (shouldReplan) setReplanNeeded(true)

    setLoading(false)
  }

  async function handleReplan() {
    if (!sprint) return
    setReplanLoading(true)

    const allTasks = await getTasksForSprint(sprint.id)
    const dn = calculateDayNumber(sprint.start_date)
    const missedDays = Array.from({ length: dn }, (_, i) => i + 1)
      .filter(d => !logs.find(l => l.day_number === d && l.log_type === 'VERIFIED'))
    const daysRemaining = sprint.sprint_length - dn

    const newTasks = await generateReplan({
      goalText: sprint.goal_text,
      originalTasks: allTasks.map(t => ({ day: t.day_number, task_text: t.task_text, task_type: t.task_type })),
      completedLogs: logs.map(l => ({ day_number: l.day_number, log_text: l.log_text, log_type: l.log_type })),
      missedDays,
      daysRemaining,
      currentDay: dn,
      sprintLength: sprint.sprint_length,
    })

    await supabase.from('tasks').delete().eq('sprint_id', sprint.id).gt('day_number', dn)
    await createTasks(newTasks.map(t => ({ sprint_id: sprint.id, day_number: t.day, task_text: t.task_text, task_type: t.task_type })))

    setReplanLoading(false)
    setReplanDone(true)
    setReplanNeeded(false)
    setTimeout(() => setReplanDone(false), 3000)
    loadDashboard()
  }

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #FBFAF6 0%, #F8F6F1 50%, #F5F2EC 100%)', maxWidth: '430px', margin: '0 auto' }}>
        <span style={{ fontSize: '56px', display: 'inline-block', animation: 'swimmer 1.6s ease-in-out infinite' }}>🏊</span>
      </div>
    )
  }

  // No sprint state
  if (!sprint) {
    return <WelcomeDashboard />
  }

  // Derived values
  const dayNumber = calculateDayNumber(sprint.start_date)
  const daysLeft = Math.max(sprint.sprint_length - dayNumber, 0)
  const verifiedCount = logs.filter(l => l.log_type === 'VERIFIED').length
  const honestCount = logs.filter(l => l.log_type === 'HONEST').length
  const percentComplete = Math.round((dayNumber / sprint.sprint_length) * 100)
  const todayLogged = todayLog !== null

  const dayStreak = (() => {
    if (!logs.length) return 0
    let streak = 0
    for (let d = dayNumber; d >= 1; d--) {
      const log = logs.find(l => l.day_number === d)
      if (log) streak++
      else break
    }
    return streak
  })()

  const bestStreak = (() => {
    let best = 0
    let current = 0
    for (let d = 1; d <= dayNumber; d++) {
      const log = logs.find(l => l.day_number === d)
      if (log) { current++; best = Math.max(best, current) }
      else { current = 0 }
    }
    return best
  })()

  // Heatmap data
  const totalCells = Math.ceil(sprint.sprint_length / 7) * 7
  const heatmapDays = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i + 1
    if (dayNum > sprint.sprint_length) return { dayNum, type: 'EMPTY' as const }
    const log = logs.find(l => l.day_number === dayNum)
    const isToday = dayNum === dayNumber
    const isFuture = dayNum > dayNumber
    // Log state always wins over today marker
    if (log?.log_type === 'VERIFIED') return { dayNum, type: 'VERIFIED' as const }
    if (log?.log_type === 'HONEST') return { dayNum, type: 'HONEST' as const }
    if (isToday) return { dayNum, type: 'TODAY' as const }
    if (isFuture) return { dayNum, type: 'UPCOMING' as const }
    return { dayNum, type: 'MISSED' as const }
  })

  // Recent logs
  const recentLogs = [...logs].sort((a, b) => b.day_number - a.day_number).slice(0, 5)

  // Format dates
  const startFormatted = new Date(sprint.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endFormatted = new Date(sprint.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <PageWrapper>
      {/* Top Nav */}
      <div className="flex items-center justify-between" style={{ height: '56px', padding: '0 20px' }}>
        <div className="flex items-center gap-2">
          <img src="/icon-192.png" alt="StrideWithMe" style={{ width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0, objectFit: 'cover' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#1A3028' }}>
            StrideWithMe
          </span>
        </div>
        <div className="flex items-center gap-3">
          {(() => {
            const avatarUrl = (user?.user_metadata as Record<string, unknown> | undefined)?.avatar_url as string | undefined
              ?? (user?.user_metadata as Record<string, unknown> | undefined)?.picture as string | undefined
            const initials = (user?.user_metadata?.full_name || user?.email || 'U').slice(0, 2).toUpperCase()
            return (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: avatarUrl ? '#FFFFFF' : 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', overflow: 'hidden' }}>
                {avatarUrl ? <img src={avatarUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Sprint Hero Card */}
      <div
        style={{
          margin: '16px',
          borderRadius: '24px',
          backgroundColor: '#1C3D30',
          padding: '20px',
          minHeight: '160px',
        }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#7AB5A0' }} />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                letterSpacing: '0.1em',
                fontStyle: 'italic',
                color: '#7AB5A0',
                textTransform: 'uppercase',
              }}
            >
              Active Sprint
            </span>
          </div>
          {/* Circular progress */}
          <div className="flex flex-col items-center" style={{ position: 'relative' }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="4"
              />
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="#7AB5A0"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - dayNumber / sprint.sprint_length)}`}
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>
                {dayNumber}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#7AB5A0' }}>
                of {sprint.sprint_length}
              </div>
            </div>
          </div>
        </div>

        {/* Goal text */}
        <p
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '18px',
            color: '#FFFFFF',
            marginTop: '12px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
          }}
        >
          {sprint.goal_text}
        </p>

        {/* Stats row */}
        <div className="flex justify-between" style={{ marginTop: '16px' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
              {daysLeft}
            </span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#7AB5A0', margin: 0 }}>days left</p>
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
              {dayStreak}
            </span>
            <span style={{ marginLeft: '2px' }}>🔥</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#7AB5A0', margin: 0 }}>day streak</p>
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: '#F59E4A' }}>
              {percentComplete}%
            </span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#7AB5A0', margin: 0 }}>complete</p>
          </div>
        </div>
      </div>

      {/* Replan Banner */}
      {replanNeeded && !replanDone && (
        <div style={{ margin: '0 16px 12px', background: 'linear-gradient(135deg, #FEF8F0, #FEF3E8)', borderRadius: '20px', padding: '16px', border: '1px solid #F5D5A8' }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 600, color: '#1A3028', margin: '0 0 4px' }}>🔄 Life happened. Your plan can adapt.</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 12px' }}>You've had {getReplanThreshold(sprint.sprint_length)} consecutive hard days. Want us to rebuild your remaining plan?</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={handleReplan} disabled={replanLoading} style={{ height: '38px', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', border: 'none', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', padding: '0 16px', opacity: replanLoading ? 0.6 : 1, boxShadow: '0 4px 12px rgba(107,176,72,0.25)' }}>
              {replanLoading ? 'Regenerating...' : 'Regenerate my plan →'}
            </button>
            <button onClick={() => setReplanNeeded(false)} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#9BBFB2', cursor: 'pointer' }}>Keep original plan</button>
          </div>
        </div>
      )}
      {replanDone && (
        <div style={{ margin: '0 16px 12px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#3D7A5F' }}>✓ Your plan has been updated</p>
        </div>
      )}

      {/* Today Card */}
      <div
        style={{
          margin: '0 16px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1.5px solid #EDF2EF',
          boxShadow: '0 2px 12px rgba(45, 90, 71, 0.06)',
          padding: '16px',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} color="#7AB5A0" />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#7AB5A0' }}>
              TODAY · DAY {dayNumber}
            </span>
          </div>
          {todayLogged ? (
            <div
              className="flex items-center gap-1"
              style={{
                backgroundColor: '#D4EDE3',
                borderRadius: '9999px',
                padding: '4px 10px',
              }}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#3D7A5F' }}>✓ Logged today</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1"
              style={{
                backgroundColor: '#FEF3E8',
                borderRadius: '9999px',
                padding: '4px 10px',
              }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E4A' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#D97706' }}>Awaiting log</span>
            </div>
          )}
        </div>

        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          fontWeight: 500,
          color: '#1A3028',
          margin: '8px 0',
        }}>
          {todayTask?.task_text ?? 'Your task for today is being prepared...'}
        </p>

        <button
          onClick={() => navigate('/log')}
          className="w-full flex items-center justify-center"
          style={{
            height: '48px',
            background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)',
            color: '#FFFFFF',
            borderRadius: '9999px',
            border: 'none',
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)',
          }}
        >
          {todayLogged ? "View today's log →" : "Log today's progress →"}
        </button>
      </div>

      {/* Your Plan */}
      {upcomingTasks.length > 0 && (
        <div style={{ margin: '16px 16px 0', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid #EDF2EF', padding: '16px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028' }}>Your plan</span>
            <button onClick={() => setShowFullPlan(!showFullPlan)} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#3D7A5F', background: 'none', border: 'none', cursor: 'pointer' }}>
              {showFullPlan ? 'Show less' : 'View all →'}
            </button>
          </div>
          {showFullPlan && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: '0 0 8px' }}>Tap any task to edit · Drag to reorder</p>
          )}
          <div
            onTouchMove={(e) => {
              if (dragRef.current === null) return
              const y = e.touches[0].clientY
              const cards = document.querySelectorAll('[data-plan-card]')
              let over = dragRef.current
              cards.forEach((card, idx) => { const r = card.getBoundingClientRect(); if (y > r.top && y < r.bottom) over = idx })
              setDragOverIdx(over)
            }}
            onTouchEnd={() => {
              if (dragRef.current !== null && dragOverIdx !== null && dragRef.current !== dragOverIdx && sprint) {
                const displayedTasks = showFullPlan ? upcomingTasks : upcomingTasks.slice(0, 3)
                const updated = [...displayedTasks]
                const [moved] = updated.splice(dragRef.current, 1)
                updated.splice(dragOverIdx, 0, moved)
                // Save reorder to DB
                Promise.all(updated.map((t, idx) =>
                  supabase.from('tasks').update({ day_number: upcomingTasks[0].day_number + idx }).eq('id', t.id)
                )).then(() => loadDashboard())
              }
              dragRef.current = null
              setDragIdx(null)
              setDragOverIdx(null)
            }}
          >
          {(showFullPlan ? upcomingTasks : upcomingTasks.slice(0, 3)).map((task, idx) => {
            const isToday = task.day_number === dayNumber
            const log = logs.find(l => l.day_number === task.day_number)
            const isEditing = editingTaskId === task.id
            return (
              <div
                key={task.id}
                data-plan-card
                onTouchStart={() => {
                  if (editingTaskId || !showFullPlan) return
                  dragRef.current = idx
                  setDragIdx(idx)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '8px 0',
                  borderBottom: '1px solid #F5F5F5',
                  opacity: dragIdx === idx ? 0.5 : 1,
                  borderLeft: dragOverIdx === idx && dragIdx !== idx ? '3px solid #3D7A5F' : '3px solid transparent',
                  transition: 'opacity 0.15s ease',
                  touchAction: showFullPlan && !editingTaskId ? 'none' : 'auto',
                }}
              >
                {/* Day chip */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                  {showFullPlan && !log && <span style={{ fontSize: '8px', color: '#B8D9CC', lineHeight: 1, userSelect: 'none' }}>⠿</span>}
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: log ? '#3D7A5F' : isToday ? '#FFFFFF' : '#D4EDE3', border: isToday && !log ? '2px solid #3D7A5F' : 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)', fontSize: isToday && !log ? '14px' : '11px', fontWeight: 600, color: log ? '#FFFFFF' : isToday ? '#1A3028' : '#6B9E8A' }}>
                    {isToday && !log ? '🌱' : task.day_number}
                  </div>
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: isToday ? '#3D7A5F' : '#9BBFB2', fontStyle: 'italic', margin: '0 0 2px' }}>
                    Day {task.day_number}{isToday ? ' · Today' : ''}{log ? ' · ✓' : ''}
                  </p>
                  {isEditing ? (
                    <div>
                      <input
                        value={editTaskText}
                        onChange={(e) => setEditTaskText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            supabase.from('tasks').update({ task_text: editTaskText.trim() }).eq('id', task.id).then(() => { setEditingTaskId(null); loadDashboard() })
                          }
                          if (e.key === 'Escape') setEditingTaskId(null)
                        }}
                        autoFocus
                        style={{ width: '100%', border: '1.5px solid #3D7A5F', borderRadius: '8px', padding: '6px 8px', fontFamily: 'var(--font-body)', fontSize: '13px', color: '#1A3028', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button onClick={() => { supabase.from('tasks').update({ task_text: editTaskText.trim() }).eq('id', task.id).then(() => { setEditingTaskId(null); loadDashboard() }) }} style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 500, color: '#FFFFFF', backgroundColor: '#3D7A5F', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingTaskId(null)} style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#9BBFB2', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p
                      onClick={() => { if (showFullPlan && !log) { setEditingTaskId(task.id); setEditTaskText(task.task_text) } }}
                      style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: log ? '#6B9E8A' : '#1A3028', margin: 0, textDecoration: log ? 'line-through' : 'none', cursor: showFullPlan && !log ? 'pointer' : 'default' }}
                    >
                      {task.task_text}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div
        style={{
          margin: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
        }}
      >
        {[
          { emoji: '✅', value: verifiedCount, label: 'Verified' },
          { emoji: '🤍', value: honestCount, label: 'Honest' },
          { emoji: '🔥', value: dayStreak, label: 'Streak' },
          { emoji: '⭐', value: bestStreak, label: 'Best' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #EDF2EF',
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px' }}>{stat.emoji}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: '#1A3028' }}>
              {stat.value}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#6B9E8A' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div
        style={{
          margin: '0 16px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #EDF2EF',
          padding: '16px',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028' }}>
            Your {sprint.sprint_length}-day journey
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A' }}>
            {startFormatted} — {endFormatted}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {heatmapDays.map((d, i) => {
            if (d.type === 'EMPTY') return <div key={i} style={{ width: '28px', height: '28px' }} />
            if (d.type === 'TODAY') return (
              <div key={i} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', border: '2px solid #3D7A5F', borderRadius: '6px', boxSizing: 'border-box', fontSize: '18px', lineHeight: 1 }}>🌱</div>
            )
            return (
              <div
                key={i}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  ...(d.type === 'VERIFIED' ? { backgroundColor: '#3D7A5F' } :
                    d.type === 'HONEST' ? { backgroundColor: '#F59E4A' } :
                    d.type === 'UPCOMING' ? { backgroundColor: '#D4EDE3' } :
                    { backgroundColor: '#FFFFFF', border: '1.5px solid #D4EDE3' }),
                }}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#3D7A5F' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#6B9E8A' }}>Verified</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#F59E4A' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#6B9E8A' }}>Honest day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#FFFFFF', border: '1.5px solid #D4EDE3', boxSizing: 'border-box' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#6B9E8A' }}>Missed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px' }}>🌱</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#6B9E8A' }}>Today</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#D4EDE3' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#6B9E8A' }}>Upcoming</span>
          </div>
        </div>
      </div>

      {/* Recent Days */}
      <div style={{ margin: '16px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028' }}>
            Recent days
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/feed')}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontStyle: 'italic',
                color: '#3D7A5F',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Feed →
            </button>
            <button
              onClick={() => navigate('/log')}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontStyle: 'italic',
                color: '#3D7A5F',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Log today →
            </button>
          </div>
        </div>

        {recentLogs.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', textAlign: 'center', padding: '20px 0' }}>No logs yet. Start with Day 1 →</p>
        ) : (
          recentLogs.map((log) => (
            <div
              key={log.id}
              className="flex"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #EDF2EF',
                padding: '14px',
                marginBottom: '8px',
                gap: '12px',
              }}
            >
              {/* Day badge */}
              <div
                className="flex flex-col items-center justify-center shrink-0"
                style={{
                  width: '40px',
                  borderRadius: '10px',
                  padding: '6px 0',
                  backgroundColor: log.log_type === 'VERIFIED' ? '#D4EDE3' : '#FEF3E8',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    color: log.log_type === 'VERIFIED' ? '#3D7A5F' : '#D97706',
                  }}
                >
                  DAY
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: log.log_type === 'VERIFIED' ? '#3D7A5F' : '#D97706',
                  }}
                >
                  {log.day_number}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1" style={{ minWidth: 0 }}>
                <div className="flex items-center gap-1">
                  <span style={{ fontSize: '12px' }}>{log.log_type === 'VERIFIED' ? '✅' : '🤍'}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '11px',
                      fontWeight: 700,
                      fontStyle: 'italic',
                      color: log.log_type === 'VERIFIED' ? '#3D7A5F' : '#D97706',
                    }}
                  >
                    {log.log_type === 'VERIFIED' ? 'Verified' : 'Honest check-in'}
                  </span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  color: '#1A3028',
                  margin: '4px 0',
                }}>
                  {log.log_text || 'No details logged.'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </PageWrapper>
  )
}
