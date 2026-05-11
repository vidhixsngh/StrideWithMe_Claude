import { useState, useEffect, useRef } from 'react'
import { X, Link2, Camera, Share2 } from 'lucide-react'
import { track, Events } from '../lib/analytics'

interface Props {
  open: boolean
  onClose: () => void
  message: string
  url: string
}

export default function ShareSheet({ open, onClose, message, url }: Props) {
  const [toast, setToast] = useState('')
  const [dragY, setDragY] = useState(0)
  const dragStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2000)
    return () => clearTimeout(t)
  }, [toast])

  if (!open) return null

  const fullText = `${message} ${url}`

  const handleWhatsApp = () => {
    track(Events.ShareToChannel, { channel: 'whatsapp' })
    window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank')
  }

  const handleLinkedIn = () => {
    track(Events.ShareToChannel, { channel: 'linkedin' })
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
  }

  const handleInstagram = async () => {
    track(Events.ShareToChannel, { channel: 'instagram' })
    try { await navigator.clipboard.writeText(fullText) } catch {}
    setToast('Link copied — paste in Instagram')
  }

  const handleNative = async () => {
    track(Events.ShareToChannel, { channel: 'native' })
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
    if (nav.share) {
      try { await nav.share({ title: 'StrideWithMe', text: message, url }); return }
      catch { /* user cancelled */ }
    }
    try { await navigator.clipboard.writeText(fullText) } catch {}
    setToast('Share not supported here — link copied instead')
  }

  const handleCopy = async () => {
    track(Events.ShareToChannel, { channel: 'copy' })
    try { await navigator.clipboard.writeText(fullText); setToast('Link copied!') }
    catch { setToast('Could not copy — try again.') }
  }

  const channels: Array<{ label: string; node: React.ReactNode; bg: string; onClick: () => void; sub: string }> = [
    {
      label: 'WhatsApp',
      node: <span style={{ fontSize: '22px', lineHeight: 1 }}>💬</span>,
      bg: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
      onClick: handleWhatsApp,
      sub: 'Send to friends & family',
    },
    {
      label: 'Instagram',
      node: <Camera size={20} color="#FFFFFF" />,
      bg: 'linear-gradient(45deg, #f09433, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      onClick: handleInstagram,
      sub: 'Copy link — paste in story or bio',
    },
    {
      label: 'LinkedIn',
      node: <span style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>in</span>,
      bg: '#0A66C2',
      onClick: handleLinkedIn,
      sub: 'Share to your network',
    },
    {
      label: 'More apps',
      node: <Share2 size={20} color="#FFFFFF" />,
      bg: 'linear-gradient(135deg, #2D5A47 0%, #1C3D30 100%)',
      onClick: handleNative,
      sub: 'iMessage, Telegram, email…',
    },
    {
      label: 'Copy link',
      node: <Link2 size={20} color="#FFFFFF" />,
      bg: '#7B6FA0',
      onClick: handleCopy,
      sub: 'Paste anywhere',
    },
  ]

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998 }} />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: `translateX(-50%) translateY(${dragY}px)`,
          width: '100%',
          maxWidth: '430px',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px 24px 0 0',
          zIndex: 9999,
          paddingBottom: 'calc(28px + env(safe-area-inset-bottom))',
          transition: dragY === 0 ? 'transform 0.3s ease' : 'none',
          boxShadow: '0 -8px 32px rgba(28,61,48,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle area */}
        <div
          style={{ padding: '12px 20px 0', touchAction: 'none' }}
          onTouchStart={(e) => { dragStartRef.current = e.touches[0].clientY }}
          onTouchMove={(e) => {
            if (dragStartRef.current === null) return
            const d = e.touches[0].clientY - dragStartRef.current
            if (d > 0) setDragY(d)
          }}
          onTouchEnd={() => {
            if (dragY > 90) { onClose(); setDragY(0); dragStartRef.current = null; return }
            setDragY(0); dragStartRef.current = null
          }}
        >
          <div style={{ width: '44px', height: '5px', backgroundColor: '#D0D0D0', borderRadius: '3px', margin: '0 auto 16px' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 20px 14px' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Share StrideWithMe</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: '2px 0 0', letterSpacing: '0.01em' }}>
              Bring a friend along for the sprint.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} color="#9BBFB2" />
          </button>
        </div>

        {/* Preview message */}
        <div style={{ margin: '0 20px 16px', padding: '12px 14px', background: '#F5FAF7', border: '1px solid #D4EDE3', borderRadius: '12px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#3D5949', margin: 0, lineHeight: 1.6 }}>
            "{message}"
          </p>
        </div>

        {/* Channels */}
        <div style={{ padding: '0 20px' }}>
          {channels.map((c) => (
            <button
              key={c.label}
              onClick={c.onClick}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: '1px solid #F5F5F5', cursor: 'pointer', background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {c.node}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: 0 }}>{c.label}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: '2px 0 0' }}>{c.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 'calc(120px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1C3D30', color: '#FFFFFF', fontFamily: 'var(--font-body)', fontSize: '12px', borderRadius: '9999px', padding: '10px 18px', zIndex: 10000, boxShadow: '0 8px 24px rgba(28,61,48,0.30)' }}>
          {toast}
        </div>
      )}
    </>
  )
}
