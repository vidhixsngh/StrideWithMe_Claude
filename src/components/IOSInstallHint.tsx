import { useState, useEffect } from 'react'

export default function IOSInstallHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = localStorage.getItem('ios_hint_dismissed')
    if (isIOS && !isStandalone && !dismissed) {
      const t = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(t)
    }
  }, [])

  if (!show) return null

  return (
    <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '398px', zIndex: 9000, background: '#1C3D30', borderRadius: '20px', padding: '16px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: '14px', color: 'white', fontWeight: '600', margin: 0 }}>Add to your home screen</p>
        <button onClick={() => { setShow(false); localStorage.setItem('ios_hint_dismissed', 'true') }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '18px', cursor: 'pointer', padding: '0', lineHeight: 1 }}>&#x2715;</button>
      </div>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', lineHeight: '1.6', margin: 0 }}>
        Tap <strong style={{ color: 'white' }}>Share &#x2191;</strong> then <strong style={{ color: 'white' }}>"Add to Home Screen"</strong> to install StrideWithMe and log daily in one tap.
      </p>
      <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid #1C3D30' }} />
    </div>
  )
}
