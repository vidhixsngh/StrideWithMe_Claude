import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Clock, ShieldCheck, Share2, X } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import ExampleRecordContent from '../components/ExampleRecordContent'

const mockSprints = [
  {
    id: '1',
    goalText: 'Launch my SaaS product from idea to first paying customer',
    sprintLength: 30,
    currentDay: 14,
    daysRemaining: 16,
    status: 'ACTIVE',
    verifiedCount: 11,
    honestCount: 3,
    startDate: 'Mar 10',
    endDate: 'Apr 8',
    completionPercent: 47,
  },
  {
    id: '2',
    goalText: 'Land my first freelance design client',
    sprintLength: 14,
    currentDay: 8,
    daysRemaining: 6,
    status: 'ACTIVE',
    verifiedCount: 6,
    honestCount: 2,
    startDate: 'Apr 10',
    endDate: 'Apr 24',
    completionPercent: 57,
  },
]

export default function RecordListPage() {
  const navigate = useNavigate()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [, setSelectedSprintId] = useState<string | null>(null)

  if (mockSprints.length === 0) {
    return (
      <PageWrapper>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '0 24px', textAlign: 'center' }}>
          <span style={{ fontSize: '40px' }}>🏃</span>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: '#1A3028', marginTop: '12px' }}>No sprints yet</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', letterSpacing: '0.01em' }}>Complete your first sprint to earn a Sprint Record.</p>
          <button
            onClick={() => navigate('/onboarding')}
            style={{ width: '100%', maxWidth: '300px', height: '48px', backgroundColor: '#3D7A5F', color: '#FFFFFF', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', marginTop: '20px', letterSpacing: '0.02em' }}
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
      {mockSprints.map((sprint) => (
        <div key={sprint.id} style={{ margin: '16px 16px 0', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid #EDF2EF', boxShadow: '0 2px 12px rgba(45,90,71,0.06)', overflow: 'hidden' }}>
          {sprint.status === 'ACTIVE' ? (
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
                <p style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 500, fontStyle: 'italic', color: '#1A3028', margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sprint.goalText}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: '#1A3028', margin: '0 0 4px' }}>Sprint in Progress</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', lineHeight: 1.5, margin: 0 }}>
                  Your Sprint Record unlocks when you complete the sprint. Keep going — Day {sprint.currentDay} of {sprint.sprintLength}.
                </p>

                <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#EAF5F0', border: '1px solid #B8D9CC', borderRadius: '9999px', padding: '7px 16px' }}>
                  <Clock size={13} color="#3D7A5F" />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: '#3D7A5F' }}>{sprint.daysRemaining} days remaining</span>
                </div>

                <div style={{ marginTop: '12px', width: '100%', height: '5px', borderRadius: '9999px', backgroundColor: '#D4EDE3' }}>
                  <div style={{ width: `${sprint.completionPercent}%`, height: '100%', borderRadius: '9999px', backgroundColor: '#3D7A5F' }} />
                </div>

                <button
                  onClick={() => { setSelectedSprintId(sprint.id); setPreviewOpen(true) }}
                  style={{ width: '100%', marginTop: '14px', padding: '10px 16px', textAlign: 'center', color: '#FFFFFF', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, backgroundColor: '#3D7A5F', border: 'none', borderRadius: '9999px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(61,122,95,0.2)' }}
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
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', color: '#FFFFFF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>{sprint.goalText}</p>
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
                    { label: 'Days', value: String(sprint.sprintLength), color: '#1A3028' },
                    { label: 'Logged', value: String(sprint.verifiedCount + sprint.honestCount), color: '#1A3028' },
                    { label: 'Verified', value: sprint.verifiedCount + ' ✓', color: '#3D7A5F' },
                    { label: 'Honest', value: sprint.honestCount + ' 🤍', color: '#7B6FA0' },
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
                    style={{ flex: 1, height: '38px', backgroundColor: '#3D7A5F', color: '#FFFFFF', border: 'none', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <Share2 size={13} /> Share →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

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
          </div>
        </>
      )}
    </PageWrapper>
  )
}
