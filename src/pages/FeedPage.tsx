import { useState, useEffect, useRef } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
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

const MOCK_POOL = [
  { id: 1, initials: 'MI', name: 'Meera Iyer', day: 27, hoursAgo: '2h', type: 'PROGRESS' as const, goal: 'Build and launch a Notion template business', text: 'Published template #4 today — a project tracker for freelancers. Got 3 organic downloads within the first hour. The SEO work from Day 20 is paying off. Feeling the compound effect.', witnessed: 3, facingThis: 0 },
  { id: 2, initials: 'KN', name: 'Kavya Nair', day: 18, hoursAgo: '4h', type: 'HONEST' as const, goal: 'Write and publish my first technical e-book', text: "Took an honest day today. I've been stuck on Chapter 3 for 4 days now. The structure isn't working and I keep rewriting the same section. Chose to step back instead of forcing bad words.", witnessed: 1, facingThis: 2 },
  { id: 3, initials: 'PS', name: 'Priya Sharma', day: 22, hoursAgo: '6h', type: 'PROGRESS' as const, goal: 'Get my first 10 freelance design clients', text: 'Sent 5 cold proposals today with custom portfolio links for each prospect. Spent 2 hours researching each company before writing. Quality over quantity. One already replied.', witnessed: 4, facingThis: 0 },
  { id: 4, initials: 'RV', name: 'Rohan Verma', day: 14, hoursAgo: '8h', type: 'PROGRESS' as const, goal: 'Transition from engineer to PM with a portfolio', text: 'Completed a full PRD for an imaginary feature — a smart notification system for a fintech app. Wrote user stories, acceptance criteria, and a prioritisation matrix. Feels real.', witnessed: 2, facingThis: 0 },
  { id: 5, initials: 'RV', name: 'Rohan Verma', day: 11, hoursAgo: '1d', type: 'HONEST' as const, goal: 'Transition from engineer to PM with a portfolio', text: "Yesterday was a hard day. Got pulled into a production incident at work and couldn't focus on the sprint at all. Chose to log honestly rather than write something hollow.", witnessed: 2, facingThis: 3 },
  { id: 6, initials: 'AS', name: 'Aarav Shah', day: 9, hoursAgo: '3h', type: 'PROGRESS' as const, goal: 'Run a half-marathon in under 2 hours', text: 'Ran 12K this morning at 5:42 pace. Felt strong through the first 8, then the heat caught up. Pushed through the last 4 even when my legs wanted to quit. Small wins compound.', witnessed: 5, facingThis: 0 },
  { id: 7, initials: 'NP', name: 'Nisha Patel', day: 24, hoursAgo: '5h', type: 'PROGRESS' as const, goal: 'Ship a SaaS side project to first paying customer', text: 'First Stripe payment. ₹499. From a stranger on the internet. Spent 22 days building this. Tonight I am going to sit with this feeling for a minute before I start fixing the next bug.', witnessed: 8, facingThis: 0 },
  { id: 8, initials: 'TG', name: 'Tarun Gupta', day: 6, hoursAgo: '7h', type: 'HONEST' as const, goal: 'Practice Hindustani classical for 30 mins daily', text: "Skipped riyaaz today. Family emergency, and by the time I sat down it was midnight. Logging this honestly because I don't want to fake a day on the record.", witnessed: 2, facingThis: 4 },
  { id: 9, initials: 'SR', name: 'Sara Reddy', day: 30, hoursAgo: '10h', type: 'PROGRESS' as const, goal: 'Read 30 books in 30 days', text: 'Final day. Finished book 30 — Atomic Habits. Re-read because I wanted to end with something I love. The compound effect is real and I just lived it.', witnessed: 12, facingThis: 0 },
  { id: 10, initials: 'VK', name: 'Vikram Krishnan', day: 16, hoursAgo: '12h', type: 'PROGRESS' as const, goal: 'Launch a YouTube channel about Indian history', text: 'Edited and uploaded video 4. The B-roll took 5 hours alone. 47 subscribers now from 0 two weeks ago. Slow burn but real.', witnessed: 3, facingThis: 0 },
  { id: 11, initials: 'AM', name: 'Ananya Mehta', day: 13, hoursAgo: '14h', type: 'HONEST' as const, goal: 'Build a daily meditation practice', text: 'Meditated for 4 minutes instead of 20. Brain was loud, kept thinking about a deadline. But I sat. Counts.', witnessed: 4, facingThis: 1 },
  { id: 12, initials: 'JS', name: 'Jaya Singh', day: 21, hoursAgo: '16h', type: 'PROGRESS' as const, goal: 'Learn enough Spanish for basic conversation', text: 'Had my first 10-minute conversation in Spanish with a tutor today. Made dozens of mistakes but understood every question. Three weeks ago I knew zero words.', witnessed: 6, facingThis: 0 },
  { id: 13, initials: 'OD', name: 'Omkar Deshmukh', day: 8, hoursAgo: '18h', type: 'PROGRESS' as const, goal: 'Lose 5kg in a healthy way', text: 'Down 1.2kg already. The meal-prepping system is working. Sunday batch cook saved me from ordering Swiggy three times this week.', witnessed: 4, facingThis: 0 },
  { id: 14, initials: 'IK', name: 'Ishani Kapoor', day: 19, hoursAgo: '20h', type: 'HONEST' as const, goal: 'Write 1000 words a day for my novel', text: "Wrote 240 words today. Wanted to write zero. The plot has a hole I cannot fix and I'm angry at myself. But 240 > 0 and that's what I have to remember.", witnessed: 5, facingThis: 6 },
  { id: 15, initials: 'DM', name: 'Devansh Mishra', day: 25, hoursAgo: '22h', type: 'PROGRESS' as const, goal: 'Crack into a top product company', text: 'System design round done. Designed a rate limiter end-to-end. Interviewer said "this is the cleanest version I have seen this week." Final round next week.', witnessed: 9, facingThis: 0 },
]

