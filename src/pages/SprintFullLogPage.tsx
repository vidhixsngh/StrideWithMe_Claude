import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

const sprintLog = [
  { day: 1, type: 'VERIFIED' as const, task: 'Define your core value proposition', log: 'Wrote 5 versions of my value prop. Landed on: "Landing pages that convert in under 48 hours for solo founders." Shared in 2 Slack groups.', aiInsight: 'You started with clarity, not with code. That positioning focus early will compound.' },
  { day: 2, type: 'VERIFIED' as const, task: 'Map your target customer', log: 'Interviewed 3 founders on Twitter DM. All said same thing — they hate writing copy. Building customer persona doc now.', aiInsight: 'Primary research on day 2 is rare. This is the right foundation.' },
  { day: 3, type: 'VERIFIED' as const, task: 'Write hero copy for landing page', log: 'First draft of landing page copy done. Headline: "Stop losing signups to bad copy." Not sure it\'s right yet.', aiInsight: null },
  { day: 4, type: 'VERIFIED' as const, task: 'Identify 3 closest competitors', log: 'Analysed Copysmith, Unbounce, and ConvertKit landing pages. Unbounce targets agencies — not my user.', aiInsight: 'Competitive clarity this early means you\'ll build with a wedge, not just a feature.' },
  { day: 5, type: 'HONEST' as const, task: 'Build clickable prototype', log: 'Got sick today. Spent most of day resting. Looked at Figma for 20 mins but couldn\'t focus properly.', aiInsight: null },
  { day: 6, type: 'VERIFIED' as const, task: 'Build clickable prototype', log: 'Back at it. Built the prototype in 4 hours straight. Core flow: landing → email capture → thank you.', aiInsight: 'Bouncing back the day after illness and doubling output is a character data point.' },
  { day: 7, type: 'VERIFIED' as const, task: 'Set up landing page infrastructure', log: 'Deployed to Vercel. Custom domain live. Email capture going to Airtable. It\'s real now.', aiInsight: 'Week 1 done. You have a live URL. Most people are still planning.' },
  { day: 8, type: 'VERIFIED' as const, task: 'Share landing page in 3 communities', log: 'Posted in IndieHackers, a Slack group, and LinkedIn. 47 visits. 2 signups. Feels small but it\'s something.', aiInsight: null },
  { day: 9, type: 'MISSED' as const, task: 'Collect feedback from first visitors', log: '', aiInsight: null },
  { day: 10, type: 'VERIFIED' as const, task: 'Revise based on feedback', log: 'Rewrote the entire headline. New version: "Your landing page is losing you signups. Here\'s why." Took 6 hours.', aiInsight: 'Pivoting from feedback on day 10 instead of quitting — this is what separates builders.' },
  { day: 11, type: 'VERIFIED' as const, task: 'Create lead magnet content', log: 'Wrote a 2-page checklist: "5 things killing your landing page conversions." Gonna gate it behind email.', aiInsight: null },
  { day: 12, type: 'VERIFIED' as const, task: 'Set up email sequence', log: 'Built a 3-email welcome sequence in ConvertKit. Each email teaches one thing and asks one question.', aiInsight: 'Building relationships before selling is the right instinct here.' },
  { day: 13, type: 'VERIFIED' as const, task: 'Run first outreach campaign', log: 'DM\'d 20 founders who tweeted about launching soon. Offered free landing page audit. 4 replied interested.', aiInsight: null },
  { day: 14, type: 'HONEST' as const, task: 'Complete first landing page audit', log: 'Got overwhelmed with the 4 replies. Didn\'t start any audits. Spent the day overthinking pricing instead.', aiInsight: 'Logging the freeze is more valuable than pretending it didn\'t happen.' },
  { day: 15, type: 'VERIFIED' as const, task: 'Complete first landing page audit', log: 'Did the first audit for a productivity app founder. Spent 90 mins, recorded a Loom. They loved it.', aiInsight: 'From freeze to delivery in 24 hours. The honest day unlocked this.' },
  { day: 16, type: 'VERIFIED' as const, task: 'Create case study from audit', log: 'Turned the audit into a before/after case study. Got permission to share publicly.', aiInsight: null },
  { day: 17, type: 'VERIFIED' as const, task: 'Share case study publicly', log: 'Posted the case study on LinkedIn. 1,200 impressions. 3 new DMs asking about services.', aiInsight: 'Social proof compounds. One good case study is worth 50 cold DMs.' },
  { day: 18, type: 'VERIFIED' as const, task: 'Define service packaging', log: 'Created 3 tiers: Quick Audit ($99), Full Redesign ($499), Launch Package ($999). Feels scary to price.', aiInsight: null },
  { day: 19, type: 'VERIFIED' as const, task: 'Build services page', log: 'Services page live with 3 tiers. Added the case study as social proof. Added Calendly booking link.', aiInsight: 'You have a real business page now. The transition from "project" to "service" happened this week.' },
  { day: 20, type: 'MISSED' as const, task: 'Set up analytics and tracking', log: '', aiInsight: null },
  { day: 21, type: 'VERIFIED' as const, task: 'Set up analytics and tracking', log: 'Added Plausible analytics. Set up conversion goals for email signup and Calendly clicks. Data flowing.', aiInsight: null },
  { day: 22, type: 'VERIFIED' as const, task: 'Run second outreach batch', log: 'DM\'d 30 more founders. New angle: "I\'ll audit your landing page for free — if it\'s good, I\'ll feature it."', aiInsight: 'The reframe from "selling" to "featuring" is clever positioning.' },
  { day: 23, type: 'VERIFIED' as const, task: 'Complete 3 more audits', log: 'Did 3 audits back-to-back. Getting faster — 45 mins each now. One founder asked about the paid tier.', aiInsight: null },
  { day: 24, type: 'VERIFIED' as const, task: 'First paid proposal sent', log: 'Sent the $499 proposal to the founder who asked. Customised it with specific recommendations from their audit.', aiInsight: 'First paid proposal on day 24. The free work was strategic, not charity.' },
  { day: 25, type: 'VERIFIED' as const, task: 'Follow up on all leads', log: 'Followed up with all 7 audit recipients. 2 more expressed interest in paid work. Pipeline building.', aiInsight: null },
  { day: 26, type: 'VERIFIED' as const, task: 'Close first paying client', log: 'First client signed! $499 for a full landing page redesign. Deposit received. This is real revenue.', aiInsight: 'Day 26: first paying client. Goal was "first client in 30 days." You\'re 4 days early.' },
  { day: 27, type: 'VERIFIED' as const, task: 'Begin client delivery', log: 'Started the redesign. Wireframes done in 2 hours. Showing them tomorrow. This feels like my thing.', aiInsight: null },
  { day: 28, type: 'VERIFIED' as const, task: 'Deliver first draft to client', log: 'Sent first draft. Client replied "this is exactly what I needed." Revision notes minimal.', aiInsight: 'Client satisfaction on first delivery means your process works. Document it.' },
  { day: 29, type: 'VERIFIED' as const, task: 'Get testimonial + referral', log: 'Client gave a testimonial and referred me to 2 friends. Second proposal sent. 10th waitlist signup came in too.', aiInsight: 'Referral on day 29. Word-of-mouth this early means the work speaks.' },
  { day: 30, type: 'VERIFIED' as const, task: 'Sprint wrap-up and reflection', log: 'Final day. 1 paying client, 2 proposals out, 10 waitlist signups, 7 free audits done. I have a business now.', aiInsight: 'Sprint complete. You came in wanting a client. You\'re leaving with a business model.' },
]

