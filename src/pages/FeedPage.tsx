import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getFeedPosts } from '../lib/db'
import type { FeedPost } from '../lib/db'
import PageWrapper from '../components/PageWrapper'

function getTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

const mockPosts = [
  { id: 1, initials: 'MI', name: 'Meera Iyer', day: 27, hoursAgo: '2h', type: 'PROGRESS' as const, goal: 'Build and launch a Notion template business', text: 'Published template #4 today — a project tracker for freelancers. Got 3 organic downloads within the first hour. The SEO work from Day 20 is paying off. Feeling the compound effect.', witnessed: 3, facingThis: 0 },
  { id: 2, initials: 'KN', name: 'Kavya Nair', day: 18, hoursAgo: '4h', type: 'HONEST' as const, goal: 'Write and publish my first technical e-book', text: "Took an honest day today. I've been stuck on Chapter 3 for 4 days now. The structure isn't working and I keep rewriting the same section. Chose to step back instead of forcing bad words.", witnessed: 1, facingThis: 2 },
  { id: 3, initials: 'PS', name: 'Priya Sharma', day: 22, hoursAgo: '6h', type: 'PROGRESS' as const, goal: 'Get my first 10 freelance design clients', text: 'Sent 5 cold proposals today with custom portfolio links for each prospect. Spent 2 hours researching each company before writing. Quality over quantity. One already replied.', witnessed: 4, facingThis: 0 },
  { id: 4, initials: 'RV', name: 'Rohan Verma', day: 14, hoursAgo: '8h', type: 'PROGRESS' as const, goal: 'Transition from engineer to PM with a portfolio', text: 'Completed a full PRD for an imaginary feature — a smart notification system for a fintech app. Wrote user stories, acceptance criteria, and a prioritisation matrix. Feels real.', witnessed: 2, facingThis: 0 },
  { id: 5, initials: 'RV', name: 'Rohan Verma', day: 11, hoursAgo: '1d', type: 'HONEST' as const, goal: 'Transition from engineer to PM with a portfolio', text: "Yesterday was a hard day. Got pulled into a production incident at work and couldn't focus on the sprint at all. Chose to log honestly rather than write something hollow.", witnessed: 2, facingThis: 3 },
]

