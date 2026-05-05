import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Heart, Award } from 'lucide-react'
import PageWrapper from '../components/PageWrapper'

const goals = [
  "get your first client.",
  "ship your side project.",
  "land your next role.",
  "build in public.",
  "finish what you started.",
]

function getDayColor(day: number): { bg: string; border?: string } {
  if (day > 30) return { bg: 'transparent' }
  if (day === 14) return { bg: '#FFFFFF', border: '2px solid #3D7A5F' }
  if (day === 9 || day === 12) return { bg: '#F59E4A' }
  if (day >= 15) return { bg: '#D4EDE3' }
  return { bg: '#3D7A5F' }
}

export default function WelcomePage() {
  const navigate = useNavigate()
  const [goalIndex, setGoalIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setGoalIndex((i) => (i + 1) % goals.length)
        setVisible(true)
      }, 300)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <PageWrapper showNav={false}>
      {/* Section 1: Top Nav */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '36px', height: '36px', backgroundColor: '#3D7A5F', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#FFFFFF', fontWeight: 700 }}>S</div>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#1A3028' }}>StrideWithMe</span>
        </div>
      </div>

      {/* Section 2: Social Proof Pill */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(61,122,95,0.08)', border: '1px solid #B8D9CC', borderRadius: '9999px', padding: '6px 16px' }}>
          <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3D7A5F' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#3D7A5F', letterSpacing: '0.01em' }}>847 people in active sprints</span>
        </div>
      </div>

      {/* Section 3: Rotating Hero Goal */}
      <div style={{ margin: '24px 20px 0' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '38px', fontWeight: 400, color: '#1A3028', display: 'block', lineHeight: 1.15 }}>30 days to</span>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '38px',
            fontWeight: 700,
            fontStyle: 'italic',
            color: '#3D7A5F',
            display: 'block',
            lineHeight: 1.15,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}
        >
          {goals[goalIndex]}
        </span>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', lineHeight: 1.6, marginTop: '14px', letterSpacing: '0.01em' }}>
          Set a goal. Show up daily. Let AI verify your progress. Earn a Sprint Record that proves you did the work.
        </p>
      </div>

      {/* Section 4: Primary CTA */}
      <div style={{ margin: '24px 20px 0' }}>
        <button
          onClick={() => navigate('/auth')}
          style={{ width: '100%', height: '52px', backgroundColor: '#3D7A5F', color: '#FFFFFF', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 6px 24px rgba(61,122,95,0.28)', letterSpacing: '0.02em' }}
        >
          Begin your sprint →
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '10px' }}>
          {['Free to start', 'No credit card', 'Takes 2 minutes'].map((t) => (
            <span key={t} style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', letterSpacing: '0.01em' }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Section 5: How It Works */}
      <div style={{ marginTop: '36px', padding: '0 20px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: '#1A3028', margin: '0 0 16px' }}>How it works</h2>

        <div style={{ backgroundColor: '#EAF5F0', border: '1px solid #C8DDD5', borderRadius: '18px', padding: '14px 16px', marginBottom: '10px', display: 'flex', gap: '14px', alignItems: 'flex-start', boxShadow: '0 1px 8px rgba(26,46,37,0.06)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Search size={16} color="#3D7A5F" />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7AB5A0' }}>STEP 1</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: '2px 0 4px' }}>AI-Verified Progress</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', lineHeight: 1.5, margin: 0, letterSpacing: '0.01em' }}>Every daily log is read by AI. It confirms your work is real, gives you an insight, and marks the day done.</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#FEF8F0', border: '1px solid #F5D5A8', borderRadius: '18px', padding: '14px 16px', marginBottom: '10px', display: 'flex', gap: '14px', alignItems: 'flex-start', boxShadow: '0 1px 8px rgba(26,46,37,0.06)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Heart size={16} color="#D97706" />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#D97706' }}>STEP 2</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: '2px 0 4px' }}>Honest Days Celebrated</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', lineHeight: 1.5, margin: 0, letterSpacing: '0.01em' }}>Missed a day? Log why. The app wraps you in warmth and marks it as an Honest Check-in — not a failure.</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#F0EEF8', border: '1px solid #C8C0E0', borderRadius: '18px', padding: '14px 16px', marginBottom: '10px', display: 'flex', gap: '14px', alignItems: 'flex-start', boxShadow: '0 1px 8px rgba(26,46,37,0.06)' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Award size={16} color="#7B6FA0" />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7B6FA0' }}>STEP 3</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#1A3028', margin: '2px 0 4px' }}>Earn a Sprint Record</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', lineHeight: 1.5, margin: 0, letterSpacing: '0.01em' }}>At 30 days, you receive a verified digital credential with an AI-narrated story of your journey.</p>
          </div>
        </div>
      </div>

      {/* Section 6: Active Sprinters */}
      <div style={{ margin: '8px 20px 0', background: 'rgba(255,255,255,0.8)', borderRadius: '20px', border: '1px solid #EDF2EF', boxShadow: '0 1px 8px rgba(26,46,37,0.06)', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#1A3028' }}>Active sprinters right now</span>
          <div style={{ display: 'flex' }}>
            {[{ bg: '#3D7A5F', i: 'PS' }, { bg: '#F59E4A', i: 'KN' }, { bg: '#7AB5A0', i: 'RV' }, { bg: '#D97706', i: 'AM' }].map((a, idx) => (
              <div key={idx} style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '10px', color: '#FFFFFF', marginLeft: idx > 0 ? '-6px' : '0', border: '2px solid #FFFFFF', position: 'relative', zIndex: 4 - idx }}>{a.i}</div>
            ))}
          </div>
        </div>

        {[
          { bg: '#3D7A5F', initials: 'PS', name: 'Priya Sharma', preview: 'Sent 5 cold proposals today...', day: 22, status: '✅' },
          { bg: '#F59E4A', initials: 'KN', name: 'Kavya Nair', preview: 'Took an honest day — blocked on...', day: 18, status: '🤍' },
          { bg: '#7AB5A0', initials: 'RV', name: 'Rohan Verma', preview: 'Completed a full PRD for an imagin...', day: 14, status: '✅' },
        ].map((row, i) => (
          <div key={row.initials} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < 2 ? '1px solid #F5F5F5' : 'none' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: row.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '12px', color: '#FFFFFF', flexShrink: 0 }}>{row.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#1A3028', margin: 0 }}>{row.name}</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#9BBFB2', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.preview}</p>
            </div>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', backgroundColor: '#D4EDE3', color: '#3D7A5F', borderRadius: '9999px', padding: '2px 8px', flexShrink: 0 }}>Day {row.day}</span>
            <span style={{ fontSize: '14px', marginLeft: '6px' }}>{row.status}</span>
          </div>
        ))}
      </div>

      {/* Section 7: Your Journey Visualised */}
      <div style={{ margin: '24px 20px 0' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#1A3028', margin: 0 }}>Your journey, visualised</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', marginTop: '4px', letterSpacing: '0.01em' }}>Every day you show up fills this heatmap. Honest days count too.</p>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EDF2EF', padding: '14px', marginTop: '12px', boxShadow: '0 1px 8px rgba(26,46,37,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
            {Array.from({ length: 35 }, (_, i) => {
              const day = i + 1
              const { bg, border } = getDayColor(day)
              return <div key={i} style={{ width: '26px', height: '26px', borderRadius: '5px', backgroundColor: bg, border: border || 'none', boxSizing: 'border-box' }} />
            })}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
            {[{ color: '#3D7A5F', label: 'Verified' }, { color: '#F59E4A', label: 'Honest day' }, { color: '#D4EDE3', label: 'Upcoming' }].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#6B9E8A' }}>{item.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#1A3028' }}>Day 14 / 30</span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', margin: '2px 0 0' }}>Arjun's SaaS Sprint</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', backgroundColor: '#D4EDE3', color: '#3D7A5F', borderRadius: '9999px', padding: '2px 8px' }}>11 verified ✓</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', backgroundColor: '#FEF3E8', color: '#D97706', borderRadius: '9999px', padding: '2px 8px' }}>3 honest 🤍</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 8: Testimonials */}
      <div style={{ marginTop: '28px', padding: '0 20px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#1A3028', margin: '0 0 14px' }}>What sprinters say</h2>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }} className="no-scrollbar">
          {/* Card 1 */}
          <div style={{ minWidth: '260px', backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '16px', border: '1px solid #EDF2EF', boxShadow: '0 1px 8px rgba(26,46,37,0.06)' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: '#D4EDE3', lineHeight: 1 }}>"</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#2D4A3E', lineHeight: 1.6, margin: '4px 0 12px' }}>
              I've tried 6 habit apps. StrideWithMe is the first one that didn't make me feel guilty for a bad day. The Sprint Record I earned is something I actually put on my LinkedIn.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#3D7A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '10px', color: '#FFFFFF' }}>MI</div>
                <div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Meera Iyer</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', margin: 0 }}>Notion Creator · Freelancer</p>
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', backgroundColor: '#D4EDE3', color: '#3D7A5F', borderRadius: '9999px', padding: '2px 8px' }}>27/30 verified</span>
            </div>
          </div>
          {/* Card 2 */}
          <div style={{ minWidth: '260px', backgroundColor: '#F9FBF9', borderRadius: '18px', padding: '16px', border: '1px solid #EDF2EF', boxShadow: '0 1px 8px rgba(26,46,37,0.06)' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: '#D4EDE3', lineHeight: 1 }}>"</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#2D4A3E', lineHeight: 1.6, margin: '4px 0 12px' }}>
              The AI verification is the whole thing — it actually called out my vague log and made me rewrite it. That friction made me insightful about my own work like a mentor would.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#7AB5A0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '10px', color: '#FFFFFF' }}>RV</div>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: '#1A3028', margin: 0 }}>Rohan Verma</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2', margin: 0 }}>Engineer → PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 9: Closing Dark CTA Card */}
      <div style={{ margin: '24px 20px 32px', backgroundColor: '#1C3D30', borderRadius: '24px', padding: '28px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: '28px' }}>🌱</span>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#FFFFFF', margin: '16px 0 0' }}>Your sprint starts</p>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontStyle: 'italic', color: '#FFFFFF', margin: '0' }}>the moment you decide.</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#7AB5A0', lineHeight: 1.5, margin: '10px 0 0', letterSpacing: '0.01em' }}>
          30 days. One goal. Daily verification. A Sprint Record that proves you showed up.
        </p>
        <button
          onClick={() => navigate('/auth')}
          style={{ backgroundColor: '#FFFFFF', color: '#1C3D30', fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 600, borderRadius: '9999px', border: 'none', height: '48px', width: '100%', maxWidth: '280px', margin: '20px auto 0', display: 'block', cursor: 'pointer' }}
        >
          Start my 30-day sprint →
        </button>
        <button
          onClick={() => navigate('/record/1')}
          style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#7AB5A0', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', marginTop: '12px', display: 'block', marginLeft: 'auto', marginRight: 'auto', letterSpacing: '0.01em' }}
        >
          See a live sprint example first →
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-evenly', marginTop: '20px' }}>
          {['No credit card', 'Private by default', 'Export anytime'].map((t) => (
            <span key={t} style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#4A8C6F', letterSpacing: '0.01em' }}>✓ {t}</span>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
