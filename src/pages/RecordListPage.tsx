import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Clock, ShieldCheck, Share2, X, Camera, Briefcase, Link2 } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import ExampleRecordContent from '../components/ExampleRecordContent'
import { useAuth } from '../context/AuthContext'
import { getAllSprints, isSprintLocked, calculateDayNumber } from '../lib/db'
import type { Sprint } from '../lib/db'

export default function RecordListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)

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
      {/* Header */}
      <div style={{ padding: '20px 20px 8px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#1A3028', margin: 0 }}>Sprint Records</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', marginTop: '4px', letterSpacing: '0.01em' }}>Earned credentials from your sprints.</p>
      </div>

      {/* Sprint Cards */}
      {sprints.map((sprint) => (
        <div key={sprint.id} style={{ margin: '16px 16px 0', backgroundColor: '#FFFFFF', borderRadius: '20px', border: isSprintLocked(sprint.end_date) ? '2px solid #2D5A47' : '1px solid #EDF2EF', boxShadow: isSprintLocked(sprint.end_date) ? '0 0 0 4px rgba(45,90,71,0.08)' : '0 2px 12px rgba(45,90,71,0.06)', overflow: 'hidden' }}>
          {isSprintLocked(sprint.end_date) ? (
            <>
              {/* Locked card */}
              <div style={{ position: 'relative', height: '140px' }}>
                {/* Blurred preview */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #EAF5F0, #F0EEF8)', filter: 'blur(3px)', opacity: 0.7, overflow: 'hidden', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#C8DDD5' }} />
                    <div>
                      <div style={{ width: '120px', height: '12px', backgroundColor: '#C8DDD5', borderRadius: '6px' }} />
                      <div style={{ width: '80px', height: '8px', backgroundColor: '#C8DDD5', borderRadius: '4px', marginTop: '6px' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    {[60, 60, 60].map((w, i) => <div key={i} style={{ width: `${w}px`, height: '8px', backgroundColor: '#C8DDD5', borderRadius: '4px' }} />)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '2px' }}>
                    {Array.from({ length: 20 }, (_, i) => <div key={i} style={{ width: '12px', height: '12px', backgroundColor: '#B8D9CC', borderRadius: '2px' }} />)}
                  </div>
                </div>
                {/* Lock overlay */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <div style={{ width: '52px', height: '52px', backgroundColor: '#2D5A47', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(45,90,71,0.3)' }}>
                    <Lock size={22} color="#FFFFFF" />
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px' }}>
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 500, fontStyle: 'italic', color: '#1A3028', margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sprint.goal_text}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: '#1A3028', margin: '0 0 4px' }}>Sprint in Progress</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', lineHeight: 1.5, margin: 0 }}>
                  Your Sprint Record unlocks when you complete the sprint. Keep going — Day {calculateDayNumber(sprint.start_date)} of {sprint.sprint_length}.
                </p>

                <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#EAF5F0', border: '1px solid #B8D9CC', borderRadius: '9999px', padding: '7px 16px' }}>
                  <Clock size={13} color="#3D7A5F" />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: '#3D7A5F' }}>{Math.max(sprint.sprint_length - calculateDayNumber(sprint.start_date) + 1, 0)} days remaining</span>
                </div>

                <div style={{ marginTop: '12px', width: '100%', height: '5px', borderRadius: '9999px', backgroundColor: '#D4EDE3' }}>
                  <div style={{ width: `${Math.round((calculateDayNumber(sprint.start_date) / sprint.sprint_length) * 100)}%`, height: '100%', borderRadius: '9999px', backgroundColor: '#3D7A5F' }} />
                </div>

                <button
                  onClick={() => setPreviewOpen(true)}
                  style={{ width: '100%', marginTop: '14px', padding: '10px 16px', textAlign: 'center', color: '#FFFFFF', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', border: 'none', borderRadius: '9999px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(107,176,72,0.25)' }}
                >
                  See what you're working toward →
                </button>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      ))}

      {/* Share it anywhere */}
      <div style={{ margin: '12px 16px 0', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EDF2EF', padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, fontStyle: 'italic', color: '#1A3028' }}>When you earn it, share it anywhere.</span>
          <span style={{ fontSize: '16px' }}>🏆</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { icon: <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, color: '#FFFFFF' }}>in</span>, bg: '#0A66C2', text: 'Pin to LinkedIn as a verified proof-of-work credential.' },
            { icon: <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: '#FFFFFF' }}>N</span>, bg: '#FF7555', text: 'Link on Naukri alongside your resume.' },
            { icon: <Camera size={11} color="#FFFFFF" />, bg: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)', text: 'Share as an Instagram story or carousel post.' },
            { icon: <Briefcase size={11} color="#FFFFFF" />, bg: '#4A8C6F', text: 'Send to a client as proof you ship consistently.' },
            { icon: <Link2 size={11} color="#FFFFFF" />, bg: '#7B6FA0', text: 'Keep it private — proof you showed up for yourself.' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: row.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{row.icon}</div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#2D4A3E' }}>{row.text}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '10px', borderTop: '1px solid #F5F5F5', paddingTop: '10px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0 }}>AI-verified proof of work. Not a badge — a record.</p>
        </div>
      </div>

      {/* Preview Bottom Sheet */}
      {previewOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setPreviewOpen(false)} />
          <div
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: '430px', margin: '0 auto', zIndex: 9999, backgroundColor: '#FFFFFF', borderRadius: '28px 28px 0 0', maxHeight: '90vh', overflowY: 'auto', paddingBottom: '40px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet header */}
            <div style={{ position: 'sticky', top: 0, backgroundColor: '#FFFFFF', padding: '12px 20px 16px', borderBottom: '1px solid #F0F0F0', borderRadius: '28px 28px 0 0', zIndex: 1 }}>
              <div style={{ width: '40px', height: '4px', backgroundColor: '#E0E0E0', borderRadius: '2px', margin: '0 auto 14px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#1A3028', margin: 0 }}>Example Sprint Record</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', marginTop: '2px', letterSpacing: '0.01em' }}>This is what you'll earn.</p>
                </div>
                <button onClick={() => setPreviewOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
    </PageWrapper>
  )
}
