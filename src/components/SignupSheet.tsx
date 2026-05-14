import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  open: boolean
  onClose: () => void
  onSignedIn: () => void
  /** Called right before any redirect/email-sent action so the parent can stash onboarding state. */
  onBeforeAuthAction: () => void
  goalPreview?: string
}

export default function SignupSheet({ open, onClose, onSignedIn, onBeforeAuthAction, goalPreview }: Props) {
  const [mode, setMode] = useState<'choose' | 'email'>('choose')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')
  const [enter, setEnter] = useState(false)

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setEnter(true), 20)
      return () => clearTimeout(t)
    } else {
      setEnter(false)
      setMode('choose')
      setEmailSent(false)
      setError('')
    }
  }, [open])

  const handleGoogle = async () => {
    setError('')
    onBeforeAuthAction()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/onboarding?resume=1' },
    })
  }

  const handleEmailMagicLink = async () => {
    setError('')
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email')
      return
    }
    setSubmitting(true)
    onBeforeAuthAction()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + '/onboarding?resume=1',
        data: name.trim() ? { full_name: name.trim() } : undefined,
      },
    })
    setSubmitting(false)
    if (error) {
      setError(error.message)
    } else {
      setEmailSent(true)
    }
  }

  useEffect(() => {
    if (!open) return
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) onSignedIn()
    })
    return () => sub.subscription.unsubscribe()
  }, [open, onSignedIn])

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,61,48,0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 10000,
          opacity: enter ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10001,
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFAF6 100%)',
          borderRadius: '24px 24px 0 0',
          padding: '14px 24px 32px',
          maxWidth: '430px',
          margin: '0 auto',
          boxShadow: '0 -8px 32px rgba(28,61,48,0.18)',
          transform: enter ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: '40px', height: '4px', background: '#D4EDE3', borderRadius: '9999px', margin: '0 auto 18px' }} />

        {emailSent ? (
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>📩</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 600, color: '#1A3028', margin: '0 0 8px', letterSpacing: '-0.01em' }}>Check your email</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#3D5949', margin: '0 0 16px', lineHeight: 1.55 }}>
              We sent a sign-in link to <strong style={{ color: '#1A3028' }}>{email}</strong>. Tap it and your sprint will start automatically.
            </p>
            <div style={{ padding: '10px 14px', background: 'rgba(101,212,84,0.10)', border: '1px solid rgba(101,212,84,0.30)', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#3D7A5F', margin: 0, lineHeight: 1.55 }}>
                Your plan is saved on this device — you can close this and come back.
              </p>
            </div>
            <button onClick={onClose} style={{ width: '100%', height: '46px', background: 'transparent', color: '#6B9E8A', border: '1px solid #D4EDE3', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
              Got it
            </button>
          </div>
        ) : mode === 'choose' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{ fontSize: '36px', marginBottom: '6px' }}>🌱</div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 600, color: '#1A3028', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                Save your sprint
              </h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#3D5949', margin: 0, lineHeight: 1.55, maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>
                Create an account to lock in your plan. We'll keep your progress, send reminders, and verify your daily logs.
              </p>
              {goalPreview && (
                <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(101,212,84,0.08)', border: '1px solid rgba(101,212,84,0.30)', borderRadius: '12px' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.1em', color: '#3D7A5F', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: 700 }}>Your commitment</p>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontStyle: 'italic', color: '#1A3028', margin: 0, lineHeight: 1.4 }}>
                    "{goalPreview.length > 90 ? goalPreview.slice(0, 90) + '…' : goalPreview}"
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleGoogle}
              style={{ width: '100%', height: '52px', background: '#FFFFFF', color: '#1A3028', border: '1.5px solid #E0E7E3', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(28,61,48,0.05)' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#E8F0EC' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', letterSpacing: '0.06em', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: '#E8F0EC' }} />
            </div>

            <button
              onClick={() => setMode('email')}
              style={{ width: '100%', height: '52px', background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', border: 'none', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 6px 18px rgba(107,176,72,0.30)' }}
            >
              Continue with email
            </button>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'center', margin: '14px 0 0', lineHeight: 1.5 }}>
              No spam. We use your email to send daily reminders only.
            </p>
          </>
        ) : (
          <>
            <button
              onClick={() => { setMode('choose'); setError('') }}
              style={{ background: 'none', border: 'none', color: '#6B9E8A', fontFamily: 'var(--font-body)', fontSize: '12px', cursor: 'pointer', padding: 0, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              ← Back
            </button>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 600, color: '#1A3028', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
              Sign in with email
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#3D5949', margin: '0 0 16px', lineHeight: 1.55 }}>
              We'll send you a magic link. No password to remember.
            </p>

            <label style={{ display: 'block', marginBottom: '10px' }}>
              <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '11px', color: '#6B9E8A', marginBottom: '4px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Your name (optional)</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
                style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1px solid #D4EDE3', fontFamily: 'var(--font-body)', fontSize: '14px', color: '#1A3028', outline: 'none', background: '#FFFFFF', boxSizing: 'border-box' }}
              />
            </label>
            <label style={{ display: 'block', marginBottom: '14px' }}>
              <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '11px', color: '#6B9E8A', marginBottom: '4px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Email</span>
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1px solid #D4EDE3', fontFamily: 'var(--font-body)', fontSize: '14px', color: '#1A3028', outline: 'none', background: '#FFFFFF', boxSizing: 'border-box' }}
              />
            </label>

            {error && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#D97706', margin: '0 0 12px', fontStyle: 'italic' }}>{error}</p>
            )}

            <button
              onClick={handleEmailMagicLink}
              disabled={submitting}
              style={{ width: '100%', height: '52px', background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)', color: '#FFFFFF', border: 'none', borderRadius: '9999px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.6 : 1, boxShadow: '0 6px 18px rgba(107,176,72,0.30)' }}
            >
              {submitting ? 'Sending…' : 'Send magic link →'}
            </button>
          </>
        )}
      </div>
    </>
  )
}
