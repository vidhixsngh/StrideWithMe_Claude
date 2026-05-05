import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'
import BloomOverlay from '../components/BloomOverlay'

const mockLog = {
  day: 14,
  totalDays: 30,
  verifiedCount: 11,
  todayTask: "Outline your go-to-market strategy for first 100 users",
  verificationAttempts: 0,
}

export default function LogPage() {
  const navigate = useNavigate()
  const [logText, setLogText] = useState('')
  const [activeTab, setActiveTab] = useState('text')
  const [phase, setPhase] = useState<'input' | 'verifying' | 'verified' | 'honest'>('input')
  const [showBloom, setShowBloom] = useState(false)

  const handleVerify = () => {
    setShowBloom(true)
  }

  return (
    <PageWrapper>
      <div style={{ padding: '20px 16px' }}>
        {phase === 'input' && (
          <InputPhase
            logText={logText}
            setLogText={setLogText}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onVerify={handleVerify}
            onHonest={() => setPhase('honest')}
          />
        )}
        {phase === 'verifying' && <VerifyingPhase />}
        {phase === 'verified' && <VerifiedPhase logText={logText} onBack={() => navigate('/dashboard')} />}
        {phase === 'honest' && <HonestPhase onSubmit={() => navigate('/dashboard')} />}
      </div>
      {showBloom && (
        <BloomOverlay
          onComplete={() => {
            setShowBloom(false)
            setPhase('verified')
          }}
        />
      )}
    </PageWrapper>
  )
}

function LogHeader() {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#7AB5A0' }}>
          DAILY LOG
        </span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', backgroundColor: '#D4EDE3', color: '#3D7A5F', borderRadius: '9999px', padding: '4px 10px' }}>
          {mockLog.verifiedCount} verified ✓
        </span>
      </div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', color: '#1A3028', margin: '8px 0 16px' }}>
        Day {mockLog.day}
      </h1>
    </>
  )
}

function TodayTaskCard() {
  return (
    <div style={{ backgroundColor: '#EAF5F0', borderRadius: '0 16px 16px 0', padding: '16px', borderLeft: '4px solid #3D7A5F', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.12em', color: '#3D7A5F' }}>TODAY'S TASK</span>
      </div>
      <p style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 600, color: '#1A3028', margin: '4px 0 0' }}>{mockLog.todayTask}</p>
    </div>
  )
}

function VerifyingPhase() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid #D4EDE3', borderTopColor: '#3D7A5F' }} />
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontStyle: 'italic', color: '#6B9E8A', marginTop: '16px' }}>
        Verifying your progress...
      </p>
    </div>
  )
}

function InputPhase({ logText, setLogText, activeTab, setActiveTab, onVerify, onHonest }: {
  logText: string; setLogText: (v: string) => void; activeTab: string; setActiveTab: (v: string) => void; onVerify: () => void; onHonest: () => void
}) {
  return (
    <>
      <LogHeader />
      <TodayTaskCard />

      {/* Encouragement */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
        <span>🌱</span>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: 0 }}>
          You've shown up 14 days. Today is Day 14. Write what happened — honestly.
        </p>
      </div>

      {/* Tab row */}
      <div style={{ display: 'flex', backgroundColor: '#EAF5F0', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
        {['Text', 'Image', 'Link'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              backgroundColor: activeTab === tab.toLowerCase() ? '#FFFFFF' : 'transparent',
              boxShadow: activeTab === tab.toLowerCase() ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              color: '#1A3028',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Text area */}
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#1A3028', margin: '0 0 4px' }}>Today's progress log</p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 8px' }}>What happened? What was hard? What moved?</p>

      <textarea
        value={logText}
        onChange={(e) => setLogText(e.target.value)}
        placeholder="I worked on… The hardest was… I learned that…"
        style={{
          width: '100%',
          minHeight: '180px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1.5px solid #D4EDE3',
          padding: '14px',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          lineHeight: 1.6,
          color: '#1A3028',
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#7AB5A0')}
        onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
      />
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'right', margin: '4px 0 16px' }}>
        {logText.length} / 20 min
      </p>

      {/* AI notice */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '12px', border: '1px solid #EDF2EF', marginBottom: '16px' }}>
        <span>🤖</span>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#6B9E8A', margin: 0 }}>
          AI will read your entry, verify your progress, and share an insight. Takes ~3 seconds.
        </p>
      </div>

      {/* Primary CTA */}
      <button
        onClick={onVerify}
        disabled={logText.length < 20}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: '#3D7A5F',
          color: '#FFFFFF',
          borderRadius: '9999px',
          border: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          fontWeight: 500,
          cursor: logText.length < 20 ? 'not-allowed' : 'pointer',
          opacity: logText.length < 20 ? 0.4 : 1,
          boxShadow: '0 4px 16px rgba(61, 122, 95, 0.25)',
        }}
      >
        Verify with AI →
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '12px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#D4EDE3' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#9BBFB2' }}>or</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#D4EDE3' }} />
      </div>

      {/* Honest CTA */}
      <button
        onClick={onHonest}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: '#FEF3E8',
          color: '#D97706',
          borderRadius: '9999px',
          border: '1.5px solid #F59E4A',
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        🤍 Today was hard — honest check-in
      </button>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'center', marginTop: '8px' }}>
        Honest days count. They're part of your story.
      </p>
    </>
  )
}

