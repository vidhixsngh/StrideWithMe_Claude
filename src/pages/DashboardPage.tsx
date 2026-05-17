import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import WelcomeDashboard from '../components/WelcomeDashboard'
import { useAuth } from '../context/AuthContext'
import { getAllActiveSprints, getLogsForSprint, getTodayTask, getTodayLog, calculateDayNumber } from '../lib/db'
import type { Sprint, Task, DailyLog } from '../lib/db'
import { shouldTriggerReplan, generateReplan, getReplanThreshold } from '../lib/gemini'
import { createTasks, getTasksForSprint } from '../lib/db'
import { supabase } from '../lib/supabase'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  type SprintData = {
    sprint: Sprint
    logs: DailyLog[]
    todayTask: Task | null
    todayLog: DailyLog | null
    upcomingTasks: Task[]
  }

  const [sprintsData, setSprintsData] = useState<SprintData[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  const sprint = sprintsData[selectedIdx]?.sprint ?? null
  const logs = sprintsData[selectedIdx]?.logs ?? []
  const todayTask = sprintsData[selectedIdx]?.todayTask ?? null
  const todayLog = sprintsData[selectedIdx]?.todayLog ?? null
  const upcomingTasks = sprintsData[selectedIdx]?.upcomingTasks ?? []

  const swipeStartX = useRef<number | null>(null)
  const [replanNeeded, setReplanNeeded] = useState(false)
  const [replanLoading, setReplanLoading] = useState(false)
  const [replanDone, setReplanDone] = useState(false)

  useEffect(() => {
    if (!user) return
    loadDashboard()
  }, [user])

  async function loadDashboard() {
    setLoading(true)
    const activeSprints = await getAllActiveSprints(user!.id)

    if (activeSprints.length === 0) {
      setSprintsData([])
      setLoading(false)
      return
    }

    // Load logs/tasks for each sprint in parallel
    const allData: SprintData[] = await Promise.all(
      activeSprints.map(async (s) => {
        const dn = calculateDayNumber(s.start_date)
        const [sprintLogs, todayT, todayL, allTasks] = await Promise.all([
          getLogsForSprint(s.id),
          getTodayTask(s.id, dn),
          getTodayLog(s.id, dn),
          getTasksForSprint(s.id),
        ])
        return {
          sprint: s,
          logs: sprintLogs,
          todayTask: todayT,
          todayLog: todayL,
          upcomingTasks: allTasks.filter(t => t.day_number >= dn).slice(0, 5),
        }
      })
    )

    setSprintsData(allData)

    // Check replan for currently-selected sprint
    const currentSprint = allData[selectedIdx] ?? allData[0]
    if (currentSprint) {
      const dn = calculateDayNumber(currentSprint.sprint.start_date)
      const shouldReplan = shouldTriggerReplan(currentSprint.logs, dn, currentSprint.sprint.sprint_length)
      if (shouldReplan) setReplanNeeded(true)
    }

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
  if (sprintsData.length === 0) {
    return <WelcomeDashboard />
  }

  if (!sprint) {
    return <WelcomeDashboard />
  }

  // Derived values
  const dayNumber = calculateDayNumber(sprint.start_date)
  const daysLeft = Math.max(sprint.sprint_length - dayNumber, 0)
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
      <div
        onTouchStart={(e) => { swipeStartX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (swipeStartX.current === null || sprintsData.length <= 1) return
          const endX = e.changedTouches[0].clientX
          const diff = swipeStartX.current - endX
          if (Math.abs(diff) > 60) {
            if (diff > 0 && selectedIdx < sprintsData.length - 1) {
              setSelectedIdx(selectedIdx + 1)
            } else if (diff < 0 && selectedIdx > 0) {
              setSelectedIdx(selectedIdx - 1)
            }
          }
          swipeStartX.current = null
        }}
      >
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
              <button onClick={() => navigate('/profile')} aria-label="Open profile" style={{ width: '32px', height: '32px', borderRadius: '50%', background: avatarUrl ? '#FFFFFF' : 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', overflow: 'hidden', border: 'none', cursor: 'pointer', padding: 0, boxShadow: '0 2px 8px rgba(107,176,72,0.20)' }}>
                {avatarUrl ? <img src={avatarUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials}
              </button>
            )
          })()}
        </div>
      </div>

      {/* Sprint switcher pills */}
      {sprintsData.length > 1 && (
        <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 20px 12px', scrollbarWidth: 'none' }}>
          {sprintsData.map((sd, i) => {
            const isActive = i === selectedIdx
            const dn = calculateDayNumber(sd.sprint.start_date)
            const shortGoal = sd.sprint.goal_text.split(' ').slice(0, 3).join(' ')
            return (
              <button
                key={sd.sprint.id}
                onClick={() => setSelectedIdx(i)}
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
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{shortGoal}</span>
                <span style={{ fontSize: '10px', opacity: 0.85 }}>· D{dn}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Sprint Hero Card — solid dark green, no gradient */}
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
          {/* Circular progress (+ verification bloom sparkles) */}
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

      {/* Page indicator dots */}
      {sprintsData.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', margin: '0 16px 12px' }}>
          {sprintsData.map((_, i) => (
            <div key={i} style={{ width: i === selectedIdx ? '20px' : '6px', height: '6px', borderRadius: '9999px', backgroundColor: i === selectedIdx ? '#3D7A5F' : '#D4EDE3', transition: 'width 0.2s ease' }} />
          ))}
        </div>
      )}

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
          onClick={() => navigate('/log', { state: { sprintId: sprint?.id } })}
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

      {/* 30-day journey heatmap — now lives directly under Today's task */}
      <div
        style={{
          margin: '16px 16px 0',
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

      {/* Your Plan — compact preview of Tomorrow + Day after. Full plan lives at /plan. */}
      {(() => {
        const upcomingPreview = upcomingTasks.filter((t) => t.day_number > dayNumber).slice(0, 2)
        return (
          <div style={{ margin: '16px 16px 0', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid #EDF2EF', padding: '16px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Your plan</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: '2px 0 0' }}>What's coming up next</p>
              </div>
              <button onClick={() => navigate('/plan')} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#3D7A5F', background: 'rgba(118,197,72,0.10)', border: '1px solid rgba(107,176,72,0.30)', borderRadius: '9999px', padding: '6px 12px', cursor: 'pointer' }}>
                View full plan →
              </button>
            </div>

            {upcomingPreview.length === 0 ? (
              <div style={{ padding: '14px 12px', background: 'linear-gradient(135deg, rgba(118,197,72,0.08) 0%, rgba(245,213,71,0.04) 100%)', border: '1px dashed rgba(107,176,72,0.30)', borderRadius: '12px' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                  Today is your last task in this phase. Tap <strong>View full plan</strong> to peek at what's ahead.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {upcomingPreview.map((task, idx) => {
                  const label = idx === 0 ? 'Tomorrow' : idx === 1 ? 'Day after' : `Day ${task.day_number}`
                  return (
                    <div
                      key={task.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#FBFAF6', border: '1px solid #EDF2EF', borderRadius: '12px' }}
                    >
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D4EDE3', flexShrink: 0, fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: '#6B9E8A' }}>
                        {task.day_number}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9BBFB2', margin: 0, fontWeight: 600 }}>
                          {label}
                        </p>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#2D4A3E', margin: '2px 0 0', lineHeight: 1.4, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                          {task.task_text}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

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
              onClick={() => navigate('/log', { state: { sprintId: sprint?.id } })}
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
      </div>
    </PageWrapper>
  )
}