export default function FeedPage() {
  const { user: _user } = useAuth()
  const [reactions, setReactions] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [realPosts, setRealPosts] = useState<FeedPost[]>([])
  const [, setLoadingPosts] = useState(true)

  useEffect(() => {
    getFeedPosts().then(posts => {
      setRealPosts(posts)
      setLoadingPosts(false)
    })
  }, [])

  const hasRealPosts = realPosts.length > 0

  const toggleReaction = (key: string) => {
    setReactions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const avatarColors = ['#3D7A5F', '#F59E4A', '#7AB5A0', '#B8D9CC', '#3D7A5F']

  return (
    <PageWrapper>
      <div style={{ padding: '20px 16px', WebkitOverflowScrolling: 'touch' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(180deg, #EAF5F0, transparent)', margin: '-20px -16px 0', padding: '20px 16px 16px' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: '#1A3028', margin: '0 0 4px' }}>Building alongside you</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 16px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3D7A5F', animation: 'pulse-ring 1.5s infinite' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#3D7A5F' }}>5 active this sprint</span>
          </div>

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

        {/* Disclaimer */}
        {!hasRealPosts && (
        <div style={{ background: 'rgba(234,245,240,0.9)', border: '1px solid #B8D9CC', borderRadius: '16px', padding: '12px 16px', margin: '16px 0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>🌱</span>
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#3D7A5F', margin: '0 0 2px' }}>The feed grows as you do</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', lineHeight: 1.5, margin: 0 }}>Right now you're seeing example posts to show you how the feed works. Once you and your cohort start logging, this fills with real stories.</p>
          </div>
        </div>
        )}

        {/* Posts */}
        <div style={{ marginTop: '16px' }}>
          {/* Real posts */}
          {hasRealPosts && realPosts.map((post) => {
            const displayName = (post.profiles as any)?.display_name ?? 'Anonymous'
            const initials = displayName.slice(0, 2).toUpperCase()
            const dayNumber = (post.daily_logs as any)?.day_number ?? 0
            const logType = (post.daily_logs as any)?.log_type ?? 'VERIFIED'
            const goalText = (post.sprints as any)?.goal_text ?? ''
            const isHonest = logType === 'HONEST'
            const goalTruncated = goalText.length > 45 ? goalText.slice(0, 45) + '...' : goalText
            const timeAgo = getTimeAgo(post.created_at)

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
                  marginBottom: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: isHonest ? '#F59E4A' : '#3D7A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '14px', color: '#FFFFFF', flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#1A3028' }}>{displayName}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', fontWeight: 500, letterSpacing: '0.06em', color: isHonest ? '#D97706' : '#4A8C6F' }}>
                        {isHonest ? 'HONEST' : 'PROGRESS'}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2' }}>
                      Day {dayNumber} · {timeAgo}
                    </span>
                  </div>
                </div>
                {goalText && (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#7AB5A0', margin: '0 0 6px' }}>
                    Goal: {goalTruncated}
                  </p>
                )}
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.55, color: '#2D4A3E', margin: 0 }}>
                  {post.post_text}
                </p>
              </div>
            )
          })}

          {/* Mock posts shown only when no real posts */}
          {!hasRealPosts && mockPosts.map((post) => {
            const isHonest = post.type === 'HONEST'
            const witnessedKey = `witnessed-${post.id}`
            const facingKey = `facing-${post.id}`
            const witnessedCount = post.witnessed + (reactions[witnessedKey] ? 1 : 0)
            const facingCount = post.facingThis + (reactions[facingKey] ? 1 : 0)
            const isExpanded = expanded[post.id] ?? false
            const goalTruncated = post.goal.length > 45 ? post.goal.slice(0, 45) + '...' : post.goal

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
                  marginBottom: '14px',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: isHonest ? '#F59E4A' : '#3D7A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '14px', color: '#FFFFFF', flexShrink: 0 }}>
                    {post.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#1A3028' }}>{post.name}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', fontWeight: 500, letterSpacing: '0.06em', color: isHonest ? '#D97706' : '#4A8C6F' }}>
                        {isHonest ? 'HONEST' : 'PROGRESS'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', color: '#9BBFB2' }}>
                        Day {post.day} · {post.hoursAgo}
                      </span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', backgroundColor: '#EAF5F0', color: '#3D7A5F', borderRadius: '9999px', padding: '2px 8px', border: '1px solid #B8D9CC' }}>
                        Day {post.day}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Goal */}
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#7AB5A0', margin: '0 0 6px' }}>
                  Goal: {goalTruncated}
                </p>

                {/* Text */}
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  lineHeight: 1.55,
                  color: '#2D4A3E',
                  margin: '0 0 4px',
                  ...(!isExpanded ? {
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                  } : {}),
                }}>
                  {post.text}
                </p>
                {post.text.length > 120 && !isExpanded && (
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [post.id]: true }))}
                    style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#3D7A5F', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '10px' }}
                  >
                    Read more
                  </button>
                )}
                {isExpanded && (
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [post.id]: false }))}
                    style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '10px' }}
                  >
                    Show less
                  </button>
                )}

                {/* Reactions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
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
                    👁 Witnessed{witnessedCount > 0 ? ` ${witnessedCount}` : ''}
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
                    🤍 Facing this too{facingCount > 0 ? ` ${facingCount}` : ''}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* End indicator */}
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#9BBFB2' }}>
            That's everyone for now. Log today to add your voice.
            <br />🌱
          </span>
        </div>
      </div>
    </PageWrapper>
  )
}
