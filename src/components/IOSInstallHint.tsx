import { useState, useEffect } from 'react'

export default function IOSInstallHint() {
  const [show, setShow] = useState(false)

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

    const t = setTimeout(() => setShow(true), 3000)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  return (
    <div style={{ position: 'fixed', bottom: 'calc(16px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '398px', zIndex: 9000, background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', borderRadius: '20px', padding: '14px 16px', boxShadow: '0 12px 32px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)', border: '1px solid rgba(255,255,255,0.18)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/icon-192.png" alt="StrideWithMe" style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} />
          <p style={{ fontFamily: 'Lora, serif', fontSize: '14px', color: 'white', fontWeight: 600, margin: 0 }}>Add to your home screen</p>
        </div>
        <button onClick={() => { setShow(false); localStorage.setItem('ios_hint_dismissed_at', String(Date.now())) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '18px', cursor: 'pointer', padding: '0', lineHeight: 1 }}>&#x2715;</button>
      </div>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', lineHeight: '1.5', margin: 0 }}>
        Tap <strong style={{ color: 'white' }}>Share &#x2191;</strong> then <strong style={{ color: 'white' }}>"Add to Home Screen"</strong> to install StrideWithMe.
      </p>
    </div>
  )
}
