import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, Share2, Camera, Link2 } from 'lucide-react'

function getDayColor(day: number): { bg: string; border?: string } {
  if (day === 9 || day === 20) return { bg: '#F59E4A' } // HONEST
  if (day === 29 || day === 30) return { bg: '#FFFFFF', border: '1.5px solid #D4EDE3' } // MISSED
  return { bg: '#3D7A5F' } // VERIFIED
}

export default function SprintRecordPage() {
  const navigate = useNavigate()
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500)
      return () => clearTimeout(t)
    }
  }, [toast])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setToast('Copied to clipboard!')
  }

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', maxWidth: '430px', margin: '0 auto', borderTop: '3px solid #3D7A5F' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#6B9E8A', fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', letterSpacing: '0.01em' }}
      >
        <ChevronLeft size={16} /> Back
      </button>

      {/* Header bar */}
      <div style={{ backgroundColor: '#2D5A47', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', letterSpacing: '0.15em', color: '#7AB5A0', margin: '0 0 4px', textTransform: 'uppercase' }}>SPRINT RECORD</p>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 500, color: '#FFFFFF', margin: 0 }}>StrideWithMe</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#7AB5A0', margin: '0 0 4px' }}>Verified</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#7AB5A0' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#FFFFFF' }}>AI + public record</span>
          </div>
        </div>
      </div>

      {/* Color accent strip */}
      <div style={{ display: 'flex', height: '4px', width: '100%' }}>
        <div style={{ flex: 3, backgroundColor: '#3D7A5F' }} />
        <div style={{ flex: 0.5, backgroundColor: '#F59E4A' }} />
        <div style={{ flex: 0.5, backgroundColor: '#7B6FA0' }} />
      </div>

      {/* User section */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #F0F0F0', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#D4EDE3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: '20px', color: '#3D7A5F', flexShrink: 0 }}>AK</div>
        <div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 600, color: '#1A2E25', margin: 0 }}>Arjun Kapoor</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#9BBFB2', margin: '2px 0 0', letterSpacing: '0.01em' }}>@arjunbuilds · stride.me/arjunbuilds</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.1em', color: '#9BBFB2', margin: '10px 0 4px', textTransform: 'uppercase' }}>GOAL COMMITTED</p>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontStyle: 'italic', color: '#1A2E25', lineHeight: 1.5, margin: 0 }}>"Ship my SaaS landing page and get first 10 waitlist signups in 30 days"</p>
        </div>
      </div>

      {/* Credential badge */}
      <div style={{ background: 'linear-gradient(90deg, #1C3D30, #2D5A47)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="#FFFFFF" />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: '#FFFFFF' }}>AI-Verified Sprint Record</span>
        </div>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '9999px', padding: '4px 10px' }}>✓ Authentic</span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #F0F0F0', backgroundColor: '#FAFAFA' }}>
        {[
          { label: 'Days committed', value: '30', color: '#1A2E25', cellBg: 'transparent' },
          { label: 'Days logged', value: '27', color: '#1A2E25', cellBg: '#EAF5F0' },
          { label: 'Completion', value: '90%', color: '#3D7A5F', cellBg: '#EAF5F0' },
          { label: 'Cohort witnessed', value: '143', color: '#7B6FA0', cellBg: '#F0EEF8' },
        ].map((stat, i) => (
          <div key={stat.label} style={{ padding: '14px 8px', textAlign: 'center', borderRight: i < 3 ? '1px solid #F0F0F0' : 'none', backgroundColor: stat.cellBg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.05em', color: '#9BBFB2', whiteSpace: 'nowrap' }}>{stat.label}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '22px', fontWeight: 700, color: stat.color, whiteSpace: 'nowrap' }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.05em', color: '#9BBFB2', margin: '0 0 10px' }}>Daily activity — 30 day sprint</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: '3px' }}>
          {Array.from({ length: 30 }, (_, i) => {
            const { bg, border } = getDayColor(i + 1)
            return (
              <div key={i} style={{ width: '22px', height: '22px', borderRadius: '4px', backgroundColor: bg, border: border || 'none', boxSizing: 'border-box' }} />
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#3D7A5F' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#9BBFB2' }}>Verified</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#F59E4A' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#9BBFB2' }}>Honest day</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#FFFFFF', border: '1.5px solid #D4EDE3', boxSizing: 'border-box' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#9BBFB2' }}>Missed</span>
          </div>
        </div>
      </div>

      {/* AI Narrative */}
      <div style={{ padding: '20px 20px', borderBottom: '1px solid #F0F0F0' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.12em', color: '#D97706', margin: '0 0 12px', textTransform: 'uppercase' }}>✦ AI-GENERATED SPRINT NARRATIVE</p>
        <div style={{ background: 'linear-gradient(135deg, #EAF5F0 0%, #FEF8F0 100%)', borderRadius: '16px', padding: '18px', border: '1px solid #D4EDE3' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#1A2E25', lineHeight: 1.75, margin: 0 }}>
            Arjun started this sprint with a clear technical goal but pivoted his positioning on Day 9 after sharing an early mockup and getting blunt feedback from his cohort. Rather than quitting, he rebuilt the landing page copy from scratch over 3 days. The final waitlist went live on Day 26 — 4 days ahead of target — and crossed 10 signups on Day 29.
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#1A2E25', lineHeight: 1.75, marginTop: '12px' }}>
            Key pattern: consistently showed up after setbacks. Two missed days were both followed by double-output days. This sprint shows someone who builds through friction, not around it.
          </p>
        </div>
      </div>

      {/* Sprint Highlights */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.12em', color: '#9BBFB2', margin: '0 0 12px', textTransform: 'uppercase' }}>SPRINT HIGHLIGHTS</p>
        {[
          { day: 'Day 1', text: 'Committed goal publicly. Shared initial wireframe sketch.', color: '#3D7A5F' },
          { day: 'Day 9', text: "Pivoted positioning. Logged the blocker honestly — got 18 'witnessed' reactions.", color: '#F59E4A' },
          { day: 'Day 26', text: 'Landing page live. First real link shared publicly.', color: '#7B6FA0' },
          { day: 'Day 29', text: '10th waitlist signup. Goal achieved one day early.', color: '#D97706' },
        ].map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', padding: '6px 0 6px 4px', borderBottom: i < 3 ? '1px solid #F7F7F7' : 'none', borderLeft: `3px solid ${h.color}`, paddingLeft: '12px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: h.color, minWidth: '44px' }}>{h.day}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#1A2E25', lineHeight: 1.4 }}>{h.text}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', margin: '0 0 2px', letterSpacing: '0.01em' }}>Issued by StrideWithMe · March 2025</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', margin: 0, letterSpacing: '0.01em' }}>stride.me/arjunbuilds/sprint/001 · All logs public</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => navigate('/record/1/full')}
            style={{ width: '100%', height: '44px', backgroundColor: '#EAF5F0', color: '#2D5A47', border: '1.5px solid #B8D9CC', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.02em' }}
          >
            View full sprint →
          </button>
          <button
            onClick={() => setShowShareSheet(true)}
            style={{ width: '100%', height: '44px', backgroundColor: '#3D7A5F', color: '#FFFFFF', border: 'none', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', letterSpacing: '0.02em' }}
          >
            <Share2 size={14} /> Share this record
          </button>
        </div>
      </div>

      {/* Share Sheet */}
      {showShareSheet && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100 }} onClick={() => setShowShareSheet(false)}>
          <div
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: '430px', margin: '0 auto', backgroundColor: '#FFFFFF', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ width: '40px', height: '4px', backgroundColor: '#E0E0E0', borderRadius: '2px', margin: '0 auto 20px' }} />
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#1A3028', margin: '0 0 6px' }}>Share your Sprint Record</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#9BBFB2', margin: '0 0 20px', letterSpacing: '0.01em' }}>Let the world see what you built.</p>

            {/* LinkedIn */}
            <div
              onClick={() => window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(window.location.href), '_blank')}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#0A66C2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>in</div>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>LinkedIn</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0, letterSpacing: '0.01em' }}>Share to your profile or network</p>
              </div>
            </div>

            {/* Instagram */}
            <div
              onClick={() => { navigator.clipboard.writeText(window.location.href); setToast('Link copied! Paste in Instagram.'); }}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Camera size={18} color="#FFFFFF" />
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Instagram</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0, letterSpacing: '0.01em' }}>Copy link — paste in your bio or story</p>
              </div>
            </div>

            {/* Naukri */}
            <div
              onClick={() => { navigator.clipboard.writeText(window.location.href); setToast('Link copied! Paste on Naukri profile.'); window.open('https://www.naukri.com', '_blank'); }}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#FF7555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>N</div>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Naukri.com</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0, letterSpacing: '0.01em' }}>Share as proof of work to recruiters</p>
              </div>
            </div>

            {/* Copy link */}
            <div
              onClick={copyLink}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', cursor: 'pointer' }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#EAF5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Link2 size={18} color="#3D7A5F" />
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Copy link</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: 0, letterSpacing: '0.01em' }}>Works anywhere — WhatsApp, email, Notion</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1C3D30', color: '#FFFFFF', fontFamily: 'var(--font-body)', fontSize: '12px', borderRadius: '9999px', padding: '10px 20px', zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
