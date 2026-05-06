import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Calendar } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import WelcomeDashboard from '../components/WelcomeDashboard'
import { useAuth } from '../context/AuthContext'
import { getActiveSprint, getLogsForSprint, getTodayTask, getTodayLog, calculateDayNumber } from '../lib/db'
import type { Sprint, Task, DailyLog } from '../lib/db'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [todayTask, setTodayTask] = useState<Task | null>(null)
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null)
  const [loading, setLoading] = useState(true)

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

    const [sprintLogs, todayT, todayL] = await Promise.all([
      getLogsForSprint(activeSprint.id),
      getTodayTask(activeSprint.id, dayNumber),
      getTodayLog(activeSprint.id, dayNumber),
    ])

    setLogs(sprintLogs)
    setTodayTask(todayT)
    setTodayLog(todayL)
    setLoading(false)
  }

  // Loading state
  if (loading) {
    return (
      <PageWrapper>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #D4EDE3', borderTopColor: '#3D7A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </PageWrapper>
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
    if (dayNum === dayNumber) return { dayNum, type: 'TODAY' as const }
    if (dayNum > dayNumber) return { dayNum, type: 'UPCOMING' as const }
    const log = logs.find(l => l.day_number === dayNum)
    if (!log) return { dayNum, type: 'MISSED' as const }
    if (log.log_type === 'VERIFIED') return { dayNum, type: 'VERIFIED' as const }
    if (log.log_type === 'HONEST') return { dayNum, type: 'HONEST' as const }
    return { dayNum, type: 'UPCOMING' as const }
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
          <div
            className="flex items-center justify-center"
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: '#3D7A5F',
              borderRadius: '8px',
              fontFamily: 'var(--font-heading)',
              fontSize: '16px',
              color: '#FFFFFF',
              fontWeight: 700,
            }}
          >
            S
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#1A3028' }}>
            StrideWithMe
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Bell size={20} color="#6B9E8A" />
          <div
            className="flex items-center justify-center"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#3D7A5F',
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#FFFFFF',
            }}
          >
            {(user?.user_metadata?.full_name || user?.email || 'U').slice(0, 2).toUpperCase()}
          </div>
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
            backgroundColor: '#3D7A5F',
            color: '#FFFFFF',
            borderRadius: '9999px',
            border: 'none',
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(61, 122, 95, 0.25)',
          }}
        >
          {todayLogged ? "View today's log →" : "Log today's progress →"}
        </button>
      </div>

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
