import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'
import ExampleRecordContent from '../components/ExampleRecordContent'
import WelcomeBackSplash from '../components/WelcomeBackSplash'
import { useAuth } from '../context/AuthContext'
import { track, Events } from '../lib/analytics'

const SPLASH_SESSION_FLAG = 'sw_welcome_back_shown'

const goals = [
  "actually finish what you started.",
  "AI-verified daily progress.",
  "no more starting over.",
  "a Sprint Record you earned.",
  "proof you did the work.",
  "becoming someone who ships.",
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
  const { user, loading: authLoading } = useAuth()
  const [goalIndex, setGoalIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [authResolved, setAuthResolved] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const tickerRef = useRef<HTMLDivElement>(null)

  // Decide once auth state has resolved: signed-in → splash → /dashboard, else fall through to landing
  useEffect(() => {
    if (authLoading) return
    if (!user) { setAuthResolved(true); return }
    const alreadyShown = sessionStorage.getItem(SPLASH_SESSION_FLAG) === '1'
    if (alreadyShown) {
      navigate('/dashboard', { replace: true })
      return
    }
    setShowSplash(true)
  }, [authLoading, user, navigate])

  // Memoized so the splash's effect doesn't tear down on every parent re-render
  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem(SPLASH_SESSION_FLAG, '1')
    navigate('/dashboard', { replace: true })
  }, [navigate])

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

  // While auth is resolving, render nothing — avoids flashing the marketing page to a signed-in user
  if (authLoading || (user && !authResolved && !showSplash)) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#FBFAF6' }} />
  }

  if (showSplash) {
    return <WelcomeBackSplash onComplete={handleSplashComplete} />
  }

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
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', fontWeight: 500, color: '#3D7A5F' }}>AI-verified · 30-day sprints</span>
          </div>
        </div>

        {/* Hero text + big prominent sun behind */}
        <div style={{ padding: '20px 24px 0', position: 'relative' }}>
          {/* BIG SUN — lifted way up so it sits in the sky above all text */}
          <div style={{ position: 'absolute', top: '-100px', right: '20px', width: '110px', height: '110px', pointerEvents: 'none', opacity: 0.92, zIndex: 1, animation: 'sunGlow 4s ease-in-out infinite' }}>
            <svg viewBox="0 0 160 160" style={{ width: '100%', height: '100%' }}>
              <g style={{ transformOrigin: '80px 80px', animation: 'spin 40s linear infinite' }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <line key={i} x1="80" y1="14" x2="80" y2="30" stroke="#F5B447" strokeWidth="2.8" strokeLinecap="round" opacity="0.55" transform={`rotate(${i * 30} 80 80)`} />
                ))}
              </g>
              <circle cx="80" cy="80" r="26" fill="#F5D547" opacity="0.25" />
              <circle cx="80" cy="80" r="19" fill="#F5C547" />
              <circle cx="76" cy="76" r="7" fill="#F8DD66" opacity="0.7" />
            </svg>
          </div>

          {/* Soft sun glow wash high above the headline */}
          <div style={{ position: 'absolute', top: '-80px', right: '0px', width: '240px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,213,71,0.20) 0%, rgba(245,213,71,0) 60%)', pointerEvents: 'none', zIndex: 0 }} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* Substantial pill for the problem line */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '9999px', background: 'linear-gradient(135deg, rgba(118,197,72,0.14) 0%, rgba(118,197,72,0.04) 100%)', border: '1px solid rgba(90,154,58,0.35)', marginBottom: '16px', animation: 'tagPulse 2.8s ease-in-out infinite', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              <span style={{ fontSize: '12px' }}>🌱</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', letterSpacing: '0.07em', color: '#3D7A5F', textTransform: 'uppercase', fontWeight: 700 }}>
                For everyone tired of starting over
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', color: '#1A3028', fontWeight: 400, display: 'block', lineHeight: 1.2, letterSpacing: '-0.015em' }}>30 days to</span>
            <div style={{ height: '34px', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontStyle: 'italic', color: '#3D7A5F', fontWeight: 700, display: 'block', lineHeight: 1.2, letterSpacing: '-0.015em', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(4px)', transition: 'opacity 0.3s ease, transform 0.3s ease', whiteSpace: 'nowrap' }}>{goals[goalIndex]}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', color: '#1A3028', fontWeight: 400, display: 'block', lineHeight: 1.2, letterSpacing: '-0.015em' }}>Start today.</span>
          </div>
        </div>

        {/* Plant-journey strip — denser, more detailed, with grass/flowers/butterfly */}
        <div style={{ position: 'relative', margin: '24px 16px 0', height: '180px', overflow: 'hidden', borderRadius: '20px', background: 'linear-gradient(180deg, rgba(245,213,71,0.05) 0%, rgba(255,255,255,0.4) 30%, rgba(118,197,72,0.10) 100%)', border: '1px solid rgba(184,217,204,0.4)' }}>
          <svg viewBox="0 0 360 180" preserveAspectRatio="xMidYEnd meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs>
              <radialGradient id="flowerCenter">
                <stop offset="0%" stopColor="#A66A2A" />
                <stop offset="100%" stopColor="#5A3A1A" />
              </radialGradient>
              <linearGradient id="leafGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#7CCB52" />
                <stop offset="100%" stopColor="#5A9A3A" />
              </linearGradient>
              <linearGradient id="leafGradLight" x1="0" x2="1" y1="0" y2="0.5">
                <stop offset="0%" stopColor="#9BD96E" />
                <stop offset="100%" stopColor="#5A9A3A" />
              </linearGradient>
            </defs>

            {/* DISTANT HILLS silhouette */}
            <path d="M0,150 Q60,135 120,142 T240,138 T360,145 L360,180 L0,180 Z" fill="#B8D9CC" opacity="0.35" />
            <path d="M0,156 Q40,148 80,152 T160,150 T240,148 T320,152 T360,150 L360,180 L0,180 Z" fill="#76C548" opacity="0.20" />

            {/* Ground line (dashed) */}
            <line x1="0" y1="158" x2="360" y2="158" stroke="#B8D9CC" strokeWidth="1" opacity="0.5" strokeDasharray="3,4" />

            {/* GRASS TUFTS scattered along the ground */}
            {[15, 50, 78, 122, 145, 188, 215, 258, 280, 332, 350].map((x, i) => (
              <g key={`grass-${i}`} style={{ transformOrigin: `${x}px 158px`, animation: `sway ${4 + (i % 3)}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}>
                <path d={`M${x},158 Q${x-2},${153 - (i%3)} ${x-3},${149 - (i%3)}`} stroke="#76C548" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                <path d={`M${x},158 Q${x},${152 - (i%3)} ${x+1},${147 - (i%3)}`} stroke="#5A9A3A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                <path d={`M${x},158 Q${x+2},${153 - (i%3)} ${x+3},${149 - (i%3)}`} stroke="#76C548" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              </g>
            ))}

            {/* SMALL DAISIES at the base — 5-petal little flowers */}
            {[{ x: 64, color: '#FFFFFF' }, { x: 132, color: '#F5C547' }, { x: 200, color: '#FFFFFF' }, { x: 268, color: '#F5C547' }, { x: 340, color: '#FFFFFF' }].map((d, i) => (
              <g key={`daisy-${i}`} style={{ transformOrigin: `${d.x}px 154px`, animation: `leafBloom 6s ease-out infinite`, animationDelay: `${1.5 + i * 0.4}s` }}>
                {Array.from({ length: 5 }).map((_, p) => (
                  <ellipse key={p} cx={d.x} cy="150" rx="1.8" ry="3.2" fill={d.color} stroke="rgba(0,0,0,0.05)" strokeWidth="0.3" transform={`rotate(${p * 72} ${d.x} 154)`} />
                ))}
                <circle cx={d.x} cy="154" r="1.4" fill="#D97706" />
              </g>
            ))}

            {/* PLANT 1 — tiny seed sprout with proper cotyledons */}
            <g style={{ transformOrigin: '32px 158px', animation: 'sway 5s ease-in-out infinite' }}>
              <ellipse cx="32" cy="160" rx="14" ry="2.5" fill="#5A4A3A" opacity="0.20" />
              <path d="M32,158 Q31,150 32,140" stroke="#6BB048" strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="22" style={{ animation: 'seedlingDraw 6s ease-out infinite' }} />
              <g style={{ transformOrigin: '32px 140px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '0.4s' }}>
                <path d="M32,140 Q22,138 18,134 Q24,130 32,138 Z" fill="url(#leafGradLight)" />
                <path d="M32,140 Q42,138 46,134 Q40,130 32,138 Z" fill="url(#leafGradLight)" />
                <line x1="32" y1="140" x2="22" y2="135" stroke="#5A9A3A" strokeWidth="0.4" opacity="0.6" />
                <line x1="32" y1="140" x2="42" y2="135" stroke="#5A9A3A" strokeWidth="0.4" opacity="0.6" />
              </g>
            </g>

            {/* PLANT 2 — small fern-like sapling, more leaves */}
            <g style={{ transformOrigin: '95px 158px', animation: 'sway 5.5s ease-in-out infinite', animationDelay: '0.4s' }}>
              <ellipse cx="95" cy="160" rx="17" ry="3" fill="#5A4A3A" opacity="0.20" />
              <path d="M95,158 Q93,134 95,114" stroke="#6BB048" strokeWidth="2.2" strokeLinecap="round" fill="none" strokeDasharray="50" style={{ animation: 'seedlingDraw 6s ease-out infinite', animationDelay: '0.5s' }} />
              {/* Pointed leaves with veins */}
              <g style={{ transformOrigin: '95px 134px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '0.9s' }}>
                <path d="M95,134 Q82,128 76,118 Q86,124 95,132 Z" fill="url(#leafGradLight)" />
                <line x1="95" y1="134" x2="78" y2="120" stroke="#5A9A3A" strokeWidth="0.5" opacity="0.7" />
              </g>
              <g style={{ transformOrigin: '95px 124px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '1.1s' }}>
                <path d="M95,124 Q108,118 114,108 Q104,114 95,122 Z" fill="#7CCB52" />
                <line x1="95" y1="124" x2="112" y2="110" stroke="#5A9A3A" strokeWidth="0.5" opacity="0.7" />
              </g>
              <g style={{ transformOrigin: '95px 116px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '1.3s' }}>
                <path d="M95,116 Q86,110 82,102 Q90,106 95,114 Z" fill="url(#leafGradLight)" />
                <line x1="95" y1="116" x2="84" y2="104" stroke="#5A9A3A" strokeWidth="0.4" opacity="0.7" />
              </g>
              <g style={{ transformOrigin: '95px 114px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '1.5s' }}>
                <path d="M95,114 Q88,106 92,98 Q98,103 95,112 Z" fill="#7CCB52" />
                <path d="M95,114 Q102,106 98,98 Q92,103 95,112 Z" fill="#76C548" />
              </g>
            </g>

            {/* PLANT 3 — bushy with multiple alternate leaves + small bud */}
            <g style={{ transformOrigin: '160px 158px', animation: 'sway 6s ease-in-out infinite', animationDelay: '0.6s' }}>
              <ellipse cx="160" cy="160" rx="22" ry="3.5" fill="#5A4A3A" opacity="0.20" />
              <path d="M160,158 Q157,124 160,86" stroke="#6BB048" strokeWidth="2.6" strokeLinecap="round" fill="none" strokeDasharray="80" style={{ animation: 'seedlingDraw 6s ease-out infinite', animationDelay: '1s' }} />
              <g style={{ transformOrigin: '160px 134px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '1.5s' }}>
                <path d="M160,134 Q140,128 134,116 Q146,124 160,132 Z" fill="url(#leafGradLight)" />
                <line x1="160" y1="134" x2="138" y2="120" stroke="#5A9A3A" strokeWidth="0.5" opacity="0.7" />
              </g>
              <g style={{ transformOrigin: '160px 118px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '1.7s' }}>
                <path d="M160,118 Q180,112 186,100 Q174,108 160,116 Z" fill="#7CCB52" />
                <line x1="160" y1="118" x2="184" y2="104" stroke="#5A9A3A" strokeWidth="0.5" opacity="0.7" />
              </g>
              <g style={{ transformOrigin: '160px 102px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '1.9s' }}>
                <path d="M160,102 Q144,96 140,86 Q150,92 160,100 Z" fill="url(#leafGradLight)" />
                <line x1="160" y1="102" x2="142" y2="88" stroke="#5A9A3A" strokeWidth="0.5" opacity="0.7" />
              </g>
              <g style={{ transformOrigin: '160px 92px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.0s' }}>
                <path d="M160,92 Q174,86 178,76 Q168,82 160,90 Z" fill="#7CCB52" />
                <line x1="160" y1="92" x2="176" y2="78" stroke="#5A9A3A" strokeWidth="0.4" opacity="0.7" />
              </g>
              {/* Small forming bud at top */}
              <g style={{ transformOrigin: '160px 86px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.2s' }}>
                <ellipse cx="160" cy="80" rx="4" ry="6" fill="url(#leafGrad)" />
                <circle cx="160" cy="78" r="1.5" fill="#F5C547" opacity="0.6" />
              </g>
            </g>

            {/* PLANT 4 — tall with prominent bud forming a flower */}
            <g style={{ transformOrigin: '230px 158px', animation: 'sway 6.5s ease-in-out infinite', animationDelay: '0.8s' }}>
              <ellipse cx="230" cy="160" rx="24" ry="3.5" fill="#5A4A3A" opacity="0.20" />
              <path d="M230,158 Q227,118 230,68" stroke="#6BB048" strokeWidth="2.9" strokeLinecap="round" fill="none" strokeDasharray="100" style={{ animation: 'seedlingDraw 6s ease-out infinite', animationDelay: '1.5s' }} />
              <g style={{ transformOrigin: '230px 134px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.0s' }}>
                <path d="M230,134 Q208,126 200,112 Q216,122 230,132 Z" fill="url(#leafGradLight)" />
                <line x1="230" y1="134" x2="206" y2="116" stroke="#5A9A3A" strokeWidth="0.6" opacity="0.7" />
              </g>
              <g style={{ transformOrigin: '230px 114px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.2s' }}>
                <path d="M230,114 Q252,106 260,94 Q244,104 230,112 Z" fill="#7CCB52" />
                <line x1="230" y1="114" x2="256" y2="98" stroke="#5A9A3A" strokeWidth="0.6" opacity="0.7" />
              </g>
              <g style={{ transformOrigin: '230px 92px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.4s' }}>
                <path d="M230,92 Q212,84 208,72 Q220,80 230,90 Z" fill="url(#leafGradLight)" />
                <line x1="230" y1="92" x2="212" y2="76" stroke="#5A9A3A" strokeWidth="0.5" opacity="0.7" />
              </g>
              {/* Half-open bud — petals evenly around the bud */}
              <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.7s' }}>
                <ellipse cx="230" cy="60" rx="8" ry="12" fill="url(#leafGrad)" />
                {/* Emerging petals — full ring of 8 */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a, k) => (
                  <ellipse key={k} cx="230" cy="54" rx="2.5" ry="6" fill="#F5C547" opacity="0.75" transform={`rotate(${a} 230 60)`} />
                ))}
                <circle cx="230" cy="60" r="3" fill="#A66A2A" opacity="0.55" />
              </g>
            </g>

            {/* PLANT 5 — full blooming sunflower with seed pattern */}
            <g style={{ transformOrigin: '310px 158px', animation: 'sway 7s ease-in-out infinite', animationDelay: '1s' }}>
              <ellipse cx="310" cy="160" rx="26" ry="3.5" fill="#5A4A3A" opacity="0.20" />
              <path d="M310,158 Q307,116 310,80" stroke="#6BB048" strokeWidth="3.2" strokeLinecap="round" fill="none" strokeDasharray="100" style={{ animation: 'seedlingDraw 6s ease-out infinite', animationDelay: '2s' }} />
              <g style={{ transformOrigin: '310px 134px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.5s' }}>
                <path d="M310,134 Q286,126 278,110 Q294,122 310,132 Z" fill="url(#leafGradLight)" />
                <line x1="310" y1="134" x2="284" y2="114" stroke="#5A9A3A" strokeWidth="0.7" opacity="0.7" />
              </g>
              <g style={{ transformOrigin: '310px 110px', animation: 'leafBloom 6s ease-out infinite', animationDelay: '2.8s' }}>
                <path d="M310,110 Q334,102 342,90 Q326,100 310,108 Z" fill="#7CCB52" />
                <line x1="310" y1="110" x2="338" y2="94" stroke="#5A9A3A" strokeWidth="0.7" opacity="0.7" />
              </g>
              {/* Sunflower head — three petal layers + spiraled seed center + soft glow */}
              <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'leafBloom 6s ease-out infinite', animationDelay: '3.0s' }}>
                {/* Soft glow ring around the flower */}
                <circle cx="310" cy="80" r="24" fill="#F5D547" opacity="0.18" />

                {/* Outer petals — 16, longest, golden-amber with subtle stroke */}
                {Array.from({ length: 16 }).map((_, i) => (
                  <ellipse
                    key={`outer-${i}`}
                    cx="310"
                    cy="62"
                    rx="3.6"
                    ry="13"
                    fill="#F5B447"
                    transform={`rotate(${i * (360/16)} 310 80)`}
                    stroke="#D99A22"
                    strokeWidth="0.4"
                  />
                ))}

                {/* Middle petals — 12, shorter, warmer yellow, offset to fill gaps */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <ellipse
                    key={`mid-${i}`}
                    cx="310"
                    cy="68"
                    rx="3"
                    ry="9"
                    fill="#F5C547"
                    transform={`rotate(${i * (360/12) + 11} 310 80)`}
                    opacity="0.95"
                  />
                ))}

                {/* Inner petals — 8, cream-yellow highlights near the center */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <ellipse
                    key={`inner-${i}`}
                    cx="310"
                    cy="72"
                    rx="2.2"
                    ry="6"
                    fill="#F8DD66"
                    transform={`rotate(${i * (360/8) + 22} 310 80)`}
                    opacity="0.85"
                  />
                ))}

                {/* Seed center base — brown radial */}
                <circle cx="310" cy="80" r="9" fill="url(#flowerCenter)" />
                {/* Seeds in fibonacci-style spiral (approximated) */}
                {Array.from({ length: 21 }).map((_, i) => {
                  const golden = 137.508 * Math.PI / 180
                  const r = 1.3 * Math.sqrt(i + 0.5)
                  const a = i * golden
                  const x = 310 + Math.cos(a) * r
                  const y = 80 + Math.sin(a) * r
                  return <circle key={`seed-${i}`} cx={x} cy={y} r={i < 6 ? 0.55 : 0.7} fill="#3A2A0A" opacity={0.7 + (i % 3) * 0.1} />
                })}
                {/* Top-left highlight on the head */}
                <ellipse cx="305" cy="73" rx="2.5" ry="1.5" fill="#FFFFFF" opacity="0.18" />
              </g>
            </g>
          </svg>

          {/* BUTTERFLY 1 — yellow, slow drift right + gentle bob (decoupled = organic) */}
          <div style={{ position: 'absolute', top: '40px', left: '14px', width: '22px', height: '16px', animation: 'driftRight 26s ease-in-out infinite', pointerEvents: 'none' }}>
            <div style={{ animation: 'bobAndTilt 3.2s ease-in-out infinite' }}>
              <svg viewBox="0 0 22 16" style={{ width: '22px', height: '16px', display: 'block' }}>
                <ellipse cx="11" cy="8" rx="0.9" ry="4.5" fill="#3D2A1A" />
                <g style={{ transformBox: 'fill-box', transformOrigin: 'right center', animation: 'wingFlap 0.34s ease-in-out infinite' }}>
                  <ellipse cx="5" cy="5.5" rx="5" ry="3.3" fill="#F5C547" opacity="0.92" />
                  <ellipse cx="6" cy="10" rx="4" ry="2.6" fill="#F5B447" opacity="0.85" />
                  <circle cx="4" cy="5" r="0.7" fill="#3D2A1A" opacity="0.7" />
                  <circle cx="6" cy="10" r="0.5" fill="#3D2A1A" opacity="0.5" />
                </g>
                <g style={{ transformBox: 'fill-box', transformOrigin: 'left center', animation: 'wingFlap 0.34s ease-in-out infinite' }}>
                  <ellipse cx="17" cy="5.5" rx="5" ry="3.3" fill="#F5C547" opacity="0.92" />
                  <ellipse cx="16" cy="10" rx="4" ry="2.6" fill="#F5B447" opacity="0.85" />
                  <circle cx="18" cy="5" r="0.7" fill="#3D2A1A" opacity="0.7" />
                  <circle cx="16" cy="10" r="0.5" fill="#3D2A1A" opacity="0.5" />
                </g>
                <path d="M11,3.5 L9,1" stroke="#3D2A1A" strokeWidth="0.4" strokeLinecap="round" />
                <path d="M11,3.5 L13,1" stroke="#3D2A1A" strokeWidth="0.4" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* BUTTERFLY 2 — soft pink, drifts left + faster bob, opposite cycle */}
          <div style={{ position: 'absolute', top: '82px', right: '14px', width: '18px', height: '13px', animation: 'driftLeft 24s ease-in-out infinite', animationDelay: '4s', pointerEvents: 'none' }}>
            <div style={{ animation: 'bobAndTilt 2.6s ease-in-out infinite', animationDelay: '0.8s' }}>
              <svg viewBox="0 0 18 13" style={{ width: '18px', height: '13px', display: 'block' }}>
                <ellipse cx="9" cy="6.5" rx="0.7" ry="3.6" fill="#3D2A1A" />
                <g style={{ transformBox: 'fill-box', transformOrigin: 'right center', animation: 'wingFlap 0.30s ease-in-out infinite' }}>
                  <ellipse cx="4" cy="4.5" rx="4" ry="2.6" fill="#F5A8B8" opacity="0.92" />
                  <ellipse cx="5" cy="8.5" rx="3.2" ry="2.1" fill="#E18FA0" opacity="0.85" />
                  <circle cx="3" cy="4" r="0.5" fill="#3D2A1A" opacity="0.6" />
                </g>
                <g style={{ transformBox: 'fill-box', transformOrigin: 'left center', animation: 'wingFlap 0.30s ease-in-out infinite' }}>
                  <ellipse cx="14" cy="4.5" rx="4" ry="2.6" fill="#F5A8B8" opacity="0.92" />
                  <ellipse cx="13" cy="8.5" rx="3.2" ry="2.1" fill="#E18FA0" opacity="0.85" />
                  <circle cx="15" cy="4" r="0.5" fill="#3D2A1A" opacity="0.6" />
                </g>
                <path d="M9,3 L7.5,1" stroke="#3D2A1A" strokeWidth="0.35" strokeLinecap="round" />
                <path d="M9,3 L10.5,1" stroke="#3D2A1A" strokeWidth="0.35" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Floating particles drifting up */}
          {[
            { left: '8%', size: 4, color: '#76C548', delay: '0s', duration: '6s' },
            { left: '22%', size: 3, color: '#7AB5A0', delay: '1.4s', duration: '7s' },
            { left: '38%', size: 4, color: '#F5C547', delay: '2.2s', duration: '5.5s' },
            { left: '52%', size: 3, color: '#76C548', delay: '3s', duration: '6.5s' },
            { left: '68%', size: 4, color: '#F5C547', delay: '4.2s', duration: '6s' },
            { left: '84%', size: 3, color: '#76C548', delay: '5s', duration: '5.8s' },
            { left: '94%', size: 4, color: '#F5C547', delay: '2.8s', duration: '6.2s' },
          ].map((p, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '14px',
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

          {/* Journey labels */}
          <span style={{ position: 'absolute', bottom: '4px', left: '14px', fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#9BBFB2', textTransform: 'uppercase' }}>Day 1</span>
          <span style={{ position: 'absolute', bottom: '4px', right: '14px', fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#5A9A3A', textTransform: 'uppercase', fontWeight: 600 }}>Day 30 · Bloom</span>
        </div>

        {/* Primary CTA — at the edge of the first fold */}
        <div style={{ padding: '20px 24px 0', position: 'relative', zIndex: 2 }}>
          <button onClick={() => { track(Events.WelcomeCtaClicked, { location: 'hero' }); navigate('/onboarding') }} style={{ width: '100%', height: '54px', background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 8px 24px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)', letterSpacing: '0.015em' }}>
            Begin your journey today →
          </button>
          <p style={{ textAlign: 'center', margin: '10px 0 0', fontFamily: 'var(--font-body)', fontSize: '12px', color: '#6B9E8A' }}>
            Already have an account?{' '}
            <button onClick={() => navigate('/auth')} style={{ background: 'none', border: 'none', color: '#3D7A5F', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              Sign in
            </button>
          </p>
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

        {/* HOW IT WORKS — now sits right after What you earn */}
        <div style={{ marginTop: '48px', padding: '0 20px' }}>
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

        {/* LIVE SPRINTERS — now below How it works */}
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
            <button onClick={() => { track(Events.WelcomeCtaClicked, { location: 'closing' }); navigate('/onboarding') }} style={{ backgroundColor: '#FFFFFF', color: '#3D7A5F', fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 600, borderRadius: '9999px', border: 'none', height: '50px', width: '100%', maxWidth: '300px', margin: '0 auto', display: 'block', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
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
              <ExampleRecordContent onCTA={() => { setPreviewOpen(false); navigate('/onboarding') }} ctaLabel="Start your sprint to earn this →" />
            </div>
          </>
        )}
        </div>
      </div>
    </PageWrapper>
  )
}
