import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'
import { getProfile, getAllSprints, calculateDayNumber, isSprintLocked } from '../lib/db'
import type { Sprint, Profile } from '../lib/db'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [p, s] = await Promise.all([
        getProfile(user!.id),
        getAllSprints(user!.id),
      ])
      setProfile(p)
      setSprints(s)
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) {
    return (
      <PageWrapper>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #D4EDE3', borderTopColor: '#3D7A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </PageWrapper>
    )
  }

  const displayName = profile?.display_name ?? user?.email ?? 'You'
  const initials = (profile?.display_name || user?.email || 'U').slice(0, 2).toUpperCase()
  const tagline = `${sprints.length} sprint${sprints.length !== 1 ? 's' : ''}`
  const totalDays = sprints.reduce((sum, s) => sum + s.sprint_length, 0)

  return (
    <PageWrapper>
      <div style={{ padding: '20px 16px' }}>
        {/* Avatar + info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          {(() => {
            const avatarUrl = (user?.user_metadata as Record<string, unknown> | undefined)?.avatar_url as string | undefined
              ?? (user?.user_metadata as Record<string, unknown> | undefined)?.picture as string | undefined
            return (
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: avatarUrl ? '#FFFFFF' : 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: '28px', color: '#FFFFFF', overflow: 'hidden', boxShadow: '0 4px 16px rgba(107,176,72,0.20)' }}>
                {avatarUrl ? <img src={avatarUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials}
              </div>
            )
          })()}
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: '#1A3028', marginTop: '12px', marginBottom: '4px' }}>{displayName}</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', margin: 0 }}>{tagline}</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
          {[
            { value: String(sprints.length), label: 'Sprints', color: '#1A3028' },
            { value: String(totalDays), label: 'Total days', color: '#3D7A5F' },
            { value: '0', label: 'Best streak', color: '#1A3028' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#6B9E8A' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Start a new sprint CTA */}
        <button
          onClick={() => navigate('/onboarding')}
          style={{ width: '100%', height: '52px', background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 8px 24px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)', letterSpacing: '0.015em', marginBottom: '8px' }}
        >
          + Start a new sprint
        </button>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'center', margin: '0 0 20px' }}>
          Run multiple sprints in parallel — each gets its own goal, plan, and Sprint Record.
        </p>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: '#EDF2EF', marginBottom: '20px' }} />

        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 600, color: '#1A3028', margin: '0 0 12px' }}>Sprint history</h2>

        {/* Sprint cards */}
        {sprints.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', textAlign: 'center', padding: '20px 0' }}>No sprints yet.</p>
        ) : (
          sprints.map((sprint) => {
            const isActive = isSprintLocked(sprint.end_date)
            const completion = Math.min(Math.round((calculateDayNumber(sprint.start_date) / sprint.sprint_length) * 100), 100)
            return (
              <div key={sprint.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid #EDF2EF', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 500, color: '#1A3028' }}>{sprint.goal_text}</span>
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    backgroundColor: !isActive ? '#D4EDE3' : '#FEF3E8',
                    color: !isActive ? '#3D7A5F' : '#D97706',
                  }}>
                    {!isActive ? 'Completed' : 'Active'}
                  </span>
                </div>

                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 10px' }}>
                  {sprint.sprint_length} days · 0 verified ✓ · 0 honest 🤍
                </p>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', backgroundColor: '#D4EDE3', marginBottom: '4px' }}>
                  <div style={{ width: `${completion}%`, height: '100%', borderRadius: '9999px', backgroundColor: isActive ? '#F59E4A' : '#3D7A5F' }} />
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: isActive ? '#F59E4A' : '#3D7A5F', textAlign: 'right', margin: '0 0 8px' }}>
                  {completion}%
                </p>

                <button
                  onClick={() => navigate(`/record/${sprint.id}`)}
                  style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#3D7A5F', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  View Sprint Record →
                </button>
              </div>
            )
          })
        )}

        {/* Settings */}
        <div style={{ marginTop: '24px' }}>
          {[
            { label: 'Reminder time', value: '9:00 PM' },
            { label: 'Visibility default', value: 'Private' },
            { label: 'Notifications', value: 'On' },
          ].map((item, i) => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < 2 ? '1px solid #EDF2EF' : 'none' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#1A3028' }}>{item.label}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#6B9E8A' }}>{item.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
            <button
              onClick={async () => { await signOut(); navigate('/', { replace: true }) }}
              style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#D97706', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
