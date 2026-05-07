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
    const wasDismissed = localStorage.getItem('pwa_install_dismissed')
    if (wasDismissed) return

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
    localStorage.setItem('pwa_install_dismissed', 'true')
  }

  if (!installable || dismissed || installed) return null

  return (
    <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '398px', zIndex: 9000, background: '#1C3D30', borderRadius: '20px', padding: '16px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <img src="/icon-192.png" alt="StrideWithMe" style={{ width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: '14px', color: 'white', fontWeight: '600', margin: '0 0 2px 0' }}>Add to home screen</p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: 0 }}>Log daily in one tap. No App Store needed.</p>
      </div>
      <button onClick={handleInstall} style={{ background: '#3D7A5F', color: 'white', border: 'none', borderRadius: '9999px', padding: '8px 14px', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: '500', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>Install</button>
      <button onClick={handleDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '18px', cursor: 'pointer', padding: '0', flexShrink: 0, lineHeight: 1 }}>&#x2715;</button>
    </div>
  )
}
