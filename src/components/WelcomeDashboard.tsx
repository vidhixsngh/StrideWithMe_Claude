import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ExampleRecordContent from './ExampleRecordContent'

const quotes = [
  "The gap between who you are and who you want to be is closed by showing up.",
  "You don't rise to the level of your goals. You fall to the level of your systems. Build the system today.",
  "One honest day beats seven days of pretending.",
  "The Sprint Record you earn is proof that you did the work when no one was watching.",
  "Small proof, every day. That's the whole strategy.",
]

const mockActivity = [
  { initials: 'PS', bg: '#3D7A5F', name: 'Priya Sharma', day: 22, type: 'VERIFIED', text: 'Sent 5 cold proposals with custom portfolio links.' },
  { initials: 'KN', bg: '#F59E4A', name: 'Kavya Nair', day: 18, type: 'HONEST', text: 'Took an honest day. Blocked on Chapter 3.' },
  { initials: 'RV', bg: '#7AB5A0', name: 'Rohan Verma', day: 14, type: 'VERIFIED', text: 'Completed a full PRD for an imaginary feature.' },
  { initials: 'MI', bg: '#D97706', name: 'Meera Iyer', day: 27, type: 'VERIFIED', text: 'Published template #4. Got 3 organic downloads.' },
  { initials: 'SR', bg: '#4A8C6F', name: 'Siddharth Rao', day: 9, type: 'VERIFIED', text: 'Passed Module 3 with 91%. Frameworks clicking now.' },
]

const mockRecords = [
  { initials: 'AK', bg: '#2D5A47', name: 'Arjun Kapoor', goal: 'Ship SaaS landing page and get first 10 waitlist signups', logged: 27, total: 30, verified: 24, honest: 3, completion: 90, highlights: ['Day 1 · Set goal publicly', 'Day 9 · Pivoted after feedback', 'Day 26 · Landing page live', 'Day 29 · 10th signup achieved'] },
  { initials: 'MI', bg: '#D97706', name: 'Meera Iyer', goal: 'Build and launch a Notion template business', logged: 27, total: 30, verified: 25, honest: 2, completion: 95, highlights: ['Day 1 · First template drafted', 'Day 12 · Gumroad store live', 'Day 20 · First sale', 'Day 28 · 4 templates published'] },
]

