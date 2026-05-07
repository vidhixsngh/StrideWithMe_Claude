import { useState, useEffect } from 'react'

const quotes = [
  "Turning your goal into daily steps.",
  "Every great thing started with Day 1.",
  "Your plan is being built around you.",
  "Small steps, compounded. Let's go.",
  "The best plans are made before you begin.",
]

interface PlanGeneratingScreenProps {
  sprintLength: number
  goalText: string
}

export default function PlanGeneratingScreen({ sprintLength, goalText }: PlanGeneratingScreenProps) {
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [quoteVisible, setQuoteVisible] = useState(true)
  const [progress, setProgress] = useState(0)
  const [visibleDays, setVisibleDays] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false)
      setTimeout(() => {
        setQuoteIndex(i => (i + 1) % quotes.length)
        setQuoteVisible(true)
      }, 350)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => p >= 92 ? p : p + Math.random() * 4)
    }, 300)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleDays(d => d >= sprintLength ? d : d + 1)
    }, 80)
    return () => clearInterval(interval)
  }, [sprintLength])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'linear-gradient(180deg, #1C3D30 0%, #2D5A47 60%, #1C3D30 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', maxWidth: '430px', margin: '0 auto', left: 0, right: 0 }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Lora, serif', color: 'white', fontSize: '22px', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.15)' }}>S</div>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#7AB5A0', letterSpacing: '0.12em', textTransform: 'uppercase', fontStyle: 'italic', marginBottom: '8px' }}>Building your {sprintLength}-day plan</p>
      <p style={{ fontFamily: 'Lora, serif', fontSize: '16px', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', textAlign: 'center', lineHeight: '1.5', marginBottom: '32px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>"{goalText}"</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(sprintLength, 10)}, 1fr)`, gap: '4px', marginBottom: '28px', width: '100%', maxWidth: '280px' }}>
        {Array.from({ length: sprintLength }, (_, i) => (
          <div key={i} style={{ height: '20px', borderRadius: '4px', backgroundColor: i < visibleDays ? (i === sprintLength - 1 ? '#F59E4A' : '#3D7A5F') : 'rgba(255,255,255,0.08)', transition: 'background-color 0.2s ease' }} />
        ))}
      </div>
      <div style={{ width: '100%', maxWidth: '280px', height: '3px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ height: '100%', width: `${progress}%`, borderRadius: '9999px', backgroundColor: '#7AB5A0', transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '260px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Lora, serif', fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: '1.6', margin: 0, opacity: quoteVisible ? 1 : 0, transform: quoteVisible ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.35s ease, transform 0.35s ease' }}>"{quotes[quoteIndex]}"</p>
      </div>
    </div>
  )
}
