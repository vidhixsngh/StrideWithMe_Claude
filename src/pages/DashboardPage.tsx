import { useNavigate } from 'react-router-dom'
import { Bell, Calendar } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'

const mockSprint = {
  goalText: "Launch my SaaS product from idea to first paying customer",
  currentDay: 14,
  totalDays: 30,
  daysLeft: 16,
  dayStreak: 4,
  percentComplete: 47,
  verifiedCount: 11,
  honestCount: 3,
  bestStreak: 7,
  startDate: "Mar 10",
  endDate: "Apr 8",
  todayTask: "Outline your go-to-market strategy for first 100 users",
  todayLogged: false,
}

const recentLogs = [
  {
    day: 13,
    type: "VERIFIED" as const,
    task: "Create a waitlist landing page and publish it",
    aiInsight: "You're building in public through this log. The clarity of your thinking is improving day by day...",
  },
  {
    day: 12,
    type: "HONEST" as const,
    task: "Deep in a rabbit hole on a related problem. Didn't complete the task but learned...",
    aiInsight: null,
  },
  {
    day: 11,
    type: "VERIFIED" as const,
    task: "Write your first LinkedIn post about the problem you're solving",
    aiInsight: "The specificity in your log entry is striking. You named the exact friction point...",
  },
]

// Heatmap: days 1-11 verified, days 9,12 honest, day 14 today, 15-30 upcoming
function getDayInfo(day: number): { type: 'TODAY' | 'VERIFIED' | 'HONEST' | 'UPCOMING' | 'EMPTY' } {
  if (day > 30) return { type: 'EMPTY' }
  if (day === mockSprint.currentDay) return { type: 'TODAY' }
  if (day === 9 || day === 12) return { type: 'HONEST' }
  if (day < mockSprint.currentDay) return { type: 'VERIFIED' }
  return { type: 'UPCOMING' }
}

export default function DashboardPage() {
  const navigate = useNavigate()

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
            AM
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
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - mockSprint.currentDay / mockSprint.totalDays)}`}
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
                {mockSprint.currentDay}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#7AB5A0' }}>
                of {mockSprint.totalDays}
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
          {mockSprint.goalText}
        </p>

        {/* Stats row */}
        <div className="flex justify-between" style={{ marginTop: '16px' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
              {mockSprint.daysLeft}
            </span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#7AB5A0', margin: 0 }}>days left</p>
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
              {mockSprint.dayStreak}
            </span>
            <span style={{ marginLeft: '2px' }}>🔥</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#7AB5A0', margin: 0 }}>day streak</p>
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: '#F59E4A' }}>
              {mockSprint.percentComplete}%
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
              TODAY · DAY {mockSprint.currentDay}
            </span>
          </div>
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
        </div>

        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          fontWeight: 500,
          color: '#1A3028',
          margin: '8px 0',
        }}>
          {mockSprint.todayTask}
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
          Log today's progress →
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
          { emoji: '✅', value: mockSprint.verifiedCount, label: 'Verified' },
          { emoji: '🤍', value: mockSprint.honestCount, label: 'Honest' },
          { emoji: '🔥', value: mockSprint.dayStreak, label: 'Streak' },
          { emoji: '⭐', value: mockSprint.bestStreak, label: 'Best' },
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
            Your 30-day journey
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A' }}>
            {mockSprint.startDate} — {mockSprint.endDate}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {Array.from({ length: 35 }, (_, i) => {
            const day = i + 1
            const { type } = getDayInfo(day)
            if (type === 'EMPTY') return <div key={i} style={{ width: '28px', height: '28px' }} />
            if (type === 'TODAY') return (
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
                  ...(type === 'VERIFIED' ? { backgroundColor: '#3D7A5F' } :
                    type === 'HONEST' ? { backgroundColor: '#F59E4A' } :
                    type === 'UPCOMING' ? { backgroundColor: '#D4EDE3' } :
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

        {recentLogs.map((log) => (
          <div
            key={log.day}
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
                backgroundColor: log.type === 'VERIFIED' ? '#D4EDE3' : '#FEF3E8',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  color: log.type === 'VERIFIED' ? '#3D7A5F' : '#D97706',
                }}
              >
                DAY
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: log.type === 'VERIFIED' ? '#3D7A5F' : '#D97706',
                }}
              >
                {log.day}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1" style={{ minWidth: 0 }}>
              <div className="flex items-center gap-1">
                <span style={{ fontSize: '12px' }}>{log.type === 'VERIFIED' ? '✅' : '🤍'}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontStyle: 'italic',
                    color: log.type === 'VERIFIED' ? '#3D7A5F' : '#D97706',
                  }}
                >
                  {log.type === 'VERIFIED' ? 'Verified' : 'Honest check-in'}
                </span>
              </div>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                color: '#1A3028',
                margin: '4px 0',
              }}>
                {log.task}
              </p>
              {log.aiInsight && (
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    fontStyle: 'italic',
                    color: '#6B9E8A',
                    borderLeft: '2px solid #B8D9CC',
                    paddingLeft: '8px',
                    margin: '4px 0 0 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {log.aiInsight}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  )
}
