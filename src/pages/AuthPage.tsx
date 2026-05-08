import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import PageWrapper from '../components/PageWrapper'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dots, setDots] = useState('.')
  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true })
  }, [session, navigate])

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '.' : d + '.'))
    }, 400)
    return () => clearInterval(interval)
  }, [loading])

  const handleSubmit = async () => {
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      })
      if (error) {
        setError(error.message)
      } else {
        // Create profile client-side after successful signup
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            display_name: name,
          })
        }
        setMessage('Check your email to confirm your account, then sign in.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) setError(error.message)
      else navigate('/dashboard', { replace: true })
    }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard',
      },
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '48px',
    borderRadius: '12px',
    border: '1.5px solid #D4EDE3',
    padding: '0 14px',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    color: '#1A3028',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <PageWrapper showNav={false}>
      <div style={{ padding: '48px 24px 32px', maxWidth: '430px', margin: '0 auto' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '40px' }}>
          <img src="/icon-192.png" alt="StrideWithMe" style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, boxShadow: '0 4px 16px rgba(107,176,72,0.20)', objectFit: 'cover' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#1A3028' }}>StrideWithMe</span>
        </div>

        {/* Heading */}
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#1A3028', margin: '0 0 4px' }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back.'}
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 28px', letterSpacing: '0.01em' }}>
          {mode === 'signup' ? 'Start your first sprint today.' : 'Your sprint is waiting.'}
        </p>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {mode === 'signup' && (
            <div>
              <label style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: '#1A3028', display: 'block', marginBottom: '4px' }}>Your name</label>
              <input
                type="text"
                placeholder="Arjun Mehta"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#3D7A5F')}
                onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
              />
            </div>
          )}

          <div>
            <label style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: '#1A3028', display: 'block', marginBottom: '4px' }}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#3D7A5F')}
              onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
            />
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500, color: '#1A3028', display: 'block', marginBottom: '4px' }}>Password</label>
            <input
              type="password"
              placeholder="8+ characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#3D7A5F')}
              onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
            />
          </div>
        </div>

        {/* Error / Message */}
        {error && (
          <div style={{ backgroundColor: '#FEF3E8', border: '1px solid #F5D5A8', borderRadius: '10px', padding: '10px 14px', marginTop: '14px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#D97706', margin: 0 }}>{error}</p>
          </div>
        )}
        {message && (
          <div style={{ backgroundColor: '#EAF5F0', border: '1px solid #B8D9CC', borderRadius: '10px', padding: '10px 14px', marginTop: '14px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#3D7A5F', margin: 0 }}>{message}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            height: '52px',
            background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)',
            color: '#FFFFFF',
            borderRadius: '9999px',
            border: 'none',
            fontFamily: 'var(--font-heading)',
            fontSize: '15px',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            boxShadow: '0 8px 24px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)',
            marginTop: '20px',
            letterSpacing: '0.02em',
          }}
        >
          {loading ? dots : mode === 'signup' ? 'Create my account →' : 'Sign in →'}
        </button>

        {/* Mode toggle */}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', textAlign: 'center', marginTop: '20px' }}>
          {mode === 'signin' ? (
            <>Don't have an account?{' '}<span onClick={() => { setMode('signup'); setError(''); setMessage('') }} style={{ color: '#3D7A5F', textDecoration: 'underline', cursor: 'pointer' }}>Start here →</span></>
          ) : (
            <>Already have an account?{' '}<span onClick={() => { setMode('signin'); setError(''); setMessage('') }} style={{ color: '#3D7A5F', textDecoration: 'underline', cursor: 'pointer' }}>Sign in →</span></>
          )}
        </p>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#D4EDE3' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#9BBFB2' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#D4EDE3' }} />
        </div>

        {/* Google sign in */}
        <button
          onClick={handleGoogleSignIn}
          style={{
            width: '100%',
            height: '48px',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #D4EDE3',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: '#1A3028' }}>Continue with Google</span>
        </button>
      </div>
    </PageWrapper>
  )
}
