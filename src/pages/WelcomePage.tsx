import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'
import ExampleRecordContent from '../components/ExampleRecordContent'

const goals = [
  "get your first client.",
  "ship your side project.",
  "land your next role.",
  "build in public.",
  "finish what you started.",
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

const testimonials = [
  { initials: 'MI', bg: '#3D7A5F', name: 'Meera Iyer', role: 'Notion Creator · Freelancer', stats: '27/30 verified', quote: "I've tried 6 habit apps. StrideWithMe is the first one that didn't make me feel guilty for a bad day. The Sprint Record I earned is something I actually put on my LinkedIn." },
  { initials: 'RV', bg: '#7AB5A0', name: 'Rohan Verma', role: 'Engineer → PM', stats: '24/30 verified', quote: "The AI verification is the whole thing — it actually called out my vague log and made me rewrite it. That friction made me insightful about my own work like a mentor would." },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
      <div style={{ flex: 1, height: '1px', backgroundColor: '#D4EDE3' }} />
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{children}</span>
      <div style={{ flex: 1, height: '1px', backgroundColor: '#D4EDE3' }} />
    </div>
  )
}

export default function WelcomePage() {
  const navigate = useNavigate()
  const [goalIndex, setGoalIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const tickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setGoalIndex((i) => (i + 1) % goals.length)
        setVisible(true)
      }, 300)
    }, 2500)
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

  return (
    <PageWrapper showNav={false}>
      <div style={{ background: 'linear-gradient(180deg, #FBFAF6 0%, #F8F6F1 50%, #F5F2EC 100%)', minHeight: '100vh', maxWidth: '430px', margin: '0 auto', position: 'relative', overflow: 'hidden' }}>

        {/* Ambient hero glow */}
        <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,176,72,0.10) 0%, rgba(108,176,72,0) 70%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '180px', left: '-100px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,176,72,0.06) 0%, rgba(108,176,72,0) 70%)', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Top Nav */}
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/icon-192.png" alt="StrideWithMe" style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, boxShadow: '0 4px 16px rgba(28,61,48,0.20)', objectFit: 'cover' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#1A3028', letterSpacing: '-0.01em' }}>StrideWithMe</span>
        </div>

        {/* Social proof pill */}
        <div style={{ padding: '12px 24px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(184,217,204,0.6)', borderRadius: '9999px', padding: '7px 16px', boxShadow: '0 2px 12px rgba(45,90,71,0.06)' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#3D7A5F', animation: 'pillPulse 1.8s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', fontWeight: 500, color: '#3D7A5F' }}>847 people in active sprints</span>
          </div>
        </div>

        {/* Hero text — big rotating headline back, small tag above */}
        <div style={{ padding: '24px 24px 0', position: 'relative', zIndex: 2 }}>
          <span style={{ display: 'inline-block', fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', letterSpacing: '0.12em', color: '#5A9A3A', textTransform: 'uppercase', fontWeight: 600, marginBottom: '14px' }}>
            For everyone tired of starting over
          </span>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '36px', color: '#1A3028', fontWeight: 400, display: 'block', lineHeight: 1.12, letterSpacing: '-0.02em' }}>30 days to</span>
          <div style={{ height: '48px', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '36px', fontStyle: 'italic', color: '#3D7A5F', fontWeight: 700, display: 'block', lineHeight: 1.12, letterSpacing: '-0.02em', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 0.3s ease, transform 0.3s ease', whiteSpace: 'nowrap' }}>{goals[goalIndex]}</span>
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '36px', color: '#1A3028', fontWeight: 400, display: 'block', lineHeight: 1.12, letterSpacing: '-0.02em' }}>Start today.</span>
        </div>

        {/* Plant-journey animation strip — left-to-right growth ending in a sunflower */}
        <div style={{ position: 'relative', margin: '24px 16px 0', height: '170px', overflow: 'hidden', borderRadius: '20px', background: 'linear-gradient(180deg, rgba(245,213,71,0.06) 0%, rgba(255,255,255,0.4) 35%, rgba(118,197,72,0.10) 100%)', border: '1px solid rgba(184,217,204,0.4)' }}>
          <svg viewBox="0 0 360 170" preserveAspectRatio="xMidYEnd meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs>
              <radialGradient id="flowerCenter">
                <stop offset="0%" stopColor="#A66A2A" />
                <stop offset="100%" stopColor="#5A3A1A" />
              </radialGradient>
              <linearGradient id="leafGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#7CCB52" />
                <stop offset="100%" stopColor="#5A9A3A" />
              </linearGradient>
            </defs>

            {/* SUN — top-right with rotating rays + glow */}
            <g style={{ filter: 'drop-shadow(0 0 12px rgba(245,180,71,0.55))' }}>
              <g style={{ transformOrigin: '310px 32px', animation: 'spin 40s linear infinite' }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <line key={i} x1="310" y1="14" x2="310" y2="22" stroke="#F5B447" strokeWidth="2" strokeLinecap="round" opacity="0.6" transform={`rotate(${i * 30} 310 32)`} />
                ))}
              </g>
              <circle cx="310" cy="32" r="13" fill="#F5C547" />
              <circle cx="306" cy="29" r="4" fill="#F8DD66" opacity="0.7" />
            </g>

            {/* Ground line (dashed) */}
            <line x1="0" y1="148" x2="360" y2="148" stroke="#B8D9CC" strokeWidth="1" opacity="0.55" strokeDasharray="3,4" />

            {/* PLANT 1 — tiny seed sprout */}
            <g style={{ transformOrigin: '32px 148px', animation: 'sway 5s ease-in-out infinite' }}>
              <ellipse cx="32" cy="150" rx="14" ry="2.5" fill="#5A4A3A" opacity="0.18" />
              <path d="M32,148 L32,134" stroke="#6BB048" strokeWidth="2" strokeLinecap="round" strokeDasharray="20" style={{ animation: 'seedlingDraw 6s ease-out infinite' }} />
              <g style={{ transformOrigin: '32px 134px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '0.4s' }}>
                <ellipse cx="24" cy="130" rx="6" ry="3" fill="#7CCB52" transform="rotate(-30 24 130)" />
                <ellipse cx="40" cy="130" rx="6" ry="3" fill="#76C548" transform="rotate(30 40 130)" />
              </g>
            </g>

            {/* PLANT 2 — small sapling */}
            <g style={{ transformOrigin: '95px 148px', animation: 'sway 5.5s ease-in-out infinite', animationDelay: '0.4s' }}>
              <ellipse cx="95" cy="150" rx="16" ry="3" fill="#5A4A3A" opacity="0.18" />
              <path d="M95,148 Q94,124 95,104" stroke="#6BB048" strokeWidth="2.2" strokeLinecap="round" fill="none" strokeDasharray="50" style={{ animation: 'seedlingDraw 6s ease-out infinite', animationDelay: '0.5s' }} />
              <g style={{ transformOrigin: '95px 124px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '0.9s' }}>
                <ellipse cx="80" cy="120" rx="11" ry="5" fill="#76C548" transform="rotate(-30 80 120)" />
              </g>
              <g style={{ transformOrigin: '95px 112px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '1.1s' }}>
                <ellipse cx="111" cy="108" rx="11" ry="5" fill="#7CCB52" transform="rotate(28 111 108)" />
              </g>
              <g style={{ transformOrigin: '95px 104px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '1.3s' }}>
                <path d="M95,104 Q88,96 92,89 Q97,93 95,102 Z" fill="#7CCB52" />
                <path d="M95,104 Q102,96 98,89 Q93,93 95,102 Z" fill="#76C548" />
              </g>
            </g>

            {/* PLANT 3 — medium plant */}
            <g style={{ transformOrigin: '160px 148px', animation: 'sway 6s ease-in-out infinite', animationDelay: '0.6s' }}>
              <ellipse cx="160" cy="150" rx="20" ry="3" fill="#5A4A3A" opacity="0.18" />
              <path d="M160,148 Q158,116 160,80" stroke="#6BB048" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeDasharray="80" style={{ animation: 'seedlingDraw 6s ease-out infinite', animationDelay: '1s' }} />
              <g style={{ transformOrigin: '160px 124px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '1.5s' }}>
                <ellipse cx="142" cy="122" rx="13" ry="6" fill="#76C548" transform="rotate(-30 142 122)" />
              </g>
              <g style={{ transformOrigin: '160px 108px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '1.7s' }}>
                <ellipse cx="178" cy="104" rx="13" ry="6" fill="#7CCB52" transform="rotate(28 178 104)" />
              </g>
              <g style={{ transformOrigin: '160px 92px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '1.9s' }}>
                <ellipse cx="146" cy="90" rx="11" ry="5" fill="#76C548" transform="rotate(-30 146 90)" />
              </g>
              <g style={{ transformOrigin: '160px 80px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.1s' }}>
                <path d="M160,80 Q150,72 156,64 Q162,68 160,78 Z" fill="#7CCB52" />
                <path d="M160,80 Q170,72 164,64 Q158,68 160,78 Z" fill="#76C548" />
              </g>
            </g>

            {/* PLANT 4 — tall stem with bud forming */}
            <g style={{ transformOrigin: '230px 148px', animation: 'sway 6.5s ease-in-out infinite', animationDelay: '0.8s' }}>
              <ellipse cx="230" cy="150" rx="22" ry="3" fill="#5A4A3A" opacity="0.18" />
              <path d="M230,148 Q228,112 230,62" stroke="#6BB048" strokeWidth="2.8" strokeLinecap="round" fill="none" strokeDasharray="100" style={{ animation: 'seedlingDraw 6s ease-out infinite', animationDelay: '1.5s' }} />
              <g style={{ transformOrigin: '230px 124px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.0s' }}>
                <ellipse cx="210" cy="122" rx="14" ry="7" fill="#76C548" transform="rotate(-30 210 122)" />
              </g>
              <g style={{ transformOrigin: '230px 102px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.2s' }}>
                <ellipse cx="250" cy="98" rx="14" ry="7" fill="#7CCB52" transform="rotate(28 250 98)" />
              </g>
              <g style={{ transformOrigin: '230px 82px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.4s' }}>
                <ellipse cx="214" cy="80" rx="12" ry="6" fill="#76C548" transform="rotate(-30 214 80)" />
              </g>
              {/* Closed bud */}
              <g style={{ transformOrigin: '230px 62px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.7s' }}>
                <ellipse cx="230" cy="55" rx="7" ry="11" fill="url(#leafGrad)" />
                <path d="M225,58 Q230,46 235,58" stroke="#5A9A3A" strokeWidth="0.8" fill="none" />
              </g>
            </g>

            {/* PLANT 5 — full blooming sunflower */}
            <g style={{ transformOrigin: '305px 148px', animation: 'sway 7s ease-in-out infinite', animationDelay: '1s' }}>
              <ellipse cx="305" cy="150" rx="24" ry="3" fill="#5A4A3A" opacity="0.18" />
              <path d="M305,148 Q303,108 305,74" stroke="#6BB048" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="100" style={{ animation: 'seedlingDraw 6s ease-out infinite', animationDelay: '2s' }} />
              <g style={{ transformOrigin: '305px 124px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.5s' }}>
                <ellipse cx="284" cy="122" rx="15" ry="7" fill="#76C548" transform="rotate(-30 284 122)" />
              </g>
              <g style={{ transformOrigin: '305px 100px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.8s' }}>
                <ellipse cx="326" cy="96" rx="15" ry="7" fill="#7CCB52" transform="rotate(28 326 96)" />
              </g>
              {/* Sunflower head — petals + center */}
              <g style={{ transformOrigin: '305px 74px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '3.1s' }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <ellipse key={i} cx="305" cy="60" rx="4.5" ry="10" fill="#F5C547" transform={`rotate(${i * 30} 305 74)`} />
                ))}
                <circle cx="305" cy="74" r="7" fill="url(#flowerCenter)" />
                <circle cx="303" cy="72" r="2" fill="#A66A2A" opacity="0.6" />
              </g>
            </g>
          </svg>

          {/* Floating particles drifting up */}
          {[
            { left: '12%', size: 4, color: '#76C548', delay: '0s', duration: '6s' },
            { left: '28%', size: 3, color: '#7AB5A0', delay: '1.4s', duration: '7s' },
            { left: '44%', size: 4, color: '#F5C547', delay: '2.2s', duration: '5.5s' },
            { left: '62%', size: 3, color: '#76C548', delay: '3s', duration: '6.5s' },
            { left: '78%', size: 4, color: '#F5C547', delay: '4.2s', duration: '6s' },
            { left: '90%', size: 3, color: '#76C548', delay: '5s', duration: '5.8s' },
          ].map((p, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '12px',
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              background: p.color,
              opacity: 0.55,
              animation: `floatUp ${p.duration} ease-in-out infinite`,
              animationDelay: p.delay,
              pointerEvents: 'none',
            }} />
          ))}

          {/* Subtle journey label */}
          <span style={{ position: 'absolute', bottom: '6px', left: '14px', fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#9BBFB2', textTransform: 'uppercase' }}>Day 1</span>
          <span style={{ position: 'absolute', bottom: '6px', right: '14px', fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#5A9A3A', textTransform: 'uppercase', fontWeight: 600 }}>Day 30 · Bloom</span>
        </div>

        {/* Primary CTA — at the edge of the first fold */}
        <div style={{ padding: '20px 24px 0', position: 'relative', zIndex: 2 }}>
          <button onClick={() => navigate('/auth')} style={{ width: '100%', height: '54px', background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 8px 24px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)', letterSpacing: '0.015em' }}>
            Begin your journey today →
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '14px' }}>
            {['Free to start', 'Private by default', '2 minutes'].map((t) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#B8D9CC' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PROOF CARDS — moved up: this is what you earn */}
        <div style={{ marginTop: '48px', padding: '0 24px' }}>
          <SectionLabel>What you earn at the end</SectionLabel>
        </div>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 24px 8px', scrollbarWidth: 'none' }} className="no-scrollbar">
          {mockRecords.map((record, i) => (
            <div key={i} onClick={() => setPreviewOpen(true)} style={{ minWidth: '280px', background: 'white', borderRadius: '20px', border: '1px solid #EDF2EF', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 12px rgba(45,90,71,0.06)', flexShrink: 0 }}>
              <div style={{ background: record.bg, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', fontStyle: 'italic', marginBottom: '4px' }}>SPRINT RECORD</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', color: 'white', fontWeight: 600 }}>{record.name}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.goal}</div>
              </div>
              <div style={{ display: 'flex', height: '3px' }}>
                <div style={{ background: '#3D7A5F', flex: 3 }} />
                <div style={{ background: '#F59E4A', flex: 0.5 }} />
                <div style={{ background: '#7B6FA0', flex: 0.5 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '12px 14px 8px', gap: '4px' }}>
                {[{ label: 'Days', value: record.total, color: undefined }, { label: 'Verified ✓', value: record.verified, color: '#3D7A5F' }, { label: 'Completion', value: record.completion + '%', color: '#3D7A5F' }].map((stat, j) => (
                  <div key={j} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: stat.color ?? '#1A2E25' }}>{stat.value}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: '#9BBFB2', letterSpacing: '0.04em' }}>{stat.label}</div>
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
                  <div key={j} style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#6B9E8A', fontStyle: 'italic', padding: '3px 0', borderTop: j === 0 ? '1px solid #F0F0F0' : 'none', marginTop: j === 0 ? '4px' : '0' }}>{h}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: '14px', fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2' }}>Tap to see a full Sprint Record →</p>

        {/* LIVE SPRINTERS — moved below proof cards */}
        <div style={{ marginTop: '48px', padding: '0 24px' }}>
          <SectionLabel>Right now, people are building</SectionLabel>
          <div style={{ background: 'rgba(255,255,255,0.75)', borderRadius: '20px', border: '1px solid #EDF2EF', boxShadow: '0 2px 16px rgba(45,90,71,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3D7A5F', animation: 'pillPulse 1.8s ease-in-out infinite' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: '#1A3028' }}>Active sprinters</span>
              </div>
              <div style={{ display: 'flex' }}>
                {[{ bg: '#3D7A5F', i: 'PS' }, { bg: '#F59E4A', i: 'KN' }, { bg: '#7AB5A0', i: 'RV' }, { bg: '#D97706', i: 'AM' }].map((a, idx) => (
                  <div key={idx} style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 600, color: '#FFFFFF', marginLeft: idx > 0 ? '-8px' : '0', border: '2px solid #FFFFFF', position: 'relative', zIndex: 4 - idx }}>{a.i}</div>
                ))}
              </div>
            </div>
            <div style={{ height: '180px', overflow: 'hidden' }}>
              <div ref={tickerRef} style={{ height: '100%', overflowY: 'hidden' }}>
                {[...mockActivity, ...mockActivity].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 14px', borderBottom: '1px solid #F8F8F8' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '11px', fontWeight: 600, flexShrink: 0, fontFamily: 'var(--font-body)' }}>{item.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#1A3028' }}>{item.name}</span>
                        <span style={{ backgroundColor: '#D4EDE3', color: '#3D7A5F', fontFamily: 'var(--font-body)', fontSize: '10px', borderRadius: '9999px', padding: '2px 8px' }}>Day {item.day}</span>
                        <span style={{ fontSize: '12px' }}>{item.type === 'VERIFIED' ? '✅' : '🤍'}</span>
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: '2px 0 0', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div style={{ marginTop: '56px', padding: '0 20px' }}>
          <SectionLabel>How it works</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { num: '01', title: 'Set your goal', body: "Write what you're actually going after. Be specific — the AI reads it and builds your entire daily plan from it.", emoji: '🎯', detail: '30 tasks. One per day. Escalating in complexity. Fully editable before you begin.' },
              { num: '02', title: 'Show up and log', body: 'Every day, log what you did — text, a photo, or a link to your work. Then Claude reads it.', emoji: '🔍', detail: "Not a word count. Not a checkbox. Claude decides: did this person actually move forward today? Vague logs don't pass. Real work does." },
              { num: '03', title: 'Earn your Sprint Record', body: 'At the end, you receive a verified credential — an AI-narrated document of everything you built.', emoji: '🏆', detail: 'Share it on LinkedIn, Naukri, or anywhere you prove your work. It shows you actually showed up — not just that you intended to.' },
            ].map((step) => (
              <div key={step.num} style={{ background: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid rgba(184, 217, 204, 0.4)', boxShadow: '0 1px 3px rgba(28,61,48,0.04), 0 8px 24px rgba(107,176,72,0.06)', position: 'relative', overflow: 'hidden' }}>
                {/* Top-right accent dot */}
                <div style={{ position: 'absolute', top: '20px', right: '20px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#6BB048' }} />
                {/* Step number — large, decorative */}
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '48px', fontWeight: 600, background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1, letterSpacing: '-0.04em', display: 'block', marginBottom: '8px' }}>{step.num}</span>
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{step.emoji}</span>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '17px', fontWeight: 600, color: '#1A3028', margin: 0, letterSpacing: '-0.01em' }}>{step.title}</p>
                </div>
                {/* Body — readable green-grey */}
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#3D5949', lineHeight: 1.65, margin: 0 }}>{step.body}</p>
                {/* Divider with sprout green tint */}
                <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(107,176,72,0.35) 0%, transparent 100%)', margin: '14px 0' }} />
                {/* Detail — sprout green, full opacity */}
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#5A9A3A', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{step.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* TESTIMONIALS */}
        <div style={{ marginTop: '48px', padding: '0 24px' }}>
          <SectionLabel>What sprinters say</SectionLabel>
        </div>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 24px 8px', scrollbarWidth: 'none' }} className="no-scrollbar">
          {testimonials.map((t, i) => (
            <div key={i} style={{ minWidth: '280px', maxWidth: '280px', backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '16px', border: '1px solid #EDF2EF', boxShadow: '0 1px 8px rgba(26,46,37,0.06)', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: '#D4EDE3', lineHeight: 1 }}>"</span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#2D4A3E', lineHeight: 1.6, margin: '4px 0 16px', flex: 1 }}>{t.quote}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: '#FFFFFF', flexShrink: 0 }}>{t.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#1A3028', margin: 0 }}>{t.name}</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.role}</p>
                </div>
                {t.stats && <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', backgroundColor: '#D4EDE3', color: '#3D7A5F', borderRadius: '9999px', padding: '3px 9px', flexShrink: 0, whiteSpace: 'nowrap' }}>{t.stats}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* CLOSING SPROUT CTA */}
        <div style={{ margin: '48px 20px', background: 'linear-gradient(135deg, #76C548 0%, #6BB048 50%, #5A9A3A 100%)', borderRadius: '28px', padding: '36px 28px', textAlign: 'center', boxShadow: '0 16px 40px rgba(107,176,72,0.30)', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle inner glow */}
          <div style={{ position: 'absolute', top: '-40px', left: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '20px' }}>🌻</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: 400, color: '#FFFFFF', display: 'block' }}>Your sprint starts</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontStyle: 'italic', color: '#FFFFFF', display: 'block', marginBottom: '12px' }}>the moment you decide.</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: '28px' }}>
              30 days. One goal. Daily verification. A Sprint Record that proves you showed up.
            </p>
            <button onClick={() => navigate('/auth')} style={{ backgroundColor: '#FFFFFF', color: '#3D7A5F', fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 600, borderRadius: '9999px', border: 'none', height: '50px', width: '100%', maxWidth: '300px', margin: '0 auto', display: 'block', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              Start my 30-day sprint →
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '20px' }}>
              {['No credit card', 'Private by default', 'Export anytime'].map((t) => (
                <span key={t} style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: 'rgba(255,255,255,0.75)' }}>✓ {t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Preview bottom sheet */}
        {previewOpen && (
          <>
            <div onClick={() => setPreviewOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998 }} />
            <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: 'white', borderRadius: '24px 24px 0 0', zIndex: 9999, maxHeight: '88vh', overflowY: 'auto', paddingBottom: '32px' }}>
              <div style={{ width: '40px', height: '4px', background: '#E0E0E0', borderRadius: '2px', margin: '12px auto 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 20px', borderBottom: '1px solid #F0F0F0', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#1A3028', margin: 0 }}>Example Sprint Record</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: '2px 0 0' }}>This is what you'll earn.</p>
                </div>
                <button onClick={() => setPreviewOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#9BBFB2', cursor: 'pointer', padding: 0 }}>✕</button>
              </div>
              <ExampleRecordContent onCTA={() => { setPreviewOpen(false); navigate('/auth') }} ctaLabel="Start your sprint to earn this →" />
            </div>
          </>
        )}
        </div>
      </div>
    </PageWrapper>
  )
}
