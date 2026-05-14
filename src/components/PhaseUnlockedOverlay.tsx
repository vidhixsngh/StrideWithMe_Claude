import { useEffect, useState } from 'react'

interface Props {
  phase: 'build' | 'peak' | 'finish'
  theme: string
  status: 'generating' | 'done' | 'failed'
  firstTaskText?: string
  onContinue: () => void
}

const PHASE_VISUAL: Record<Props['phase'], { emoji: string; title: string; color: string; bg: string }> = {
  build: { emoji: '🌿', title: 'Build phase unlocked', color: '#10B981', bg: 'linear-gradient(180deg, #ECFDF5 0%, #D1FAE5 60%, #A7F3D0 100%)' },
  peak: { emoji: '⚡', title: 'Peak phase unlocked', color: '#F59E0B', bg: 'linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 60%, #FDE68A 100%)' },
  finish: { emoji: '🌻', title: 'Finish phase unlocked', color: '#8B5CF6', bg: 'linear-gradient(180deg, #F5F3FF 0%, #EDE9FE 60%, #DDD6FE 100%)' },
}

export default function PhaseUnlockedOverlay({ phase, theme, status, firstTaskText, onContinue }: Props) {
  const v = PHASE_VISUAL[phase]
  const [enter, setEnter] = useState(false)

  useEffect(() => { const t = setTimeout(() => setEnter(true), 30); return () => clearTimeout(t) }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: v.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        opacity: enter ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Big phase emoji with bloom-style scale-in */}
      <div
        style={{
          fontSize: '76px',
          marginBottom: '12px',
          transform: enter ? 'scale(1)' : 'scale(0.4)',
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.12))',
        }}
      >
        {v.emoji}
      </div>

      {/* Caps tag */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '11px',
          fontStyle: 'italic',
          letterSpacing: '0.16em',
          color: v.color,
          textTransform: 'uppercase',
          margin: 0,
          fontWeight: 700,
          opacity: enter ? 1 : 0,
          transform: enter ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s',
        }}
      >
        Phase unlocked
      </p>

      {/* Title */}
      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '28px',
          fontWeight: 700,
          color: '#1A3028',
          margin: '6px 0 8px',
          textAlign: 'center',
          letterSpacing: '-0.02em',
          opacity: enter ? 1 : 0,
          transform: enter ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s',
        }}
      >
        {v.title}
      </h1>

      {/* Theme — italic */}
      <p
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '14px',
          fontStyle: 'italic',
          color: v.color,
          margin: '0 0 24px',
          textAlign: 'center',
          maxWidth: '320px',
          lineHeight: 1.55,
          opacity: enter ? 0.9 : 0,
          transition: 'opacity 0.5s ease 0.4s',
        }}
      >
        "{theme}"
      </p>

      {/* Body — adapts to status */}
      <div
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: `1.5px solid ${v.color}40`,
          borderRadius: '20px',
          padding: '18px 20px',
          maxWidth: '340px',
          width: '100%',
          textAlign: 'center',
          marginBottom: '24px',
          opacity: enter ? 1 : 0,
          transform: enter ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.6s ease 0.5s, transform 0.6s ease 0.5s',
          boxShadow: '0 12px 32px rgba(28,61,48,0.10)',
        }}
      >
        {status === 'generating' && (
          <>
            <div style={{ width: '28px', height: '28px', margin: '0 auto 10px', border: `3px solid ${v.color}33`, borderTopColor: v.color, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#3D5949', margin: 0, lineHeight: 1.55 }}>
              Shaping your next phase using everything you've built so far…
            </p>
          </>
        )}
        {status === 'done' && (
          <>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.1em', color: v.color, textTransform: 'uppercase', margin: '0 0 6px', fontWeight: 700 }}>Your next day starts with</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 500, color: '#1A3028', margin: 0, lineHeight: 1.5 }}>
              {firstTaskText ?? 'A new chapter of your sprint.'}
            </p>
          </>
        )}
        {status === 'failed' && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#D97706', margin: 0, lineHeight: 1.55 }}>
            We couldn't generate the next phase right now. We'll retry when you open the dashboard.
          </p>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={onContinue}
        disabled={status === 'generating'}
        style={{
          width: '100%',
          maxWidth: '320px',
          height: '50px',
          background: status === 'generating' ? '#D4EDE3' : `linear-gradient(135deg, ${v.color} 0%, ${v.color}dd 100%)`,
          color: status === 'generating' ? '#9BBFB2' : '#FFFFFF',
          border: 'none',
          borderRadius: '9999px',
          fontFamily: 'var(--font-heading)',
          fontSize: '15px',
          fontWeight: 500,
          cursor: status === 'generating' ? 'wait' : 'pointer',
          boxShadow: status === 'generating' ? 'none' : '0 8px 24px rgba(0,0,0,0.15)',
          opacity: enter ? 1 : 0,
          transform: enter ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.6s ease 0.6s, transform 0.6s ease 0.6s',
        }}
      >
        {status === 'generating' ? 'Preparing…' : status === 'done' ? 'See my new tasks →' : 'Continue'}
      </button>
    </div>
  )
}
