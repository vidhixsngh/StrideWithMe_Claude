import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'
import { getAllActiveSprints, getLogsForSprint, getTasksForSprint, calculateDayNumber } from '../lib/db'
import type { Sprint, Task, DailyLog } from '../lib/db'
import { getPhases } from '../lib/phases'

export default function PlanPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({})
  const [expandedDay, setExpandedDay] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      setLoading(true)
      const active = await getAllActiveSprints(user.id)
      if (active.length === 0) {
        navigate('/dashboard', { replace: true })
        return
      }
      const s = active[0]
      const [allTasks, allLogs] = await Promise.all([
        getTasksForSprint(s.id),
        getLogsForSprint(s.id),
      ])
      setSprint(s)
      setTasks(allTasks)
      setLogs(allLogs)

      // Auto-expand the current phase
      const dn = calculateDayNumber(s.start_date)
      const phases = getPhases(s.sprint_length)
      const currentPhase = phases.find((p) => dn >= p.from && dn <= p.to)
      if (currentPhase) setExpandedPhases({ [currentPhase.name]: true })

      setLoading(false)
    })()
  }, [user, navigate])

  if (loading || !sprint) {
    return (
      <PageWrapper showNav={false}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '36px', animation: 'runner 1s ease-in-out infinite' }}>🏃</span>
        </div>
      </PageWrapper>
    )
  }

  const dayNumber = calculateDayNumber(sprint.start_date)
  const phases = getPhases(sprint.sprint_length)
  const phaseThemes = sprint.phase_themes ?? {}

  return (
    <PageWrapper showNav={false}>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #EAF5F0 0%, #F0F7F4 35%, #F5F0E8 100%)', paddingBottom: '32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', position: 'sticky', top: 0, zIndex: 10, background: 'rgba(245,242,236,0.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: '#3D7A5F' }}>
            <ChevronLeft size={20} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500 }}>Back</span>
          </button>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: 0, letterSpacing: '0.02em' }}>
            Day {dayNumber} of {sprint.sprint_length}
          </p>
        </div>

        <div style={{ padding: '0 20px' }}>
          {/* Title */}
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: 700, color: '#1A3028', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
            Your plan
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 18px', lineHeight: 1.5 }}>
            Your full sprint in 4 phases. Tap any phase to see the tasks inside.
          </p>

          {/* Goal card */}
          <div style={{ background: 'linear-gradient(135deg, rgba(118,197,72,0.12) 0%, rgba(107,176,72,0.07) 100%)', border: '2px solid rgba(107,176,72,0.45)', borderRadius: '20px', padding: '16px 18px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px' }}>🌱</span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.12em', color: '#5A9A3A', margin: 0, textTransform: 'uppercase', fontWeight: 700 }}>
                Your commitment
              </p>
            </div>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '17px', fontStyle: 'italic', fontWeight: 600, color: '#1A3028', margin: 0, lineHeight: 1.35, letterSpacing: '-0.01em' }}>
              {sprint.goal_text}
            </p>
          </div>

          {/* Phase timeline with current-day marker */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ position: 'relative', height: '32px' }}>
              {/* Line */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: '11px',
                  right: '11px',
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
              {/* Current-day dot */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${(dayNumber / sprint.sprint_length) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  border: '3px solid #1A3028',
                  boxShadow: '0 2px 8px rgba(28,61,48,0.25)',
                  zIndex: 2,
                }}
              />
              {/* Emojis */}
              {phases.map((phase, i) => {
                const isFoundation = phase.name === 'Foundation'
                const isFirst = i === 0
                const isLast = i === phases.length - 1
                const totalDays = phases.reduce((acc, q) => acc + (q.to - q.from + 1), 0)
                const cumulativeStart = phases.slice(0, i).reduce((acc, q) => acc + (q.to - q.from + 1), 0)
                const startPct = (cumulativeStart / totalDays) * 100
                const positionStyle: React.CSSProperties = isFirst
                  ? { left: 0, transform: 'translateY(-50%)' }
                  : isLast
                  ? { right: 0, transform: 'translateY(-50%)' }
                  : { left: `${startPct}%`, transform: 'translate(-50%, -50%)' }
                return (
                  <span
                    key={phase.name}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      fontSize: '22px',
                      lineHeight: 1,
                      filter: isFoundation
                        ? `drop-shadow(0 2px 8px ${phase.color}aa) drop-shadow(0 0 14px ${phase.color}66)`
                        : `drop-shadow(0 2px 6px ${phase.color}66) drop-shadow(0 0 10px ${phase.color}33)`,
                      ...positionStyle,
                    }}
                  >
                    {phase.emoji}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Phase cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {phases.map((phase) => {
              const phaseKey = phase.name.toLowerCase()
              const theme = (phaseThemes as Record<string, string>)[phaseKey]
              const phaseTasks = tasks.filter((t) => t.day_number >= phase.from && t.day_number <= phase.to)
              const hasTasks = phaseTasks.length > 0
              const isPast = dayNumber > phase.to
              const isCurrent = dayNumber >= phase.from && dayNumber <= phase.to
              const isFuture = dayNumber < phase.from
              const isLocked = isFuture && !hasTasks
              const isExpanded = expandedPhases[phase.name] ?? false

              return (
                <div
                  key={phase.name}
                  style={{
                    background: isCurrent
                      ? `linear-gradient(135deg, ${phase.color}14 0%, ${phase.accent}0C 100%)`
                      : isPast
                      ? 'rgba(255,255,255,0.7)'
                      : isLocked
                      ? 'rgba(255,255,255,0.55)'
                      : `linear-gradient(135deg, ${phase.color}0E 0%, ${phase.accent}06 100%)`,
                    border: isCurrent
                      ? `1.5px solid ${phase.color}55`
                      : isPast
                      ? `1px solid ${phase.color}33`
                      : isLocked
                      ? '1px solid rgba(180,200,190,0.35)'
                      : `1px solid ${phase.color}33`,
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: isCurrent
                      ? `0 8px 24px ${phase.color}1A, 0 2px 6px ${phase.color}10`
                      : '0 1px 4px rgba(28,61,48,0.04)',
                  }}
                >
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
                            ? `drop-shadow(0 2px 6px ${phase.color}33) saturate(0.6)`
                            : `drop-shadow(0 2px 8px ${phase.color}aa) drop-shadow(0 0 12px ${phase.color}55)`,
                          opacity: isLocked ? 0.65 : 1,
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
                          {isCurrent && (
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.1em', color: '#FFFFFF', background: `linear-gradient(135deg, ${phase.color}, ${phase.accent})`, padding: '2px 8px', borderRadius: '9999px', fontWeight: 700, textTransform: 'uppercase', boxShadow: `0 2px 6px ${phase.color}55` }}>Live</span>
                          )}
                          {isPast && (
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.1em', color: phase.color, background: `${phase.color}18`, padding: '2px 8px', borderRadius: '9999px', fontWeight: 700, textTransform: 'uppercase' }}>✓ Done</span>
                          )}
                          {isLocked && (
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#9BBFB2', fontWeight: 600 }}>🔒</span>
                          )}
                        </div>
                        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 600, color: '#1A3028', margin: 0, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                          {phase.tag}
                        </p>
                        {theme && (
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: '4px 0 0', lineHeight: 1.45 }}>
                            {theme}
                          </p>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: phase.color, transition: 'transform 0.15s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', marginLeft: '8px', flexShrink: 0, opacity: 0.55 }}>▾</span>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {hasTasks && phaseTasks.some((t) => Boolean(t.rationale?.trim())) && (
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: '2px 0 0', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px' }}>💡</span>
                          Tap any day to see the reasoning
                        </p>
                      )}
                      {hasTasks ? (
                        phaseTasks.map((task) => {
                          const day = task.day_number
                          const log = logs.find((l) => l.day_number === day)
                          const isLogged = Boolean(log)
                          const isVerified = log?.log_type === 'VERIFIED'
                          const isTodayRow = day === dayNumber
                          const expanded = expandedDay === day
                          const hasRationale = Boolean(task.rationale?.trim())
                          return (
                            <button
                              key={task.id}
                              onClick={() => setExpandedDay(expanded ? null : day)}
                              style={{ textAlign: 'left', width: '100%', background: isTodayRow ? `${phase.color}18` : 'rgba(255,255,255,0.95)', border: expanded ? `1.5px solid ${phase.color}` : isTodayRow ? `1.5px solid ${phase.color}66` : '1px solid #E8F0EC', borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(28,61,48,0.04)' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: isLogged ? `linear-gradient(135deg, ${phase.color}, ${phase.color}dd)` : `linear-gradient(135deg, ${phase.color}55, ${phase.color}33)`, color: '#FFFFFF', fontFamily: 'var(--font-heading)', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {isVerified ? '✓' : isLogged ? '·' : day}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {isTodayRow && (
                                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: phase.color, margin: 0, fontWeight: 800 }}>Today</p>
                                  )}
                                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.45, color: isLogged ? '#6B9E8A' : '#2D4A3E', margin: isTodayRow ? '2px 0 0' : 0, fontWeight: 500, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                                    {task.task_text}
                                  </p>
                                </div>
                                {hasRationale && (
                                  <span style={{ fontSize: '14px', color: phase.color, opacity: 0.55, flexShrink: 0, transition: 'transform 0.15s ease', transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
                                )}
                              </div>
                              {expanded && task.rationale && (
                                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 0 38px', lineHeight: 1.55, borderLeft: `2px solid ${phase.color}`, paddingLeft: '10px' }}>
                                  {task.rationale}
                                </p>
                              )}
                            </button>
                          )
                        })
                      ) : (
                        <div style={{ padding: '12px 14px', background: `linear-gradient(135deg, ${phase.color}15, ${phase.accent}10)`, border: `1px dashed ${phase.color}55`, borderRadius: '12px' }}>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.1em', textTransform: 'uppercase', color: phase.color, margin: '0 0 4px', fontWeight: 800 }}>🔒 Unlocks on Day {phase.from}</p>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#3D5949', margin: '0 0 4px', lineHeight: 1.5 }}>
                            {theme ?? phase.tag}
                          </p>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', margin: 0, lineHeight: 1.5 }}>
                            Tasks generated when you reach Day {phase.from} — using your actual progress.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
