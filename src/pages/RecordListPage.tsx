import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ShieldCheck, Share2, X, Camera, Link2, Download } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import ExampleRecordContent from '../components/ExampleRecordContent'
import { useAuth } from '../context/AuthContext'
import { getAllSprints, isSprintLocked, calculateDayNumber } from '../lib/db'
import type { Sprint } from '../lib/db'

function getMotivation(daysRemaining: number, sprintLength: number): string {
  const pct = ((sprintLength - daysRemaining) / sprintLength) * 100
  if (daysRemaining <= 1) return "Almost there. One more day. Don't slow down now."
  if (daysRemaining <= 3) return 'The finish line is in sight. Hold the line.'
  if (pct >= 75) return "You're past the hardest part. Stay with it."
  if (pct >= 50) return "Halfway in. The compound effect is building."
  if (pct >= 25) return "The early reps are paying off. Keep showing up."
  return "Every day you log writes a line of your record."
}

export default function RecordListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [lockedSprint, setLockedSprint] = useState<Sprint | null>(null)
  const [toast, setToast] = useState('')
  const [sheetDragY, setSheetDragY] = useState(0)
  const sheetDragStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  // Earned = end_date in the past (sprint completed). Pick the most recent earned one for share.
  const earnedSprint = sprints.find((s) => !isSprintLocked(s.end_date))

  const requireEarned = (action: () => void) => {
    if (!earnedSprint) {
      setToast('Earn your first Sprint Record to share it.')
      return
    }
    action()
  }

  const handleShareLinkedIn = () => requireEarned(() => {
    const url = `${window.location.origin}/record/${earnedSprint!.id}`
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
  })

  const handleShareNaukri = () => requireEarned(async () => {
    const url = `${window.location.origin}/record/${earnedSprint!.id}`
    try { await navigator.clipboard.writeText(url) } catch { /* clipboard may be denied */ }
    setToast('Link copied! Opening Naukri…')
    setTimeout(() => window.open('https://www.naukri.com', '_blank'), 800)
  })

  const handleShareInstagram = () => requireEarned(async () => {
    const url = `${window.location.origin}/record/${earnedSprint!.id}`
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
    if (nav.share) {
      try { await nav.share({ title: 'My Sprint Record', url }); return } catch { /* user cancelled */ }
    }
    try { await navigator.clipboard.writeText(url) } catch { /* */ }
    setToast('Link copied! Paste in Instagram.')
  })

  const handleDownloadPDF = () => requireEarned(() => {
    navigate(`/record/${earnedSprint!.id}?download=true`)
  })

  const handleCopyLink = () => requireEarned(async () => {
    const url = `${window.location.origin}/record/${earnedSprint!.id}`
    try { await navigator.clipboard.writeText(url); setToast('Link copied!') }
    catch { setToast('Could not copy — try again.') }
  })

  useEffect(() => {
    if (!user) return
    getAllSprints(user.id).then(data => {
      setSprints(data)
      setLoading(false)
    })
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

  if (!loading && sprints.length === 0) {
    return (
      <PageWrapper>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '0 24px', textAlign: 'center' }}>
          <span style={{ fontSize: '40px' }}>🏃</span>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: '#1A3028', marginTop: '12px' }}>No sprints yet</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', letterSpacing: '0.01em' }}>Complete your first sprint to earn a Sprint Record.</p>
          <button
            onClick={() => navigate('/onboarding')}
            style={{ width: '100%', maxWidth: '300px', height: '48px', background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', marginTop: '20px', letterSpacing: '0.02em', boxShadow: '0 8px 24px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)' }}
          >
            Start your first sprint →
          </button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }}>
      {/* Authoritative header */}
      <div style={{ margin: '16px 16px 0', background: 'linear-gradient(135deg, #1C3D30 0%, #2D5A47 60%, #1C3D30 100%)', borderRadius: '24px', padding: '24px 22px', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 32px rgba(28,61,48,0.18)' }}>
        {/* Subtle inner glow */}
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(118,197,72,0.18) 0%, rgba(118,197,72,0) 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <ShieldCheck size={14} color="#7AB5A0" />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.15em', color: '#7AB5A0', textTransform: 'uppercase', fontWeight: 600 }}>The reward</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 600, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Sprint Records
          </h1>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontStyle: 'italic', color: 'rgba(255,255,255,0.75)', margin: '6px 0 14px', lineHeight: 1.5 }}>
            Verified proof of every day you showed up. Earned, not given.
          </p>
          <button
            onClick={() => setPreviewOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: '9999px', padding: '7px 14px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', color: '#FFFFFF', fontWeight: 500, backdropFilter: 'blur(4px)' }}
          >
            See what you'll earn →
          </button>
        </div>
      </div>

      {/* Sprint Cards */}
      {sprints.map((sprint) => {
        const locked = isSprintLocked(sprint.end_date)
        const dayNum = calculateDayNumber(sprint.start_date)
        const daysRemaining = Math.max(sprint.sprint_length - dayNum + 1, 0)
        const progressPct = Math.round((dayNum / sprint.sprint_length) * 100)

        if (locked) {
          // OPTION A — ANTICIPATION STRIP (slim, clean)
          return (
            <div
              key={sprint.id}
              onClick={() => setLockedSprint(sprint)}
              style={{
                margin: '12px 16px 0',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: '14px',
                border: '1px solid #E8F0EC',
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              {/* Top row: goal + days */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <Lock size={10} color="#9BBFB2" />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#9BBFB2', textTransform: 'uppercase' }}>In progress</span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontStyle: 'italic', color: '#1A3028', margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sprint.goal_text}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 600, background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1 }}>
                    {daysRemaining}
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', margin: '2px 0 0' }}>{daysRemaining === 1 ? 'day to go' : 'days to go'}</p>
                </div>
              </div>

              {/* Thin progress */}
              <div style={{ width: '100%', height: '3px', borderRadius: '9999px', backgroundColor: '#E8F0EC', overflow: 'hidden' }}>
                <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: '9999px', background: 'linear-gradient(90deg, #76C548 0%, #6BB048 100%)' }} />
              </div>
            </div>
          )
        }

        // Unlocked / Completed — keep existing design
        return (
          <div key={sprint.id} style={{ margin: '16px 16px 0', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid #EDF2EF', boxShadow: '0 2px 12px rgba(45,90,71,0.06)', overflow: 'hidden' }}>
            {/* Completed / Unlocked card */}
            <div style={{ backgroundColor: '#2D5A47', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', letterSpacing: '0.15em', color: '#7AB5A0', margin: '0 0 2px', textTransform: 'uppercase' }}>SPRINT RECORD</p>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', color: '#FFFFFF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>{sprint.goal_text}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <ShieldCheck size={18} color="#7AB5A0" />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#7AB5A0' }}>Verified</span>
              </div>
            </div>

            <div style={{ display: 'flex', height: '3px' }}>
              <div style={{ flex: 3, backgroundColor: '#3D7A5F' }} />
              <div style={{ flex: 0.5, backgroundColor: '#F59E4A' }} />
              <div style={{ flex: 0.5, backgroundColor: '#7B6FA0' }} />
            </div>

            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '12px' }}>
                {[
                  { label: 'Days', value: String(sprint.sprint_length), color: '#1A3028' },
                  { label: 'Logged', value: '0', color: '#1A3028' },
                  { label: 'Verified', value: '0 ✓', color: '#3D7A5F' },
                  { label: 'Honest', value: '0 🤍', color: '#7B6FA0' },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#9BBFB2', margin: '0 0 2px' }}>{s.label}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #F5F5F5', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => navigate('/record/' + sprint.id)}
                  style={{ flex: 1, height: '38px', backgroundColor: '#EAF5F0', color: '#2D5A47', border: '1px solid #B8D9CC', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                >
                  View full record →
                </button>
                <button
                  onClick={() => navigate('/record/' + sprint.id + '?share=true')}
                  style={{ flex: 1, height: '38px', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', border: 'none', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: '0 4px 12px rgba(107,176,72,0.25)' }}
                >
                  <Share2 size={13} /> Share →
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Caption — directly under the sprint cards */}
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: '20px 16px 0', lineHeight: 1.5, textAlign: 'center' }}>
        AI-verified proof of work. Yours opens when the sprint ends.
      </p>

      {/* Shareable section — pinned right above the BottomNav */}
      <div style={{ margin: '20px 16px 16px', textAlign: 'center', marginTop: 'auto', paddingTop: '32px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#9BBFB2', textTransform: 'uppercase', margin: '0 0 12px' }}>
          {earnedSprint ? 'Share your record' : 'Shareable to (when earned)'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
          {[
            { label: 'LinkedIn', node: <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>in</span>, bg: '#0A66C2', onClick: handleShareLinkedIn },
            { label: 'Naukri', node: <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>N</span>, bg: '#FF7555', onClick: handleShareNaukri },
            { label: 'Instagram', node: <Camera size={14} color="#FFFFFF" />, bg: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)', onClick: handleShareInstagram },
            { label: 'Download', node: <Download size={14} color="#FFFFFF" />, bg: 'linear-gradient(135deg, #2D5A47 0%, #1C3D30 100%)', onClick: handleDownloadPDF },
            { label: 'Copy link', node: <Link2 size={14} color="#FFFFFF" />, bg: '#7B6FA0', onClick: handleCopyLink },
          ].map((s) => (
            <button
              key={s.label}
              onClick={s.onClick}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                opacity: earnedSprint ? 1 : 0.55,
                transition: 'opacity 0.15s ease, transform 0.15s ease',
              }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(28,61,48,0.10)' }}>
                {s.node}
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', color: '#9BBFB2' }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
      </div>

      {/* Locked sprint motivational popup */}
      {lockedSprint && (() => {
        const dn = calculateDayNumber(lockedSprint.start_date)
        const remaining = Math.max(lockedSprint.sprint_length - dn + 1, 0)
        const motivation = getMotivation(remaining, lockedSprint.sprint_length)
        return (
          <>
            <div onClick={() => setLockedSprint(null)} style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100% - 40px)', maxWidth: '360px', zIndex: 9999, background: '#FFFFFF', borderRadius: '24px', padding: '24px', boxShadow: '0 24px 64px rgba(28,61,48,0.20)', textAlign: 'center' }}>
              {/* Close */}
              <button onClick={() => setLockedSprint(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}>
                <X size={18} color="#9BBFB2" />
              </button>

              {/* Lock icon */}
              <div style={{ width: '56px', height: '56px', margin: '0 auto 14px', borderRadius: '50%', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(107,176,72,0.30)' }}>
                <Lock size={22} color="#FFFFFF" />
              </div>

              {/* Status */}
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.12em', color: '#5A9A3A', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>In progress · Sealed</p>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 600, color: '#1A3028', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                {remaining} {remaining === 1 ? 'day' : 'days'} until your record opens
              </p>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 18px', lineHeight: 1.5 }}>
                "{lockedSprint.goal_text}"
              </p>

              {/* Sprout green motivational box */}
              <div style={{ background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', borderRadius: '14px', padding: '14px 16px', boxShadow: '0 6px 16px rgba(107,176,72,0.25)' }}>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontStyle: 'italic', color: '#FFFFFF', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                  {motivation}
                </p>
              </div>

              {/* Day caption */}
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: '14px 0 0' }}>
                Day {dn} of {lockedSprint.sprint_length}
              </p>
            </div>
          </>
        )
      })()}

      {/* Preview Bottom Sheet */}
      {previewOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setPreviewOpen(false)} />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: '430px',
              margin: '0 auto',
              zIndex: 9999,
              backgroundColor: '#FFFFFF',
              borderRadius: '28px 28px 0 0',
              maxHeight: '90vh',
              overflowY: 'auto',
              paddingBottom: '40px',
              transform: `translateY(${sheetDragY}px)`,
              transition: sheetDragY === 0 ? 'transform 0.3s ease' : 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet header — drag handle area, pull down to close */}
            <div
              style={{ position: 'sticky', top: 0, backgroundColor: '#FFFFFF', padding: '12px 20px 16px', borderBottom: '1px solid #F0F0F0', borderRadius: '28px 28px 0 0', zIndex: 1, touchAction: 'none' }}
              onTouchStart={(e) => { sheetDragStartRef.current = e.touches[0].clientY }}
              onTouchMove={(e) => {
                if (sheetDragStartRef.current === null) return
                const delta = e.touches[0].clientY - sheetDragStartRef.current
                if (delta > 0) setSheetDragY(delta)
              }}
              onTouchEnd={() => {
                if (sheetDragY > 90) { setPreviewOpen(false); setSheetDragY(0); sheetDragStartRef.current = null; return }
                setSheetDragY(0); sheetDragStartRef.current = null
              }}
            >
              <div style={{ width: '44px', height: '5px', backgroundColor: '#D0D0D0', borderRadius: '3px', margin: '0 auto 14px', cursor: 'grab' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#1A3028', margin: 0 }}>Example Sprint Record</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', marginTop: '2px', letterSpacing: '0.01em' }}>This is what you'll earn.</p>
                </div>
                <button onClick={() => setPreviewOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <X size={20} color="#9BBFB2" />
                </button>
              </div>
            </div>

            {/* Example banner */}
            <div style={{ backgroundColor: '#FEF3E8', borderBottom: '1px solid #F5D5A8', padding: '8px 20px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#D97706', margin: 0 }}>✦ Example only — your record will reflect your actual sprint journey</p>
            </div>

            {/* Record content */}
            <ExampleRecordContent
              onCTA={() => { setPreviewOpen(false); navigate('/onboarding') }}
              ctaLabel="Start your sprint to earn this →"
            />

            {/* Share preview */}
            <div style={{ margin: '16px 20px 0' }}>
              <div style={{ height: '1px', backgroundColor: '#F0F0F0', marginBottom: '16px' }} />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'center', margin: '0 0 12px' }}>When you earn this — you can share it:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {[
                  { left: <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: '#0A66C2' }}>in</span>, label: 'LinkedIn' },
                  { left: <Camera size={12} color="#E1306C" />, label: 'Instagram' },
                  { left: <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: '#FF7555' }}>N</span>, label: 'Naukri' },
                  { left: <Link2 size={12} color="#6B9E8A" />, label: 'Copy link' },
                ].map((pill, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9999px', border: '1px solid #EDF2EF', backgroundColor: '#FFFFFF' }}>
                    {pill.left}
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: '#1A3028' }}>{pill.label}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'center', marginTop: '10px' }}>Your record. Your proof. Share it anywhere.</p>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 'calc(96px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1C3D30', color: '#FFFFFF', fontFamily: 'var(--font-body)', fontSize: '12px', borderRadius: '9999px', padding: '10px 18px', zIndex: 9999, boxShadow: '0 8px 24px rgba(28,61,48,0.30)', whiteSpace: 'nowrap', maxWidth: 'calc(100vw - 40px)' }}>
          {toast}
        </div>
      )}
    </PageWrapper>
  )
}
