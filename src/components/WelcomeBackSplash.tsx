import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface Props {
  onComplete: () => void
}

function getFirstName(metadata: Record<string, unknown> | undefined, email: string | undefined): string {
  const raw = (metadata?.full_name as string | undefined)
    ?? (metadata?.name as string | undefined)
    ?? email?.split('@')[0]
    ?? 'Strider'
  const first = raw.split(' ')[0]
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

export default function WelcomeBackSplash({ onComplete }: Props) {
  const { user } = useAuth()
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter')
  const firstName = getFirstName(user?.user_metadata as Record<string, unknown> | undefined, user?.email)

  useEffect(() => {
    // Stagger: enter (0–200ms), hold (200–1500ms), exit (1500–2000ms), complete at 2000ms
    const t1 = setTimeout(() => setPhase('hold'), 200)
    const t2 = setTimeout(() => setPhase('exit'), 1500)
    const t3 = setTimeout(onComplete, 2000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  const visible = phase !== 'enter'
  const exiting = phase === 'exit'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, #FFF7E6 0%, #FBF1D8 35%, #F5EBC8 70%, #EDE0BA 100%)',
        zIndex: 9999,
        overflow: 'hidden',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(1.04)' : 'scale(1)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* SUN — bigger, warmer, more rays */}
      <div
        style={{
          position: 'absolute',
          top: '6vh',
          right: '-30px',
          width: '200px',
          height: '200px',
          pointerEvents: 'none',
          opacity: visible ? 0.95 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.6)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
          animation: 'sunGlow 4s ease-in-out infinite',
        }}
      >
        <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 22px rgba(245,170,60,0.45))' }}>
          <g style={{ transformOrigin: '100px 100px', animation: 'spin 50s linear infinite' }}>
            {Array.from({ length: 18 }).map((_, i) => (
              <line
                key={i}
                x1="100"
                y1="14"
                x2="100"
                y2="38"
                stroke="#F5A847"
                strokeWidth="3"
                strokeLinecap="round"
                opacity={i % 3 === 0 ? 0.7 : 0.45}
                transform={`rotate(${i * 20} 100 100)`}
              />
            ))}
          </g>
          <circle cx="100" cy="100" r="42" fill="#F5C547" opacity="0.20" />
          <circle cx="100" cy="100" r="34" fill="#F5C547" opacity="0.32" />
          <circle cx="100" cy="100" r="26" fill="#F5C040" />
          <circle cx="94" cy="94" r="9" fill="#FBE388" opacity="0.85" />
        </svg>
      </div>

      {/* Soft amber radial wash from the sun */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-100px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,200,100,0.30) 0%, rgba(245,200,100,0) 60%)',
          pointerEvents: 'none',
          opacity: visible ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}
      />

      {/* Twinkling sparkles around the sun */}
      {[
        { top: '14vh', right: '180px', delay: '0.2s', size: 6 },
        { top: '22vh', right: '50px', delay: '0.6s', size: 4 },
        { top: '8vh', right: '110px', delay: '1.0s', size: 5 },
        { top: '28vh', right: '160px', delay: '1.4s', size: 3 },
      ].map((s, i) => (
        <div
          key={`sparkle-${i}`}
          style={{
            position: 'absolute',
            top: s.top,
            right: s.right,
            width: `${s.size}px`,
            height: `${s.size}px`,
            background: '#F5C547',
            borderRadius: '50%',
            boxShadow: '0 0 8px rgba(245,180,71,0.85)',
            opacity: visible ? 1 : 0,
            animation: 'sparkleTwinkle 2.4s ease-in-out infinite',
            animationDelay: s.delay,
            transition: 'opacity 0.8s ease',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* WELCOME TEXT — centered, warm */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          transform: 'translateY(-50%)',
          textAlign: 'center',
          padding: '0 32px',
          zIndex: 5,
        }}
      >
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '20px',
              fontStyle: 'italic',
              color: '#8A6332',
              margin: 0,
              letterSpacing: '0.01em',
              fontWeight: 400,
            }}
          >
            Welcome back,
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '52px',
              fontWeight: 700,
              color: '#1A3028',
              margin: '8px 0 0',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
              textShadow: '0 2px 12px rgba(245,180,71,0.20)',
              animation: 'welcomePulse 2.4s ease-in-out infinite',
            }}
          >
            {firstName}.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '14px',
              fontStyle: 'italic',
              color: '#6B9E8A',
              margin: '14px 0 0',
              letterSpacing: '0.02em',
              opacity: visible ? 0.9 : 0,
              transition: 'opacity 0.7s ease 0.5s',
            }}
          >
            🌱 Let's pick up where you left off.
          </p>
        </div>
      </div>

      {/* PLANT JOURNEY — bottom of the screen */}
      <div
        style={{
          position: 'absolute',
          bottom: 'env(safe-area-inset-bottom)',
          left: 0,
          right: 0,
          height: '180px',
          pointerEvents: 'none',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.9s ease 0.2s, transform 0.9s ease 0.2s',
        }}
      >
        <svg viewBox="0 0 360 180" preserveAspectRatio="xMidYEnd meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <defs>
            <radialGradient id="splashFlowerCenter">
              <stop offset="0%" stopColor="#A66A2A" />
              <stop offset="100%" stopColor="#5A3A1A" />
            </radialGradient>
            <linearGradient id="splashLeafGrad" x1="0" x2="1" y1="0" y2="0.5">
              <stop offset="0%" stopColor="#9BD96E" />
              <stop offset="100%" stopColor="#5A9A3A" />
            </linearGradient>
          </defs>

          {/* Distant hills */}
          <path d="M0,150 Q60,135 120,142 T240,138 T360,145 L360,180 L0,180 Z" fill="#B8D9CC" opacity="0.32" />
          <path d="M0,156 Q40,148 80,152 T160,150 T240,148 T320,152 T360,150 L360,180 L0,180 Z" fill="#76C548" opacity="0.20" />

          {/* Ground line */}
          <line x1="0" y1="158" x2="360" y2="158" stroke="#B8D9CC" strokeWidth="1" opacity="0.5" strokeDasharray="3,4" />

          {/* Grass tufts */}
          {[20, 55, 88, 130, 168, 205, 248, 288, 320, 348].map((x, i) => (
            <g key={`g-${i}`} style={{ transformOrigin: `${x}px 158px`, animation: `sway ${4 + (i % 3)}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}>
              <path d={`M${x},158 Q${x-2},${152 - (i%3)} ${x-3},${148 - (i%3)}`} stroke="#76C548" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <path d={`M${x},158 Q${x},${151 - (i%3)} ${x+1},${146 - (i%3)}`} stroke="#5A9A3A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <path d={`M${x},158 Q${x+2},${152 - (i%3)} ${x+3},${148 - (i%3)}`} stroke="#76C548" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </g>
          ))}

          {/* Daisies */}
          {[{ x: 40, color: '#FFFFFF' }, { x: 110, color: '#F5C547' }, { x: 180, color: '#FFFFFF' }, { x: 252, color: '#F5C547' }, { x: 332, color: '#FFFFFF' }].map((d, i) => (
            <g key={`d-${i}`}>
              {Array.from({ length: 5 }).map((_, p) => (
                <ellipse key={p} cx={d.x} cy="150" rx="2" ry="3.4" fill={d.color} stroke="rgba(0,0,0,0.06)" strokeWidth="0.3" transform={`rotate(${p * 72} ${d.x} 154)`} />
              ))}
              <circle cx={d.x} cy="154" r="1.5" fill="#D97706" />
            </g>
          ))}

          {/* Plant 1 — sprout */}
          <g style={{ transformOrigin: '32px 158px', animation: 'sway 5s ease-in-out infinite' }}>
            <ellipse cx="32" cy="160" rx="14" ry="2.5" fill="#5A4A3A" opacity="0.20" />
            <path d="M32,158 Q31,150 32,140" stroke="#6BB048" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M32,140 Q22,138 18,134 Q24,130 32,138 Z" fill="url(#splashLeafGrad)" />
            <path d="M32,140 Q42,138 46,134 Q40,130 32,138 Z" fill="url(#splashLeafGrad)" />
          </g>

          {/* Plant 2 — sapling */}
          <g style={{ transformOrigin: '95px 158px', animation: 'sway 5.5s ease-in-out infinite', animationDelay: '0.4s' }}>
            <ellipse cx="95" cy="160" rx="17" ry="3" fill="#5A4A3A" opacity="0.20" />
            <path d="M95,158 Q93,134 95,114" stroke="#6BB048" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M95,134 Q82,128 76,118 Q86,124 95,132 Z" fill="url(#splashLeafGrad)" />
            <path d="M95,124 Q108,118 114,108 Q104,114 95,122 Z" fill="#7CCB52" />
            <path d="M95,114 Q88,106 92,98 Q98,103 95,112 Z" fill="#7CCB52" />
            <path d="M95,114 Q102,106 98,98 Q92,103 95,112 Z" fill="#76C548" />
          </g>

          {/* Plant 3 — bushy */}
          <g style={{ transformOrigin: '160px 158px', animation: 'sway 6s ease-in-out infinite', animationDelay: '0.6s' }}>
            <ellipse cx="160" cy="160" rx="22" ry="3.5" fill="#5A4A3A" opacity="0.20" />
            <path d="M160,158 Q157,124 160,86" stroke="#6BB048" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <path d="M160,134 Q140,128 134,116 Q146,124 160,132 Z" fill="url(#splashLeafGrad)" />
            <path d="M160,118 Q180,112 186,100 Q174,108 160,116 Z" fill="#7CCB52" />
            <path d="M160,102 Q144,96 140,86 Q150,92 160,100 Z" fill="url(#splashLeafGrad)" />
            <path d="M160,92 Q174,86 178,76 Q168,82 160,90 Z" fill="#7CCB52" />
            <ellipse cx="160" cy="80" rx="4" ry="6" fill="url(#splashLeafGrad)" />
          </g>

          {/* Plant 4 — bud */}
          <g style={{ transformOrigin: '230px 158px', animation: 'sway 6.5s ease-in-out infinite', animationDelay: '0.8s' }}>
            <ellipse cx="230" cy="160" rx="24" ry="3.5" fill="#5A4A3A" opacity="0.20" />
            <path d="M230,158 Q227,118 230,68" stroke="#6BB048" strokeWidth="2.9" strokeLinecap="round" fill="none" />
            <path d="M230,134 Q208,126 200,112 Q216,122 230,132 Z" fill="url(#splashLeafGrad)" />
            <path d="M230,114 Q252,106 260,94 Q244,104 230,112 Z" fill="#7CCB52" />
            <path d="M230,92 Q212,84 208,72 Q220,80 230,90 Z" fill="url(#splashLeafGrad)" />
            <ellipse cx="230" cy="60" rx="8" ry="12" fill="url(#splashLeafGrad)" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a, k) => (
              <ellipse key={k} cx="230" cy="54" rx="2.5" ry="6" fill="#F5C547" opacity="0.75" transform={`rotate(${a} 230 60)`} />
            ))}
            <circle cx="230" cy="60" r="3" fill="#A66A2A" opacity="0.55" />
          </g>

          {/* Plant 5 — sunflower */}
          <g style={{ transformOrigin: '310px 158px', animation: 'sway 7s ease-in-out infinite', animationDelay: '1s' }}>
            <ellipse cx="310" cy="160" rx="26" ry="3.5" fill="#5A4A3A" opacity="0.20" />
            <path d="M310,158 Q307,116 310,80" stroke="#6BB048" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            <path d="M310,134 Q286,126 278,110 Q294,122 310,132 Z" fill="url(#splashLeafGrad)" />
            <path d="M310,110 Q334,102 342,90 Q326,100 310,108 Z" fill="#7CCB52" />
            {Array.from({ length: 16 }).map((_, i) => (
              <ellipse key={`o-${i}`} cx="310" cy="62" rx="3.6" ry="13" fill="#F5B447" transform={`rotate(${i * 22.5} 310 80)`} stroke="#D99A22" strokeWidth="0.4" />
            ))}
            {Array.from({ length: 12 }).map((_, i) => (
              <ellipse key={`m-${i}`} cx="310" cy="68" rx="3" ry="9" fill="#F5C547" transform={`rotate(${i * 30 + 11} 310 80)`} opacity="0.95" />
            ))}
            <circle cx="310" cy="80" r="9" fill="url(#splashFlowerCenter)" />
          </g>
        </svg>
      </div>

      {/* Floating particles drifting up across the whole screen */}
      {[
        { left: '12%', size: 4, color: '#76C548', delay: '0s', duration: '5s' },
        { left: '24%', size: 3, color: '#7AB5A0', delay: '0.7s', duration: '6s' },
        { left: '38%', size: 4, color: '#F5C547', delay: '1.2s', duration: '5.5s' },
        { left: '52%', size: 3, color: '#76C548', delay: '0.4s', duration: '4.8s' },
        { left: '68%', size: 4, color: '#F5C547', delay: '1.6s', duration: '5.5s' },
        { left: '82%', size: 3, color: '#76C548', delay: '0.9s', duration: '6.2s' },
        { left: '92%', size: 4, color: '#F5B447', delay: '1.3s', duration: '5.8s' },
      ].map((p, i) => (
        <div key={`fp-${i}`} style={{
          position: 'absolute',
          bottom: '180px',
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

      {/* Butterfly drifting */}
      <div style={{ position: 'absolute', top: '30vh', left: '20px', width: '22px', height: '16px', animation: 'driftRight 14s ease-in-out infinite', pointerEvents: 'none' }}>
        <div style={{ animation: 'bobAndTilt 2.6s ease-in-out infinite' }}>
          <svg viewBox="0 0 22 16" style={{ width: '22px', height: '16px', display: 'block' }}>
            <ellipse cx="11" cy="8" rx="0.9" ry="4.5" fill="#3D2A1A" />
            <g style={{ transformBox: 'fill-box', transformOrigin: 'right center', animation: 'wingFlap 0.32s ease-in-out infinite' }}>
              <ellipse cx="5" cy="5.5" rx="5" ry="3.3" fill="#F5C547" opacity="0.92" />
              <ellipse cx="6" cy="10" rx="4" ry="2.6" fill="#F5B447" opacity="0.85" />
            </g>
            <g style={{ transformBox: 'fill-box', transformOrigin: 'left center', animation: 'wingFlap 0.32s ease-in-out infinite' }}>
              <ellipse cx="17" cy="5.5" rx="5" ry="3.3" fill="#F5C547" opacity="0.92" />
              <ellipse cx="16" cy="10" rx="4" ry="2.6" fill="#F5B447" opacity="0.85" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  )
}
