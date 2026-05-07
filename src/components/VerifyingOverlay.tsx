import { useState, useEffect } from 'react'

const quotes = [
  "Real work leaves traces.",
  "Showing up is the first act of proof.",
  "The log is the work. We're reading it.",
  "Consistency is evidence.",
  "One honest entry at a time.",
]

export default function VerifyingOverlay() {
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [quoteVisible, setQuoteVisible] = useState(true)
  const [saplingScale, setSaplingScale] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false)
      setTimeout(() => {
        setQuoteIndex(i => (i + 1) % quotes.length)
        setQuoteVisible(true)
      }, 300)
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setSaplingScale(s => s === 1 ? 1.15 : 1)
    }, 800)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9990, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(234,245,240,0.75)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 9991, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', maxWidth: '430px', margin: '0 auto', left: 0, right: 0 }}>
        <div style={{ fontSize: '56px', transform: `scale(${saplingScale})`, transition: 'transform 0.8s ease-in-out', marginBottom: '24px', filter: 'drop-shadow(0 4px 12px rgba(61,122,95,0.3))' }}>🌱</div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#3D7A5F', letterSpacing: '0.08em', fontStyle: 'italic', marginBottom: '20px', textTransform: 'uppercase' }}>Verifying your work...</p>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3D7A5F', animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <div style={{ maxWidth: '280px', textAlign: 'center', minHeight: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: '15px', color: '#1A3028', fontStyle: 'italic', lineHeight: '1.6', margin: 0, opacity: quoteVisible ? 1 : 0, transform: quoteVisible ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 0.3s ease, transform 0.3s ease' }}>
            "{quotes[quoteIndex]}"
          </p>
        </div>
      </div>
    </>
  )
}
