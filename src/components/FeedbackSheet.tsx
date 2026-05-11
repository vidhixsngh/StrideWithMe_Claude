import { useState, useEffect, useRef } from 'react'
import { X, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { submitFeedback } from '../lib/db'
import { track, Events } from '../lib/analytics'

interface Props {
  open: boolean
  onClose: () => void
  onWantsToShare?: () => void
}

export default function FeedbackSheet({ open, onClose, onWantsToShare }: Props) {
  const { user } = useAuth()
  const [step, setStep] = useState<'rate' | 'detail' | 'thanks'>('rate')
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [message, setMessage] = useState('')
  const [allowContact, setAllowContact] = useState(false)
  const [wantsShare, setWantsShare] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [dragY, setDragY] = useState(0)
  const dragStartRef = useRef<number | null>(null)

  // Reset state every time the sheet re-opens
  useEffect(() => {
    if (open) {
      setStep('rate')
      setRating(0)
      setHover(0)
      setMessage('')
      setAllowContact(false)
      setWantsShare(false)
      setError('')
    }
  }, [open])

  if (!open) return null

  const isPromoter = rating >= 4

  const handleRate = (n: number) => {
    setRating(n)
    track(Events.FeedbackSheetOpened, { rating: n })
    // Move to detail step after a brief beat so user sees their selection
    setTimeout(() => setStep('detail'), 250)
  }

  const handleSubmit = async () => {
    if (!user || rating < 1) return
    setSubmitting(true)
    setError('')
    const result = await submitFeedback(user.id, {
      rating,
      message: message.trim() || undefined,
      context: 'profile',
      would_share: wantsShare,
      allow_contact: allowContact,
    })
    setSubmitting(false)
    if (!result.ok) { setError(result.error ?? 'Could not submit. Try again.'); return }
    track(Events.FeedbackSubmitted, { rating, has_message: !!message.trim(), wants_share: wantsShare, allow_contact: allowContact })
    setStep('thanks')
    // If they were a happy user and opted in to share — open the share sheet after a short delay
    if (isPromoter && wantsShare && onWantsToShare) {
      setTimeout(() => { onClose(); onWantsToShare() }, 1000)
    } else {
      setTimeout(() => onClose(), 1400)
    }
  }

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
        {/* Drag handle */}
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
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 600, color: '#1A3028', margin: 0 }}>
              {step === 'rate' && 'Help us improve'}
              {step === 'detail' && (isPromoter ? 'Glad to hear it 🌱' : "We're listening")}
              {step === 'thanks' && 'Thank you 🌻'}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: '2px 0 0', letterSpacing: '0.01em' }}>
              {step === 'rate' && 'How is StrideWithMe treating you?'}
              {step === 'detail' && (isPromoter ? 'Anything you want to add?' : "What's not working? Be honest — it helps.")}
              {step === 'thanks' && 'Your feedback shapes what we build next.'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} color="#9BBFB2" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '0 20px' }}>
          {step === 'rate' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px 0 28px' }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = n <= (hover || rating)
                return (
                  <button
                    key={n}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => handleRate(n)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', transition: 'transform 0.12s ease' }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
                    onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <Star
                      size={42}
                      fill={active ? '#F5C547' : 'transparent'}
                      strokeWidth={1.5}
                      color={active ? '#E0A82A' : '#D4DEDA'}
                      style={{ transition: 'fill 0.15s ease, color 0.15s ease' }}
                    />
                  </button>
                )
              })}
            </div>
          )}

          {step === 'detail' && (
            <div>
              {/* Show the rating they gave at the top */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '14px' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={18} fill={n <= rating ? '#F5C547' : 'transparent'} strokeWidth={1.5} color={n <= rating ? '#E0A82A' : '#D4DEDA'} />
                ))}
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isPromoter ? "What's working well? Any small thing we should know?" : "Tell us what's frustrating, missing, or broken. The more specific, the better."}
                style={{
                  width: '100%',
                  minHeight: '110px',
                  backgroundColor: '#F5FAF7',
                  borderRadius: '12px',
                  border: '1.5px solid #D4EDE3',
                  padding: '12px 14px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  lineHeight: 1.55,
                  color: '#1A3028',
                  fontStyle: message ? 'normal' : 'italic',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#7AB5A0')}
                onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
              />

              {/* Conditional follow-up: promoter → ask to share; detractor → ask to be contacted */}
              {isPromoter && onWantsToShare && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '14px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={wantsShare}
                    onChange={(e) => setWantsShare(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: '#6BB048' }}
                  />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#3D5949', lineHeight: 1.5 }}>
                    🌱 <strong>Help us grow</strong> — open the share screen after I send this, so I can invite a friend.
                  </span>
                </label>
              )}
              {!isPromoter && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '14px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={allowContact}
                    onChange={(e) => setAllowContact(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: '#6BB048' }}
                  />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#3D5949', lineHeight: 1.5 }}>
                    Mind if we reach out to learn more? (We'd love to fix this for you.)
                  </span>
                </label>
              )}

              {error && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#D97706', margin: '10px 0 0' }}>{error}</p>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                <button
                  onClick={onClose}
                  disabled={submitting}
                  style={{ flex: 1, height: '44px', background: 'transparent', border: '1px solid #D4EDE3', color: '#6B9E8A', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || rating < 1 || (!isPromoter && message.trim().length < 5)}
                  style={{
                    flex: 2,
                    height: '44px',
                    background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '9999px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: (submitting || rating < 1 || (!isPromoter && message.trim().length < 5)) ? 'not-allowed' : 'pointer',
                    opacity: (submitting || rating < 1 || (!isPromoter && message.trim().length < 5)) ? 0.55 : 1,
                    boxShadow: '0 4px 12px rgba(107,176,72,0.25)',
                  }}
                >
                  {submitting ? 'Sending…' : 'Send feedback →'}
                </button>
              </div>
              {!isPromoter && message.trim().length < 5 && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'right', margin: '6px 0 0' }}>
                  Write a few words so we can act on it.
                </p>
              )}
            </div>
          )}

          {step === 'thanks' && (
            <div style={{ textAlign: 'center', padding: '20px 0 28px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🌻</div>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontStyle: 'italic', color: '#3D5949', margin: 0, lineHeight: 1.55 }}>
                {isPromoter && wantsShare ? "Opening the share screen…" : "We read every message. Thanks for showing up."}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
