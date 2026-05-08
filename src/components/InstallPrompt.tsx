import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

export default function InstallPrompt() {
  const [installable, setInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Re-show dismissed prompt after 3 days
    const dismissedAt = localStorage.getItem('pwa_install_dismissed_at')
    if (dismissedAt) {
      const ageMs = Date.now() - parseInt(dismissedAt, 10)
      const threeDays = 3 * 24 * 60 * 60 * 1000
      if (ageMs < threeDays) return
      localStorage.removeItem('pwa_install_dismissed_at')
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') { setInstalled(true); setInstallable(false) }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa_install_dismissed_at', String(Date.now()))
  }

  if (!installable || dismissed || installed) return null

  return (
    <div style={{ position: 'fixed', bottom: 'calc(16px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '398px', zIndex: 9000, background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)', borderRadius: '20px', padding: '14px 16px', boxShadow: '0 12px 32px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.18)' }}>
      <img src="/icon-192.png" alt="StrideWithMe" style={{ width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: '14px', color: 'white', fontWeight: 600, margin: '0 0 2px 0' }}>Add to home screen</p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', margin: 0 }}>Log daily in one tap. No App Store needed.</p>
      </div>
      <button onClick={handleInstall} style={{ background: '#FFFFFF', color: '#3D7A5F', border: 'none', borderRadius: '9999px', padding: '8px 14px', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>Install</button>
      <button onClick={handleDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '18px', cursor: 'pointer', padding: '0', flexShrink: 0, lineHeight: 1 }}>&#x2715;</button>
    </div>
  )
}
