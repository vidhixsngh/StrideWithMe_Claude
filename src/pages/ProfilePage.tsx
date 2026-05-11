import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'
import { getProfile, getAllSprints, getLogsForSprint, calculateDayNumber, isSprintLocked, updateSprintVisibility, updateReminderSettings } from '../lib/db'
import type { Sprint, Profile } from '../lib/db'
import { enablePush, disablePush, isPushSupported, isStandaloneInstalled, isIOS } from '../lib/push'
import { track, Events, setPeople } from '../lib/analytics'
import ShareSheet from '../components/ShareSheet'
import FeedbackSheet from '../components/FeedbackSheet'

type Visibility = 'PRIVATE' | 'COHORT' | 'PUBLIC'
const VISIBILITY_OPTIONS: { value: Visibility; emoji: string; title: string; subtitle: string }[] = [
  { value: 'PRIVATE', emoji: '🔒', title: 'Just me', subtitle: 'A quiet build' },
  { value: 'COHORT', emoji: '👥', title: 'My sprint group', subtitle: 'Build alongside others' },
  { value: 'PUBLIC', emoji: '🌐', title: 'Build in public', subtitle: 'Open to the world' },
]
const visibilityLabel = (v: string) => VISIBILITY_OPTIONS.find(o => o.value === v)?.title ?? 'Just me'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [bestStreak, setBestStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [visibilityEditor, setVisibilityEditor] = useState<{ sprintId: string; current: Visibility } | null>(null)
  const [reminderEditor, setReminderEditor] = useState(false)
  const [reminderDraft, setReminderDraft] = useState('20:00')
  const [savingReminder, setSavingReminder] = useState(false)
  const [reminderError, setReminderError] = useState('')
  const [showInstallNudge, setShowInstallNudge] = useState(false)
  const [reminderSheetDragY, setReminderSheetDragY] = useState(0)
  const reminderDragStartRef = useRef<number | null>(null)
  const needsIosInstall = isIOS() && !isStandaloneInstalled()
  const [shareOpen, setShareOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

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

      // Compute best streak across all sprints (longest run of consecutive logged days)
      if (s.length === 0) return
      const allSprintLogs = await Promise.all(s.map(sp => getLogsForSprint(sp.id)))
      let best = 0
      for (const logs of allSprintLogs) {
        if (logs.length === 0) continue
        const days = [...new Set(logs.map(l => l.day_number))].sort((a, b) => a - b)
        let run = 1
        for (let i = 1; i < days.length; i++) {
          run = days[i] === days[i - 1] + 1 ? run + 1 : 1
          if (run > best) best = run
        }
        if (days.length === 1 && best === 0) best = 1
      }
      setBestStreak(best)
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
            { value: String(bestStreak), label: 'Best streak', color: '#1A3028' },
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 500, color: '#1A3028', flex: 1 }}>{sprint.goal_text}</span>
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    backgroundColor: !isActive ? '#D4EDE3' : '#FEF3E8',
                    color: !isActive ? '#3D7A5F' : '#D97706',
                    flexShrink: 0,
                  }}>
                    {!isActive ? 'Completed' : 'Active'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '0 0 10px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A' }}>
                    {sprint.sprint_length} days
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#D4EDE3' }}>·</span>
                  <button
                    onClick={() => setVisibilityEditor({ sprintId: sprint.id, current: sprint.visibility })}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(118,197,72,0.08)', border: '1px solid rgba(107,176,72,0.25)', borderRadius: '9999px', padding: '3px 9px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '11px', color: '#5A9A3A', fontWeight: 500 }}
                  >
                    <span>{VISIBILITY_OPTIONS.find(o => o.value === sprint.visibility)?.emoji}</span>
                    <span>{visibilityLabel(sprint.visibility)}</span>
                    <span style={{ opacity: 0.6, fontSize: '9px' }}>▾</span>
                  </button>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', backgroundColor: '#D4EDE3', marginBottom: '4px' }}>
                  <div style={{ width: `${completion}%`, height: '100%', borderRadius: '9999px', backgroundColor: isActive ? '#F59E4A' : '#3D7A5F' }} />
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: isActive ? '#F59E4A' : '#3D7A5F', textAlign: 'right', margin: '0 0 12px' }}>
                  {completion}%
                </p>

                {/* Action row: View progress (left) + View Sprint Record (right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => navigate('/dashboard')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', border: 'none', borderRadius: '9999px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '11px', color: '#FFFFFF', fontWeight: 600, boxShadow: '0 2px 8px rgba(107,176,72,0.25)' }}
                  >
                    View progress →
                  </button>
                  <button
                    onClick={() => navigate(`/record/${sprint.id}`)}
                    style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#3D7A5F', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    View Sprint Record →
                  </button>
                </div>
              </div>
            )
          })
        )}

        {/* Settings */}
        <div style={{ marginTop: '24px' }}>
          {/* Reminder time — tappable */}
          <button
            onClick={() => {
              setReminderDraft(profile?.reminder_time ? profile.reminder_time.slice(0, 5) : '20:00')
              setReminderEditor(true)
            }}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #EDF2EF', background: 'none', border: 'none', borderBottomColor: '#EDF2EF', borderBottomStyle: 'solid', borderBottomWidth: '1px', cursor: 'pointer' }}
          >
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#1A3028' }}>Daily reminder</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: profile?.reminder_enabled ? '#3D7A5F' : '#9BBFB2', fontStyle: 'italic', backgroundColor: profile?.reminder_enabled ? '#EAF5F0' : '#F5F8F4', borderRadius: '9999px', padding: '4px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {profile?.reminder_enabled && profile.reminder_time
                ? `${profile.reminder_time.slice(0, 5)} ✓`
                : 'Off'}
              <span style={{ fontSize: '10px', opacity: 0.7 }}>›</span>
            </span>
          </button>

          {/* Email notifications — tied to reminder_enabled */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #EDF2EF' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#1A3028' }}>Email notifications</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#9BBFB2', fontStyle: 'italic' }}>
                We email if you haven't logged by reminder time
              </span>
            </div>
            <button
              onClick={async () => {
                if (!user) return
                const next = !profile?.reminder_enabled
                const result = await updateReminderSettings(user.id, { reminder_enabled: next })
                if (result.ok) setProfile({ ...(profile ?? {} as Profile), reminder_enabled: next })
                else alert(`Save failed: ${result.error ?? 'unknown error'}`)
              }}
              style={{
                width: '40px',
                height: '22px',
                borderRadius: '9999px',
                border: 'none',
                background: profile?.reminder_enabled ? 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)' : '#D4EDE3',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
                flexShrink: 0,
              }}
              aria-label="Toggle email notifications"
            >
              <span style={{
                position: 'absolute',
                top: '2px',
                left: profile?.reminder_enabled ? '20px' : '2px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#FFFFFF',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </button>
          </div>

          {/* Share StrideWithMe */}
          <button
            onClick={() => { track(Events.ShareSheetOpened, { from: 'profile' }); setShareOpen(true) }}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #EDF2EF', background: 'none', border: 'none', borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: '#EDF2EF', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#1A3028' }}>Share StrideWithMe</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#9BBFB2', fontStyle: 'italic' }}>
                Bring a friend along for the sprint
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#3D7A5F', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              🌱 <span style={{ fontSize: '10px', opacity: 0.7 }}>›</span>
            </span>
          </button>

          {/* Send feedback */}
          <button
            onClick={() => { track(Events.FeedbackSheetOpened, { from: 'profile' }); setFeedbackOpen(true) }}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#1A3028' }}>Send feedback</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#9BBFB2', fontStyle: 'italic' }}>
                Rate the app · tell us what's working or broken
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#3D7A5F', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              ⭐ <span style={{ fontSize: '10px', opacity: 0.7 }}>›</span>
            </span>
          </button>

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

      {/* iOS install nudge — shown after enabling reminder if not standalone */}
      {showInstallNudge && (
        <>
          <div onClick={() => { setShowInstallNudge(false); setReminderEditor(false) }} style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.55)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 40px)', maxWidth: '360px', zIndex: 9999, background: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 24px 64px rgba(28,61,48,0.22)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', margin: '0 auto 14px', borderRadius: '50%', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(107,176,72,0.30)', fontSize: '28px' }}>🏠</div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.12em', color: '#5A9A3A', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>One more step on iOS</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 600, color: '#1A3028', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              Add StrideWithMe to your home screen
            </p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 16px', lineHeight: 1.5 }}>
              iOS only delivers push notifications when the app lives on your home screen.
            </p>

            <div style={{ background: 'rgba(118,197,72,0.08)', borderRadius: '12px', padding: '12px 14px', textAlign: 'left', marginBottom: '16px' }}>
              {[
                { n: '1', t: 'Tap the Share icon', sub: 'In the Safari toolbar — usually bottom-center.' },
                { n: '2', t: 'Tap "Add to Home Screen"', sub: 'Scroll down in the share sheet if needed.' },
                { n: '3', t: 'Open StrideWithMe from there', sub: 'Reminders start arriving from the home-screen icon.' },
              ].map((s) => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '22px', height: '22px', flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700 }}>{s.n}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#1A3028', margin: 0 }}>{s.t}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: '2px 0 0', lineHeight: 1.4 }}>{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: '0 0 14px', lineHeight: 1.5 }}>
              Until you do, we'll email you at your reminder time as a fallback.
            </p>

            <button
              onClick={() => { setShowInstallNudge(false); setReminderEditor(false) }}
              style={{ width: '100%', height: '44px', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', border: 'none', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 4px 12px rgba(107,176,72,0.25)' }}
            >
              Got it →
            </button>
          </div>
        </>
      )}

      {/* Reminder editor bottom sheet */}
      {reminderEditor && (
        <>
          <div onClick={() => !savingReminder && setReminderEditor(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998 }} />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: `translateX(-50%) translateY(${reminderSheetDragY}px)`,
              width: '100%',
              maxWidth: '430px',
              background: 'white',
              borderRadius: '24px 24px 0 0',
              zIndex: 9999,
              paddingBottom: 'calc(28px + env(safe-area-inset-bottom))',
              transition: reminderSheetDragY === 0 ? 'transform 0.3s ease' : 'none',
              boxShadow: '0 -8px 32px rgba(28,61,48,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag zone — handle + title (~110px) */}
            <div
              style={{ padding: '14px 20px 14px', touchAction: 'none', cursor: 'grab' }}
              onTouchStart={(e) => { reminderDragStartRef.current = e.touches[0].clientY }}
              onTouchMove={(e) => {
                if (reminderDragStartRef.current === null) return
                const d = e.touches[0].clientY - reminderDragStartRef.current
                if (d > 0) { setReminderSheetDragY(d); e.preventDefault() }
              }}
              onTouchEnd={() => {
                if (reminderSheetDragY > 90) {
                  if (!savingReminder) setReminderEditor(false)
                  setReminderSheetDragY(0); reminderDragStartRef.current = null; return
                }
                setReminderSheetDragY(0); reminderDragStartRef.current = null
              }}
              onTouchCancel={() => { setReminderSheetDragY(0); reminderDragStartRef.current = null }}
            >
              <div style={{ width: '44px', height: '5px', background: '#D0D0D0', borderRadius: '3px', margin: '0 auto 14px' }} />
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 600, color: '#1A3028', margin: '0 0 4px', textAlign: 'center' }}>Daily reminder</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                We'll nudge you if you haven't logged by this time.
              </p>
            </div>

            {/* iOS install requirement card — only when iOS Safari AND not added to home screen */}
            {needsIosInstall && (
              <div style={{ margin: '0 20px 16px', padding: '14px 16px', background: 'linear-gradient(135deg, rgba(118,197,72,0.10) 0%, rgba(245,213,71,0.06) 100%)', border: '1.5px solid rgba(107,176,72,0.30)', borderRadius: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '15px' }}>📲</span>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A9A3A', margin: 0, fontWeight: 700 }}>Required on iPhone</p>
                </div>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: '0 0 4px', lineHeight: 1.4 }}>
                  Add StrideWithMe to your Home Screen to receive reminders
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

            <div style={{ padding: '4px 20px 0' }}>

            {/* Big time input */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <input
                type="time"
                value={reminderDraft}
                onChange={(e) => setReminderDraft(e.target.value)}
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '32px',
                  fontWeight: 600,
                  color: '#1A3028',
                  background: '#F5FAF7',
                  border: '1.5px solid #B8D9CC',
                  borderRadius: '14px',
                  padding: '12px 18px',
                  outline: 'none',
                  letterSpacing: '0.02em',
                  textAlign: 'center',
                }}
              />
            </div>

            {/* Quick presets */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { label: '8 AM', value: '08:00' },
                { label: '1 PM', value: '13:00' },
                { label: '6 PM', value: '18:00' },
                { label: '8 PM', value: '20:00' },
                { label: '10 PM', value: '22:00' },
              ].map((p) => {
                const active = reminderDraft === p.value
                return (
                  <button
                    key={p.value}
                    onClick={() => setReminderDraft(p.value)}
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

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'center', margin: '0 0 12px' }}>
              Detected timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>

            {/* Reminder delivery hint — push primary, email fallback */}
            <div style={{ background: 'rgba(118,197,72,0.06)', border: '1px solid rgba(107,176,72,0.20)', borderRadius: '10px', padding: '8px 12px', marginBottom: '14px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>🔔</span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#5A9A3A', margin: 0, lineHeight: 1.5 }}>
                We'll send a push notification first. Email is the backup if push isn't allowed.
              </p>
            </div>

            {reminderError && (
              <div style={{ background: '#FEF3E8', border: '1px solid #F5D5A8', borderRadius: '10px', padding: '8px 12px', marginBottom: '12px' }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#D97706', margin: 0, lineHeight: 1.5 }}>{reminderError}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              {profile?.reminder_enabled && (
                <button
                  disabled={savingReminder}
                  onClick={async () => {
                    if (!user) return
                    setSavingReminder(true)
                    const result = await updateReminderSettings(user.id, { reminder_enabled: false })
                    await disablePush(user.id).catch(() => {})
                    setSavingReminder(false)
                    if (result.ok) {
                      setProfile({ ...(profile ?? {} as Profile), reminder_enabled: false })
                      track(Events.ReminderDisabled)
                      setPeople({ reminder_enabled: false })
                      setReminderEditor(false)
                    } else {
                      setReminderError(`Save failed: ${result.error ?? 'unknown'}`)
                    }
                  }}
                  style={{ flex: 1, height: '44px', background: '#FEF3E8', color: '#D97706', border: '1px solid #F5D5A8', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: savingReminder ? 0.5 : 1 }}
                >
                  Turn off
                </button>
              )}
              <button
                disabled={savingReminder}
                onClick={async () => {
                  if (!user) return
                  setSavingReminder(true)
                  setReminderError('')
                  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

                  // 1. Persist time/timezone/enabled
                  const saveResult = await updateReminderSettings(user.id, {
                    reminder_time: `${reminderDraft}:00`,
                    reminder_timezone: tz,
                    reminder_enabled: true,
                  })

                  setSavingReminder(false)
                  if (!saveResult.ok) {
                    setReminderError(`Save failed: ${saveResult.error ?? 'unknown'}`)
                    return // stay open on save failure so user sees the error
                  }

                  // Save succeeded — update UI, track, close the sheet immediately
                  setProfile({
                    ...(profile ?? {} as Profile),
                    reminder_time: `${reminderDraft}:00`,
                    reminder_timezone: tz,
                    reminder_enabled: true,
                  })
                  track(Events.ReminderEnabled, { time: reminderDraft, timezone: tz })
                  setPeople({ reminder_time: reminderDraft, reminder_timezone: tz, reminder_enabled: true })

                  // iOS user without home-screen install → show nudge ON TOP of closed sheet
                  if (isIOS() && !isStandaloneInstalled()) {
                    track(Events.IosInstallNudgeShown)
                    setReminderEditor(false)
                    setShowInstallNudge(true)
                    return
                  }

                  // Close the sheet immediately; push subscription runs in the background
                  setReminderEditor(false)

                  // 2. Fire push subscription request AFTER sheet closes — non-blocking
                  if (isPushSupported()) {
                    track(Events.PushPermissionRequested)
                    enablePush(user.id).then((result) => {
                      if (result.ok) {
                        track(Events.PushPermissionGranted)
                        setPeople({ push_subscribed: true })
                      } else if (result.reason === 'denied') {
                        track(Events.PushPermissionDenied)
                      }
                    }).catch((e) => console.warn('enablePush:', e))
                  }
                }}
                style={{ flex: 2, height: '44px', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', border: 'none', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', opacity: savingReminder ? 0.6 : 1, boxShadow: '0 4px 12px rgba(107,176,72,0.25)' }}
              >
                {savingReminder ? 'Saving…' : `Save · remind at ${reminderDraft}`}
              </button>
            </div>
            </div>
          </div>
        </>
      )}

      {/* Visibility editor bottom sheet */}
      {visibilityEditor && (
        <>
          <div onClick={() => setVisibilityEditor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: 'white', borderRadius: '24px 24px 0 0', zIndex: 9999, padding: '20px 20px 32px', paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}>
            <div style={{ width: '40px', height: '4px', background: '#E0E0E0', borderRadius: '2px', margin: '0 auto 16px' }} />
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '17px', fontWeight: 600, color: '#1A3028', margin: '0 0 4px' }}>Who's in your corner?</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 20px' }}>Change who can see this sprint's progress.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {VISIBILITY_OPTIONS.map((opt) => {
                const isSelected = visibilityEditor.current === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={async () => {
                      const ok = await updateSprintVisibility(visibilityEditor.sprintId, opt.value)
                      if (ok) {
                        setSprints(prev => prev.map(s => s.id === visibilityEditor.sprintId ? { ...s, visibility: opt.value } : s))
                      }
                      setVisibilityEditor(null)
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      background: isSelected ? 'linear-gradient(135deg, rgba(118,197,72,0.10) 0%, rgba(107,176,72,0.06) 100%)' : '#FFFFFF',
                      border: isSelected ? '1.5px solid #6BB048' : '1px solid #E8F0EC',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isSelected ? 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)' : '#F5F8F4', border: isSelected ? 'none' : '1px solid #E8F0EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>
                      {opt.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 600, color: '#1A3028', margin: 0 }}>{opt.title}</p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: isSelected ? '#5A9A3A' : '#6B9E8A', margin: '2px 0 0' }}>{opt.subtitle}</p>
                    </div>
                    {isSelected && <span style={{ color: '#6BB048', fontSize: '14px', fontWeight: 700 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Share & Feedback sheets */}
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        message={`I'm on a 30-day sprint with StrideWithMe — AI-verified, daily accountability. Want to start your own? 🌱`}
        url={typeof window !== 'undefined' ? window.location.origin : 'https://stridewithme.vercel.app'}
      />
      <FeedbackSheet
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onWantsToShare={() => setShareOpen(true)}
      />
    </PageWrapper>
  )
}
