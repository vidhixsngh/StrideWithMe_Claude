import { useState } from 'react'
import PageWrapper from '../components/PageWrapper'

const mockPosts = [
  { id: 1, initials: 'MI', name: 'Meera Iyer', day: 27, hoursAgo: '2h', type: 'PROGRESS' as const, goal: 'Build and launch a Notion template business', text: 'Published template #4 today — a project tracker for freelancers. Got 3 organic downloads within the first hour. The SEO work from Day 20 is paying off. Feeling the compound effect.', witnessed: 3, facingThis: 0 },
  { id: 2, initials: 'KN', name: 'Kavya Nair', day: 18, hoursAgo: '4h', type: 'HONEST' as const, goal: 'Write and publish my first technical e-book', text: "Took an honest day today. I've been stuck on Chapter 3 for 4 days now. The structure isn't working and I keep rewriting the same section. Chose to step back instead of forcing bad words.", witnessed: 1, facingThis: 2 },
  { id: 3, initials: 'PS', name: 'Priya Sharma', day: 22, hoursAgo: '6h', type: 'PROGRESS' as const, goal: 'Get my first 10 freelance design clients', text: 'Sent 5 cold proposals today with custom portfolio links for each prospect. Spent 2 hours researching each company before writing. Quality over quantity. One already replied.', witnessed: 4, facingThis: 0 },
  { id: 4, initials: 'RV', name: 'Rohan Verma', day: 14, hoursAgo: '8h', type: 'PROGRESS' as const, goal: 'Transition from engineer to PM with a portfolio', text: 'Completed a full PRD for an imaginary feature — a smart notification system for a fintech app. Wrote user stories, acceptance criteria, and a prioritisation matrix. Feels real.', witnessed: 2, facingThis: 0 },
  { id: 5, initials: 'RV', name: 'Rohan Verma', day: 11, hoursAgo: '1d', type: 'HONEST' as const, goal: 'Transition from engineer to PM with a portfolio', text: "Yesterday was a hard day. Got pulled into a production incident at work and couldn't focus on the sprint at all. Chose to log honestly rather than write something hollow.", witnessed: 2, facingThis: 3 },
]

export default function FeedPage() {
  const [reactions, setReactions] = useState<Record<string, boolean>>({})

  const toggleReaction = (key: string) => {
    setReactions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const avatarColors = ['#3D7A5F', '#F59E4A', '#7AB5A0', '#B8D9CC', '#3D7A5F']

  return (
    <PageWrapper>
      <div style={{ padding: '20px 16px' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(180deg, #EAF5F0, transparent)', margin: '-20px -16px 0', padding: '20px 16px 16px' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#1A3028', margin: '0 0 4px' }}>Cohort Feed</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 16px' }}>5 people building alongside you</p>

          {/* Avatar stack */}
          <div style={{ display: 'flex', marginBottom: '12px' }}>
            {['MI', 'KN', 'PS', 'RV', 'AM'].map((initials, i) => (
              <div
                key={i}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: avatarColors[i],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: '#FFFFFF',
                  marginLeft: i > 0 ? '-8px' : '0',
                  border: '2px solid #FFFFFF',
                  zIndex: 5 - i,
                  position: 'relative',
                }}
              >
                {initials}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3D7A5F' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#6B9E8A' }}>Progress</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E4A' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#6B9E8A' }}>Honest Check-in</span>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div style={{ marginTop: '16px' }}>
          {mockPosts.map((post) => {
            const isHonest = post.type === 'HONEST'
            const witnessedKey = `witnessed-${post.id}`
            const facingKey = `facing-${post.id}`
            return (
              <div
                key={post.id}
                style={{
                  backgroundColor: isHonest ? 'rgba(255, 248, 240, 0.6)' : '#FFFFFF',
                  borderRadius: '20px',
                  border: '1px solid #EDF2EF',
                  borderLeft: isHonest ? '2px solid #F59E4A' : '1px solid #EDF2EF',
                  boxShadow: '0 1px 8px rgba(26, 46, 37, 0.06)',
                  padding: '14px 20px',
                  marginBottom: '20px',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: isHonest ? '#F59E4A' : '#3D7A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '14px', color: '#FFFFFF', flexShrink: 0 }}>
                    {post.initials}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#1A3028' }}>{post.name}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', fontWeight: 700, color: isHonest ? '#D97706' : '#3D7A5F' }}>
                        {isHonest ? '🤍 HONEST' : '✓ PROGRESS'}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2' }}>
                      Day {post.day} · {post.hoursAgo} ago
                    </span>
                  </div>
                </div>

                {/* Goal */}
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#7AB5A0', margin: '0 0 8px' }}>
                  Goal: {post.goal}
                </p>

                {/* Text */}
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', lineHeight: 1.6, color: '#2D4A3E', margin: '0 0 14px' }}>
                  {post.text}
                </p>

                {/* Reactions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => toggleReaction(witnessedKey)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      border: reactions[witnessedKey] ? 'none' : '1px solid #D4EDE3',
                      backgroundColor: reactions[witnessedKey] ? '#3D7A5F' : '#F0F7F4',
                      color: reactions[witnessedKey] ? '#FFFFFF' : '#3D7A5F',
                      fontFamily: 'var(--font-body)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    👁 Witnessed {post.witnessed + (reactions[witnessedKey] ? 1 : 0)}
                  </button>
                  <button
                    onClick={() => toggleReaction(facingKey)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      border: reactions[facingKey] ? 'none' : '1px solid #F5D5A8',
                      backgroundColor: reactions[facingKey] ? '#F59E4A' : '#FEF9F4',
                      color: reactions[facingKey] ? '#FFFFFF' : '#D97706',
                      fontFamily: 'var(--font-body)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    🤍 Facing this too {post.facingThis + (reactions[facingKey] ? 1 : 0)}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* End indicator */}
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#9BBFB2' }}>
            🌱 You're all caught up
          </span>
        </div>
      </div>
    </PageWrapper>
  )
}
