import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Slide {
  image: string
  bg: string
  accent: string
  title: string
  subtitle: string
  extraLine?: string
}

const SLIDES: Slide[] = [
  {
    image: '/intro/intro-1.png',
    bg: '#F0FAEC',
    accent: '#3D7A5F',
    title: 'Your goal. Our plan.',
    subtitle: 'We build the daily steps with you.',
  },
  {
    image: '/intro/intro-2.png',
    bg: '#FEF9C3',
    accent: '#A16207',
    title: 'Our AI verifies your progress everyday.',
    subtitle: 'No fooling around. Honest days count too.',
    extraLine: 'Bloom with us.',
  },
  {
    image: '/intro/intro-3.png',
    bg: '#F5F3FF',
    accent: '#6D28D9',
    title: 'Earn your Sprint Record.',
    subtitle: 'Proof of what you actually built.',
    extraLine: 'Share, where it matters the most.',
  },
]

const INTRO_SEEN_KEY = 'stride_intro_seen'

export default function IntroPage() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [enter, setEnter] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setEnter(true), 30)
    return () => clearTimeout(t)
  }, [])

  const slide = SLIDES[index]
  const isLast = index === SLIDES.length - 1

  const completeIntro = () => {
    try { localStorage.setItem(INTRO_SEEN_KEY, '1') } catch { /* ignore */ }
    navigate('/onboarding')
  }

  const advance = () => {
    if (isLast) completeIntro()
    else setIndex((i) => i + 1)
  }

  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    // Only treat as horizontal swipe if x movement dominates
    if (Math.abs(dx) > Math.abs(dy)) {
      setDragOffset(dx)
    }
  }

  const onTouchEnd = () => {
    if (touchStartX.current === null) return
    if (Math.abs(dragOffset) > 70) {
      if (dragOffset < 0) advance()
      else goPrev()
    }
    setDragOffset(0)
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        minHeight: '100vh',
        backgroundColor: slide.bg,
        display: 'flex',
        flexDirection: 'column',
        transition: 'background-color 0.5s ease',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        maxWidth: '430px',
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Skip button top-right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 20px 0' }}>
        <button
          onClick={completeIntro}
          style={{
            background: 'rgba(255,255,255,0.55)',
            border: '1px solid rgba(28,61,48,0.10)',
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: '#3D5949',
            cursor: 'pointer',
            padding: '6px 14px',
            borderRadius: '9999px',
            letterSpacing: '0.02em',
            fontWeight: 500,
          }}
        >
          Skip
        </button>
      </div>

      {/* Slide content — slides shift on swipe */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          transform: `translateX(${dragOffset * 0.4}px)`,
          opacity: enter ? 1 : 0,
          transition: dragOffset === 0 ? 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease' : 'none',
        }}
      >
        {/* Image */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 32px 12px',
            minHeight: 0,
          }}
        >
          <img
            key={`img-${index}`}
            src={slide.image}
            alt=""
            style={{
              maxWidth: '100%',
              maxHeight: '52vh',
              objectFit: 'contain',
              animation: 'intro-fade-in 0.5s ease',
            }}
          />
        </div>

        {/* Text */}
        <div style={{ padding: '0 28px', textAlign: 'center' }}>
          <h1
            key={`title-${index}`}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '28px',
              fontWeight: 700,
              color: '#1A3028',
              margin: '0 0 10px',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              animation: 'intro-slide-up 0.5s ease 0.1s both',
            }}
          >
            {slide.title}
          </h1>
          <p
            key={`sub-${index}`}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: '#3D5949',
              margin: 0,
              lineHeight: 1.55,
              maxWidth: '340px',
              marginLeft: 'auto',
              marginRight: 'auto',
              animation: 'intro-slide-up 0.5s ease 0.18s both',
            }}
          >
            {slide.subtitle}
          </p>
          {slide.extraLine && (
            <p
              key={`extra-${index}`}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                color: '#3D5949',
                margin: 0,
                lineHeight: 1.55,
                maxWidth: '340px',
                marginLeft: 'auto',
                marginRight: 'auto',
                animation: 'intro-slide-up 0.5s ease 0.26s both',
              }}
            >
              {slide.extraLine}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes intro-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes intro-slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Bottom nav — dots + CTA */}
      <div style={{ padding: '16px 24px 24px' }}>
        {/* Dot indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '18px' }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === index ? '28px' : '8px',
                height: '8px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: i === index ? slide.accent : 'rgba(28,61,48,0.18)',
                cursor: 'pointer',
                transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                padding: 0,
              }}
            />
          ))}
        </div>

        {/* CTA — small circular arrow on slides 1-2; sprout-green pill on last slide */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {isLast ? (
            <button
              onClick={advance}
              style={{
                height: '46px',
                padding: '0 26px',
                background: 'linear-gradient(180deg, #76C548 0%, #6BB048 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '9999px',
                fontFamily: 'var(--font-heading)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(107,176,72,0.32), 0 3px 8px rgba(107,176,72,0.18)',
                letterSpacing: '0.01em',
              }}
            >
              Begin your journey →
            </button>
          ) : (
            <button
              onClick={advance}
              aria-label="Next slide"
              style={{
                width: '54px',
                height: '54px',
                background: '#FFFFFF',
                color: slide.accent,
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                boxShadow: `0 6px 18px ${slide.accent}33, 0 2px 6px rgba(28,61,48,0.10)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 600,
                lineHeight: 1,
                transition: 'color 0.5s ease, box-shadow 0.5s ease',
              }}
            >
              →
            </button>
          )}
        </div>

        <p
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-body)',
            fontSize: '10px',
            fontStyle: 'italic',
            color: '#9BBFB2',
            margin: '14px 0 0',
            letterSpacing: '0.02em',
          }}
        >
          Illustrations by Storyset
        </p>
      </div>
    </div>
  )
}
