import PageWrapper from '../components/PageWrapper'

export default function WaitingPage() {
  return (
    <PageWrapper showNav={false}>
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: '100vh', justifyContent: 'center' }}>
        {/* Logo */}
        <div style={{ width: '40px', height: '40px', backgroundColor: '#3D7A5F', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: '22px', color: '#FFFFFF', fontWeight: 700, marginBottom: '32px' }}>
          S
        </div>

        {/* Countdown */}
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '72px', color: '#3D7A5F' }}>5</span>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 24px' }}>days until your cohort opens</p>

        {/* Divider */}
        <div style={{ width: '100%', height: '1px', backgroundColor: '#D4EDE3', margin: '0 0 24px' }} />

        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: '#1A3028', margin: '0 0 20px' }}>
          Your sprint group forms on Monday, May 12.
        </p>

        {/* Plan preview */}
        <div style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid #EDF2EF', padding: '16px', textAlign: 'left', marginBottom: '20px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 8px' }}>Meanwhile — your Day 1 task is ready:</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 500, color: '#1A3028', margin: '0 0 12px' }}>Define your core value proposition in one sentence. Rewrite it 5 times.</p>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#3D7A5F' }}>Preview full plan →</span>
        </div>

        {/* Avatars */}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', marginBottom: '8px' }}>3 others joining this cohort</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          {['PS', 'KN', 'RV'].map((initials, i) => (
            <div key={i} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: ['#7AB5A0', '#F59E4A', '#3D7A5F'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '12px', color: '#FFFFFF', marginLeft: i > 0 ? '-8px' : '0', border: '2px solid #FFFFFF', position: 'relative', zIndex: 3 - i }}>
              {initials}
            </div>
          ))}
        </div>

        {/* CTAs */}
        <button style={{ width: '100%', padding: '16px', backgroundColor: '#3D7A5F', color: '#FFFFFF', borderRadius: '9999px', border: 'none', fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 4px 16px rgba(61, 122, 95, 0.25)', marginBottom: '4px' }}>
          Start solo now →
        </button>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontStyle: 'italic', color: '#7AB5A0', margin: '0 0 12px' }}>You'll merge into a cohort when one opens</p>

        <button style={{ width: '100%', padding: '16px', backgroundColor: 'transparent', color: '#6B9E8A', borderRadius: '9999px', border: '1.5px solid #D4EDE3', fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}>
          Wait for my cohort
        </button>
      </div>
    </PageWrapper>
  )
}