function pickMocks(count = 5) {
  return [...MOCK_POOL].sort(() => Math.random() - 0.5).slice(0, count)
}

export default function FeedPage() {
  const { user } = useAuth()
  const [reactions, setReactions] = useState<Record<string, boolean>>({})
  const [reactionCounts, setReactionCounts] = useState<Record<string, { witnessed: number; facingThis: number; userWitnessed: boolean; userFacingThis: boolean }>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [realPosts, setRealPosts] = useState<FeedPost[]>([])
  const [, setLoadingPosts] = useState(true)
  const [displayedMocks, setDisplayedMocks] = useState(() => pickMocks())
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef<number | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 0) { startYRef.current = null; return }
    startYRef.current = e.touches[0].clientY
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return
    const dy = e.touches[0].clientY - startYRef.current
    if (dy > 0) setPullY(Math.min(dy * 0.5, 80))
  }
  const onTouchEnd = () => {
    if (startYRef.current === null) return
    if (pullY > 50) {
      setRefreshing(true)
      setPullY(60)
      setTimeout(() => {
        setDisplayedMocks(pickMocks())
        setRefreshing(false)
        setPullY(0)
      }, 600)
    } else {
      setPullY(0)
    }
    startYRef.current = null
  }

  useEffect(() => {
    async function loadFeed() {
      const posts = await getFeedPosts()
      setRealPosts(posts)
      setLoadingPosts(false)
      for (const post of posts) {
        const { data: reactions } = await supabase.from('reactions').select('*').eq('post_id', post.id)
        setReactionCounts(prev => ({ ...prev, [post.id]: {
          witnessed: reactions?.filter(r => r.reaction_type === 'WITNESSED').length ?? 0,
          facingThis: reactions?.filter(r => r.reaction_type === 'FACING_THIS_TOO').length ?? 0,
          userWitnessed: reactions?.some(r => r.reaction_type === 'WITNESSED' && r.user_id === user?.id) ?? false,
          userFacingThis: reactions?.some(r => r.reaction_type === 'FACING_THIS_TOO' && r.user_id === user?.id) ?? false,
        }}))
      }
    }
    loadFeed()
  }, [user])

  const hasRealPosts = realPosts.length > 0

  const toggleReaction = (key: string) => {
    setReactions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleRealReaction = async (postId: string, type: 'WITNESSED' | 'FACING_THIS_TOO') => {
    if (!user) return
    const counts = reactionCounts[postId]
    const isActive = type === 'WITNESSED' ? counts?.userWitnessed : counts?.userFacingThis

    if (isActive) {
      await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', user.id).eq('reaction_type', type)
    } else {
      await supabase.from('reactions').insert({ post_id: postId, user_id: user.id, reaction_type: type })
    }

    const { data: updated } = await supabase.from('reactions').select('*').eq('post_id', postId)
    setReactionCounts(prev => ({ ...prev, [postId]: {
      witnessed: updated?.filter(r => r.reaction_type === 'WITNESSED').length ?? 0,
      facingThis: updated?.filter(r => r.reaction_type === 'FACING_THIS_TOO').length ?? 0,
      userWitnessed: updated?.some(r => r.reaction_type === 'WITNESSED' && r.user_id === user.id) ?? false,
      userFacingThis: updated?.some(r => r.reaction_type === 'FACING_THIS_TOO' && r.user_id === user.id) ?? false,
    }}))
  }

  const avatarColors = ['#3D7A5F', '#F59E4A', '#7AB5A0', '#B8D9CC', '#3D7A5F']

  return (
    <PageWrapper>
      <div
        style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px - env(safe-area-inset-top) - env(safe-area-inset-bottom))', transform: `translateY(${pullY}px)`, transition: pullY === 0 ? 'transform 0.3s ease' : 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {pullY > 0 && (
          <div style={{ position: 'absolute', top: -50, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40px', opacity: Math.min(pullY / 50, 1) }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #D4EDE3', borderTopColor: '#3D7A5F', animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          </div>
        )}

        {/* Authoritative header */}
        <div style={{ margin: '16px 16px 0', background: 'linear-gradient(135deg, #1C3D30 0%, #2D5A47 60%, #1C3D30 100%)', borderRadius: '24px', padding: '24px 22px', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 32px rgba(28,61,48,0.18)' }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(118,197,72,0.18) 0%, rgba(118,197,72,0) 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Users size={14} color="#7AB5A0" />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', letterSpacing: '0.15em', color: '#7AB5A0', textTransform: 'uppercase', fontWeight: 600 }}>The cohort</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: 600, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Building alongside you
            </h1>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontStyle: 'italic', color: 'rgba(255,255,255,0.75)', margin: '6px 0 14px', lineHeight: 1.5 }}>
              Real days. Honest checks. The work being done — together.
            </p>

            {/* Active indicator + avatar stack inline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex' }}>
                {['MI', 'KN', 'PS', 'RV', 'AM'].map((initials, i) => (
                  <div
                    key={i}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: avatarColors[i],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-body)',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      marginLeft: i > 0 ? '-8px' : '0',
                      border: '2px solid #1C3D30',
                      zIndex: 5 - i,
                      position: 'relative',
                    }}
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#76C548', animation: 'pulse-ring 1.5s infinite' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#7AB5A0' }}>Active this sprint</span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '14px', marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#76C548' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Progress</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E4A' }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Honest Check-in</span>
              </div>
            </div>
          </div>
        </div>

      <div style={{ padding: '20px 16px 0', WebkitOverflowScrolling: 'touch' }}>
        {/* Disclaimer */}
        {!hasRealPosts && (
        <div style={{ background: 'rgba(234,245,240,0.9)', border: '1px solid #B8D9CC', borderRadius: '16px', padding: '12px 16px', margin: '0 0 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>🌱</span>
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: '#3D7A5F', margin: '0 0 2px' }}>The feed grows as you do</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', lineHeight: 1.5, margin: 0 }}>Once you and your cohort start logging, this fills with real stories.</p>
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
                {/* Reactions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {(() => {
                    const counts = reactionCounts[post.id]
                    const isOwner = post.user_id === user?.id
                    const wCount = counts?.witnessed ?? 0
                    const fCount = counts?.facingThis ?? 0
                    const wActive = counts?.userWitnessed ?? false
                    const fActive = counts?.userFacingThis ?? false
                    return (
                      <>
                        <button
                          onClick={isOwner ? undefined : () => handleRealReaction(post.id, 'WITNESSED')}
                          title={isOwner ? "You can't react to your own post" : undefined}
                          style={{ padding: '6px 12px', borderRadius: '9999px', border: wActive ? 'none' : '1px solid #D4EDE3', backgroundColor: wActive ? '#3D7A5F' : '#F0F7F4', color: wActive ? '#FFFFFF' : '#3D7A5F', fontFamily: 'var(--font-body)', fontSize: '11px', cursor: isOwner ? 'default' : 'pointer', opacity: isOwner ? 0.6 : 1 }}
                        >
                          👁 Witnessed{wCount > 0 ? ` ${wCount}` : ''}
                        </button>
                        <button
                          onClick={isOwner ? undefined : () => handleRealReaction(post.id, 'FACING_THIS_TOO')}
                          title={isOwner ? "You can't react to your own post" : undefined}
                          style={{ padding: '6px 12px', borderRadius: '9999px', border: fActive ? 'none' : '1px solid #F5D5A8', backgroundColor: fActive ? '#F59E4A' : '#FEF9F4', color: fActive ? '#FFFFFF' : '#D97706', fontFamily: 'var(--font-body)', fontSize: '11px', cursor: isOwner ? 'default' : 'pointer', opacity: isOwner ? 0.6 : 1 }}
                        >
                          🤍 Facing this too{fCount > 0 ? ` ${fCount}` : ''}
                        </button>
                      </>
                    )
                  })()}
                </div>
              </div>
            )
          })}

          {/* Mock posts shown only when no real posts */}
          {!hasRealPosts && displayedMocks.map((post) => {
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

      </div>

        {/* End indicator — pinned above BottomNav */}
        <div style={{ textAlign: 'center', margin: '0 16px 16px', marginTop: 'auto', paddingTop: '32px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#9BBFB2' }}>
            That's everyone for now. Log today to add your voice.
            <br />🌱
          </span>
        </div>
      </div>
    </PageWrapper>
  )
}