export default function SprintFullLogPage() {
  const navigate = useNavigate()

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', maxWidth: '430px', margin: '0 auto', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#6B9E8A', fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', letterSpacing: '0.01em' }}
      >
        <ChevronLeft size={16} /> Sprint Record
      </button>

      {/* Header */}
      <div style={{ padding: '0 20px 20px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: '#1A3028', margin: '0 0 4px' }}>Full Sprint Log</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', margin: 0, letterSpacing: '0.01em' }}>Arjun's SaaS Sprint · 30 days</p>
      </div>

      {/* Timeline */}
      <div style={{ padding: '0 20px' }}>
        {sprintLog.map((entry, idx) => (
          <div key={entry.day} style={{ display: 'flex', gap: 0 }}>
            {/* Left timeline column */}
            <div style={{ width: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: entry.type === 'VERIFIED' ? '#3D7A5F' : entry.type === 'HONEST' ? '#F59E4A' : '#F0EBE3',
                color: entry.type === 'MISSED' ? '#9BBFB2' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: 600,
              }}>
                {entry.day}
              </div>
              {idx < sprintLog.length - 1 && (
                <div style={{ width: '1px', flex: 1, minHeight: '20px', backgroundColor: '#E0E0E0' }} />
              )}
            </div>

            {/* Right content */}
            <div style={{ padding: '0 0 20px 12px', flex: 1 }}>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                fontStyle: 'italic',
                color: entry.type === 'VERIFIED' ? '#3D7A5F' : entry.type === 'HONEST' ? '#D97706' : '#9BBFB2',
                letterSpacing: '0.01em',
              }}>
                {entry.type === 'VERIFIED' && '✓ Verified'}
                {entry.type === 'HONEST' && '🤍 Honest check-in'}
                {entry.type === 'MISSED' && '— Missed'}
              </span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#9BBFB2', margin: '2px 0 6px', letterSpacing: '0.01em' }}>{entry.task}</p>

              {entry.type !== 'MISSED' ? (
                <>
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EDF2EF', padding: '12px', boxShadow: '0 1px 8px rgba(26,46,37,0.06)' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#2D4A3E', lineHeight: 1.6, margin: 0 }}>{entry.log}</p>
                  </div>
                  {entry.aiInsight && (
                    <div style={{ borderLeft: '2px solid #B8D9CC', paddingLeft: '10px', marginTop: '8px' }}>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#7AB5A0', margin: 0, lineHeight: 1.5, letterSpacing: '0.01em' }}>✦ {entry.aiInsight}</p>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ backgroundColor: '#F5F5F5', borderRadius: '8px', padding: '10px 12px' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#C0C0C0', margin: 0 }}>No log this day.</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Completion badge */}
      <div style={{ margin: '16px 20px 32px', background: 'linear-gradient(135deg, #EAF5F0, #F0EEF8)', borderRadius: '20px', padding: '20px', textAlign: 'center' }}>
        <span style={{ fontSize: '32px' }}>🏆</span>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: '#1A3028', margin: '8px 0 4px' }}>Sprint Complete</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 16px', letterSpacing: '0.01em' }}>27 of 30 days logged · 90% completion</p>
        <button
          onClick={() => navigate(-1)}
          style={{ width: '100%', height: '48px', backgroundColor: '#3D7A5F', color: '#FFFFFF', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.02em' }}
        >
          Back to Sprint Record →
        </button>
      </div>
    </div>
  )
}