export default function WelcomeDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [displayText, setDisplayText] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const [subVisible, setSubVisible] = useState(false)
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [quoteVisible, setQuoteVisible] = useState(true)
  const [heatmapFilled, setHeatmapFilled] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [profileToast, setProfileToast] = useState(false)
  const [, setSelectedRecord] = useState(0)
  const tickerRef = useRef<HTMLDivElement>(null)

  const greeting = 'Hey Strider.'

  useEffect(() => {
    let i = 0
    setDisplayText('')
    setTypingDone(false)
    setSubVisible(false)
    const interval = setInterval(() => {
      if (i < greeting.length) {
        setDisplayText(greeting.slice(0, i + 1))
        i++
      } else {
        clearInterval(interval)
        setTypingDone(true)
        setTimeout(() => setSubVisible(true), 300)
      }
    }, 80)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false)
      setTimeout(() => {
        setQuoteIndex(i => (i + 1) % quotes.length)
        setQuoteVisible(true)
      }, 400)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let count = 0
    let filling = true
    const interval = setInterval(() => {
      if (filling) {
        if (count < 30) {
          count++
          setHeatmapFilled(count)
        } else {
          filling = false
          setTimeout(() => {
            count = 0
            setHeatmapFilled(0)
            filling = true
          }, 6000)
        }
      }
    }, 60)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const ticker = tickerRef.current
    if (!ticker) return
    let pos = 0
    const speed = 0.4
    const scroll = () => {
      pos += speed
      if (pos >= ticker.scrollHeight / 2) pos = 0
      ticker.scrollTop = pos
    }
    const id = setInterval(scroll, 16)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!profileToast) return
    const t = setTimeout(() => setProfileToast(false), 2500)
    return () => clearTimeout(t)
  }, [profileToast])

  const heatmapDays = Array.from({ length: 30 }, (_, i) => i + 1)

  return (
    <div style={{ background: 'linear-gradient(180deg, #EAF5F0 0%, #F0F7F4 35%, #F5F0E8 100%)', minHeight: '100vh', maxWidth: '430px', margin: '0 auto', paddingTop: 'env(safe-area-inset-top)', paddingBottom: `calc(80px + env(safe-area-inset-bottom))` }}>

      {/* TOP NAV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/icon-192.png" alt="StrideWithMe" style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, boxShadow: '0 4px 12px rgba(107,176,72,0.20)', objectFit: 'cover' }} />
          <span style={{ fontFamily: 'Lora, serif', fontSize: '16px', color: '#1A3028' }}>StrideWithMe</span>
        </div>
        {(() => {
          const avatarUrl = (user?.user_metadata as Record<string, unknown> | undefined)?.avatar_url as string | undefined
            ?? (user?.user_metadata as Record<string, unknown> | undefined)?.picture as string | undefined
          return (
            <button onClick={() => setProfileToast(true)} style={{ width: '34px', height: '34px', borderRadius: '50%', background: avatarUrl ? '#FFFFFF' : 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 600, boxShadow: '0 2px 8px rgba(107,176,72,0.25)', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', overflow: 'hidden' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
              ) : (
                (user?.email?.[0] ?? 'S').toUpperCase()
              )}
            </button>
          )
        })()}
      </div>

      {/* SECTION 1 — PERSONAL WELCOME */}
      <div style={{ padding: '8px 20px 0' }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: '32px', fontWeight: '700', color: '#1A3028', minHeight: '44px', letterSpacing: '-0.5px' }}>
          {displayText}
          <span style={{ display: 'inline-block', width: '2px', height: '32px', background: '#3D7A5F', marginLeft: '2px', verticalAlign: 'middle', opacity: typingDone ? 0 : 1, transition: 'opacity 0.3s ease' }} />
        </div>

        <div style={{ fontFamily: 'Lora, serif', fontSize: '20px', color: '#3D7A5F', fontStyle: 'italic', marginTop: '4px', opacity: subVisible ? 1 : 0, transform: subVisible ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}>
          Ready to show up today?
        </div>

        <div style={{ marginTop: '20px', padding: '14px 16px', background: 'rgba(255,255,255,0.7)', borderRadius: '16px', border: '1px solid #EDF2EF', minHeight: '72px', display: 'flex', alignItems: 'center' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#2D4A3E', fontStyle: 'italic', lineHeight: '1.6', margin: 0, opacity: quoteVisible ? 1 : 0, transform: quoteVisible ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 0.4s ease, transform 0.4s ease' }}>
            "{quotes[quoteIndex]}"
          </p>
        </div>

        <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.75)', borderRadius: '20px', border: '1px solid #EDF2EF', padding: '16px' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#6B9E8A', fontStyle: 'italic', margin: '0 0 12px 0' }}>30 days. One goal. Your proof.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px' }}>
            {heatmapDays.map(d => {
              const isLast = d === 30
              const filled = d <= heatmapFilled
              if (isLast && filled) return <div key={d} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🌻</div>
              return <div key={d} style={{ width: '24px', height: '24px', borderRadius: '5px', background: filled ? '#3D7A5F' : '#D4EDE3', transition: 'background 0.2s ease' }} />
            })}
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#9BBFB2', fontStyle: 'italic', margin: '10px 0 0 0', textAlign: 'right' }}>This could be your next 30 days →</p>
        </div>

        <button onClick={() => navigate('/onboarding')} style={{ width: '100%', height: '54px', background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)', color: 'white', border: 'none', borderRadius: '9999px', fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 500, cursor: 'pointer', marginTop: '20px', boxShadow: '0 8px 24px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)', letterSpacing: '0.01em' }}>
          I'm ready. Let's go →
        </button>
        <p style={{ textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#9BBFB2', fontStyle: 'italic', marginTop: '8px' }}>Set your goal in 2 minutes · Free</p>
      </div>

      {/* SECTION 2 — LIVE WORLD TICKER */}
      <div style={{ padding: '28px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3D7A5F', animation: 'pulse-ring 1.5s infinite' }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#3D7A5F', fontStyle: 'italic', fontWeight: '500' }}>847 people building right now</span>
        </div>

        <div style={{ height: '220px', overflow: 'hidden', borderRadius: '20px', border: '1px solid #EDF2EF', background: 'rgba(255,255,255,0.75)' }}>
          <div ref={tickerRef} style={{ height: '100%', overflowY: 'hidden' }}>
            {[...mockActivity, ...mockActivity].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', borderBottom: '1px solid #F5F5F5' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>{item.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: '600', color: '#1A3028' }}>{item.name}</span>
                    <span style={{ background: '#D4EDE3', color: '#3D7A5F', fontSize: '10px', borderRadius: '9999px', padding: '2px 8px', fontStyle: 'italic' }}>Day {item.day}</span>
                    <span style={{ fontSize: '12px' }}>{item.type === 'VERIFIED' ? '✅' : '🤍'}</span>
                  </div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#6B9E8A', fontStyle: 'italic', margin: '3px 0 0 0', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3 — PROOF CARDS */}
      <div style={{ padding: '56px 0 0' }}>
        <div style={{ padding: '0 20px 12px' }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: '18px', color: '#1A3028', margin: '0 0 4px 0' }}>What people have built</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#6B9E8A', fontStyle: 'italic', margin: 0 }}>Real Sprint Records. Earned in 30 days.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 20px 8px', scrollbarWidth: 'none' }} className="no-scrollbar">
          {mockRecords.map((record, i) => (
            <div key={i} onClick={() => { setSelectedRecord(i); setPreviewOpen(true) }} style={{ minWidth: '280px', background: 'white', borderRadius: '20px', border: '1px solid #EDF2EF', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 12px rgba(45,90,71,0.06)', flexShrink: 0 }}>
              <div style={{ background: record.bg, padding: '12px 14px' }}>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', fontStyle: 'italic', marginBottom: '4px' }}>SPRINT RECORD</div>
                <div style={{ fontFamily: 'Lora, serif', fontSize: '13px', color: 'white', fontWeight: '600' }}>{record.name}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.goal}</div>
              </div>
              <div style={{ display: 'flex', height: '3px' }}>
                <div style={{ background: '#3D7A5F', flex: 3 }} />
                <div style={{ background: '#F59E4A', flex: 0.5 }} />
                <div style={{ background: '#7B6FA0', flex: 0.5 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '12px 14px 8px', gap: '4px' }}>
                {[
                  { label: 'Days', value: record.total, color: undefined },
                  { label: 'Verified ✓', value: record.verified, color: '#3D7A5F' },
                  { label: 'Completion', value: record.completion + '%', color: '#3D7A5F' },
                ].map((stat, j) => (
                  <div key={j} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: '700', color: stat.color ?? '#1A2E25' }}>{stat.value}</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#9BBFB2', letterSpacing: '0.04em' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '0 14px 8px', display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: '2px' }}>
                {Array.from({ length: 30 }, (_, d) => (
                  <div key={d} style={{ height: '8px', borderRadius: '2px', background: d === 29 ? 'transparent' : d < record.logged ? (d === 8 || d === 19 ? '#F59E4A' : '#3D7A5F') : '#D4EDE3' }} />
                ))}
              </div>
              <div style={{ padding: '8px 14px 14px' }}>
                {record.highlights.map((h, j) => (
                  <div key={j} style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#6B9E8A', fontStyle: 'italic', padding: '3px 0', borderTop: j === 0 ? '1px solid #F0F0F0' : 'none', marginTop: j === 0 ? '4px' : '0' }}>{h}</div>
                ))}
              </div>
              <div style={{ padding: '8px 14px 14px', textAlign: 'center', borderTop: '1px solid #F5F5F5' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#3D7A5F', fontStyle: 'italic' }}>Tap to see full record →</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', padding: '40px 20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🏃</span>
          <span style={{ fontFamily: 'Lora, serif', fontSize: '15px', fontWeight: 500, fontStyle: 'italic', color: '#1A3028' }}>You're next. →</span>
        </div>
      </div>

      {/* PROFILE LOCKED TOAST */}
      {profileToast && (
        <div style={{ position: 'fixed', top: 'calc(72px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', color: 'white', borderRadius: '12px', padding: '12px 18px', boxShadow: '0 8px 24px rgba(107,176,72,0.32)', display: 'flex', alignItems: 'center', gap: '8px', maxWidth: 'calc(100% - 40px)', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '16px' }}>🔒</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500 }}>Start a sprint to access profile</span>
        </div>
      )}

      {/* PREVIEW BOTTOM SHEET */}
      {previewOpen && (
        <>
          <div onClick={() => setPreviewOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: 'white', borderRadius: '24px 24px 0 0', zIndex: 9999, maxHeight: '88vh', overflowY: 'auto', paddingBottom: '32px' }}>
            <div style={{ width: '40px', height: '4px', background: '#E0E0E0', borderRadius: '2px', margin: '12px auto 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 20px', borderBottom: '1px solid #F0F0F0', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
              <div>
                <p style={{ fontFamily: 'Lora, serif', fontSize: '16px', color: '#1A3028', margin: 0 }}>Example Sprint Record</p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#9BBFB2', fontStyle: 'italic', margin: '2px 0 0 0' }}>This is what you'll earn.</p>
              </div>
              <button onClick={() => setPreviewOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#9BBFB2', cursor: 'pointer', padding: '0' }}>✕</button>
            </div>
            <div style={{ background: '#FEF3E8', borderBottom: '1px solid #F5D5A8', padding: '8px 20px', textAlign: 'center' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#D97706', fontStyle: 'italic' }}>✦ Example only — your record will reflect your actual sprint journey</span>
            </div>
            <ExampleRecordContent />
            <div style={{ padding: '16px 20px 0' }}>
              <button onClick={() => { setPreviewOpen(false); navigate('/onboarding') }} style={{ width: '100%', height: '50px', background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)', color: 'white', border: 'none', borderRadius: '9999px', fontFamily: 'Lora, serif', fontSize: '15px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)' }}>
                Start your sprint to earn this →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