function VerifiedPhase({ logText, onBack }: { logText: string; onBack: () => void }) {
  return (
    <>
      <LogHeader />
      <TodayTaskCard />

      {/* Success card */}
      <div style={{ background: 'linear-gradient(135deg, #D4EDE3, #EAF5F0)', borderRadius: '24px', padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 4px 16px rgba(61, 122, 95, 0.2)' }}>
          <Check size={28} color="#3D7A5F" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#1A3028', marginTop: '16px' }}>Day 14 verified.</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontStyle: 'italic', color: '#6B9E8A', margin: '4px 0 16px' }}>You showed up. That's the whole game.</p>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { value: '12', label: 'Verified days' },
            { value: '5', emoji: '🔥', label: 'Day streak' },
            { value: '16', label: 'Days left' },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 700, color: '#1A3028' }}>
                {s.value}{s.emoji && <span style={{ marginLeft: '2px' }}>{s.emoji}</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#6B9E8A' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insight */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '16px', border: '1px solid #EDF2EF', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>🤖</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '0.1em', color: '#7AB5A0' }}>AI INSIGHT</span>
          </div>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', backgroundColor: '#D4EDE3', color: '#3D7A5F', borderRadius: '9999px', padding: '3px 8px' }}>✓ Verified</span>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: '0 0 8px' }}>Based on your Day 14 log</p>

        <div style={{ backgroundColor: '#EAF5F0', borderRadius: '12px', padding: '12px', marginBottom: '8px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.6, fontStyle: 'italic', color: '#2D4A3E', margin: 0 }}>
            Your focus today aligns perfectly with Day 14 of your plan. The specificity in your log shows real pattern recognition — you're not just describing what you did, you're understanding why it matters.
          </p>
        </div>

        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: '8px 0' }}>
          "What you described today required courage — shipping something unfinished, getting eyes on it. That tolerance for imperfection is the hardest skill to build."
        </p>

        <div style={{ backgroundColor: '#F5FAF7', borderRadius: '8px', padding: '8px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: 0 }}>
            {logText.slice(0, 60)}...
          </p>
        </div>
      </div>

      <button
        onClick={onBack}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: '#3D7A5F',
          color: '#FFFFFF',
          borderRadius: '9999px',
          border: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(61, 122, 95, 0.25)',
        }}
      >
        Back to my sprint →
      </button>
    </>
  )
}

function HonestPhase({ onSubmit }: { onSubmit: () => void }) {
  const [honestText, setHonestText] = useState('')

  return (
    <div style={{ background: 'linear-gradient(180deg, #FEF8F0 0%, #FEF3E8 40%, #F5F0E8 100%)', margin: '-20px -16px', padding: '20px 16px', minHeight: '100vh' }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.1em', color: '#D97706' }}>HONEST CHECK-IN</span>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', color: '#1A3028', margin: '8px 0 12px' }}>Today was hard.</h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 24px', lineHeight: 1.6 }}>
        That's allowed here. Logging honestly is still showing up. Tell me what got in the way.
      </p>

      <textarea
        value={honestText}
        onChange={(e) => setHonestText(e.target.value)}
        placeholder="I didn't get to today's task because… What I did instead was… Tomorrow I want to…"
        style={{
          width: '100%',
          minHeight: '180px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1.5px solid #D4EDE3',
          padding: '14px',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          lineHeight: 1.6,
          color: '#1A3028',
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#F59E4A')}
        onBlur={(e) => (e.target.style.borderColor = '#D4EDE3')}
      />

      <button
        onClick={onSubmit}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: '#F59E4A',
          color: '#FFFFFF',
          borderRadius: '9999px',
          border: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          fontWeight: 500,
          cursor: 'pointer',
          marginTop: '16px',
        }}
      >
        Log my honest day →
      </button>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#9BBFB2', textAlign: 'center', marginTop: '8px' }}>
        This won't hurt your Sprint Record. Honesty is the point.
      </p>
    </div>
  )
}
