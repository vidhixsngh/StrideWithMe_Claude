import { useState, useEffect } from 'react'

export default function IOSInstallHint() {
  const [show, setShow] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (!isIOS || isStandalone) return
    // Show immediately so iOS users without the app on home screen always see it
    setShow(true)
  }, [])

  if (!show) return null

  return (
    <>
      <style>{`@keyframes ios-hint-slide-in { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(12px + env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 20px)',
          maxWidth: '410px',
          zIndex: 9000,
          background: 'linear-gradient(135deg, #FEF9C3 0%, #FEF3C7 100%)',
          borderRadius: '14px',
          padding: '10px 12px',
          border: '1px solid #FDE68A',
          boxShadow: '0 6px 18px rgba(245,158,11,0.18)',
          animation: 'ios-hint-slide-in 0.35s ease-out',
        }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '18px', flexShrink: 0 }}>📲</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: '#78350F', margin: 0, lineHeight: 1.35 }}>
              Add to Home Screen to get reminders
            </p>
            {!expanded && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#92400E', margin: '1px 0 0', lineHeight: 1.35, opacity: 0.85 }}>
                Tap for the 3 steps
              </p>
            )}
          </div>
          <span style={{ fontSize: '11px', color: '#92400E', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s ease', fontWeight: 700 }}>▾</span>
        </button>

        {expanded && (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(245,158,11,0.30)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { n: '1', t: 'Tap the Share icon at the bottom of Safari' },
              { n: '2', t: 'Tap "Add to Home Screen"' },
              { n: '3', t: 'Open StrideWithMe from your Home Screen' },
            ].map((s) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ width: '16px', height: '16px', flexShrink: 0, borderRadius: '50%', background: '#F59E0B', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800, marginTop: '1px' }}>{s.n}</span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#78350F', margin: 0, lineHeight: 1.4 }}>{s.t}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
