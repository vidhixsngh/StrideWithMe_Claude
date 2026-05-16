import { useState, useEffect } from 'react'

export default function IOSInstallHint() {
  const [show, setShow] = useState(false)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (!isIOS || isStandalone) return

    // Re-show dismissed hint after 3 days
    const dismissedAt = localStorage.getItem('ios_hint_dismissed_at')
    if (dismissedAt) {
      const ageMs = Date.now() - parseInt(dismissedAt, 10)
      const threeDays = 3 * 24 * 60 * 60 * 1000
      if (ageMs < threeDays) return
      localStorage.removeItem('ios_hint_dismissed_at')
    }

    const t = setTimeout(() => setShow(true), 2500)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  return (
    <>
      <style>{`
        @keyframes ios-hint-pulse { 0%, 100% { box-shadow: 0 8px 24px rgba(245,158,11,0.32), 0 0 0 4px rgba(245,158,11,0.18); } 50% { box-shadow: 0 12px 36px rgba(245,158,11,0.42), 0 0 0 8px rgba(245,158,11,0.24); } }
        @keyframes ios-hint-slide-in { from { transform: translate(-50%, 30px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
      `}</style>
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 24px)',
          maxWidth: '406px',
          zIndex: 9000,
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
          borderRadius: '20px',
          padding: expanded ? '18px 18px 20px' : '14px 18px',
          border: '2px solid #F59E0B',
          animation: 'ios-hint-pulse 2.4s ease-in-out infinite, ios-hint-slide-in 0.4s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: expanded ? '12px' : 0 }}>
          <span style={{ fontSize: '22px', flexShrink: 0 }}>📲</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#92400E', margin: 0, fontWeight: 800 }}>Required on iPhone</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 700, color: '#78350F', margin: '2px 0 0', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
              Add StrideWithMe to your Home Screen
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            style={{ background: 'rgba(245,158,11,0.18)', border: 'none', color: '#78350F', fontSize: '13px', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s ease', fontWeight: 800 }}
          >
            ▾
          </button>
          <button
            onClick={() => { setShow(false); localStorage.setItem('ios_hint_dismissed_at', String(Date.now())) }}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', color: '#92400E', fontSize: '18px', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, opacity: 0.6 }}
          >
            ✕
          </button>
        </div>

        {expanded && (
          <>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#78350F', margin: '0 0 12px', lineHeight: 1.5 }}>
              <strong>iOS won't send reminders until you do this.</strong> Two taps, then you're done.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { n: '1', t: 'Tap the Share icon', sub: 'The square with an up-arrow at the bottom of Safari.' },
                { n: '2', t: 'Tap "Add to Home Screen"', sub: "Scroll inside the share sheet if you don't see it." },
                { n: '3', t: 'Open StrideWithMe from your Home Screen', sub: 'Reminders start arriving from there.' },
              ].map((s) => (
                <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 10px', background: 'rgba(255,255,255,0.55)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <div style={{ width: '22px', height: '22px', flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, boxShadow: '0 2px 6px rgba(245,158,11,0.30)' }}>{s.n}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: '#78350F', margin: 0, lineHeight: 1.35 }}>{s.t}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#92400E', margin: '2px 0 0', lineHeight: 1.4, opacity: 0.85 }}>{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
