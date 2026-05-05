import { useNavigate } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper'
import { useAuth } from '../context/AuthContext'

const mockProfile = {
  initials: 'AM',
  name: 'Arjun Mehta',
  tagline: 'Building in public · 2 sprints',
  sprints: [
    { id: 1, title: "SaaS from idea to customer", days: 30, verified: 24, honest: 3, status: 'COMPLETED' as const, completion: 92 },
    { id: 2, title: "Land my first freelance client", days: 14, verified: 11, honest: 3, status: 'ACTIVE' as const, completion: 47 },
  ],
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  return (
    <PageWrapper>
      <div style={{ padding: '20px 16px' }}>
        {/* Avatar + info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#3D7A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: '28px', color: '#FFFFFF' }}>
            {mockProfile.initials}
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: '#1A3028', marginTop: '12px', marginBottom: '4px' }}>{mockProfile.name}</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: '#6B9E8A', margin: 0 }}>{mockProfile.tagline}</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
          {[
            { value: '2', label: 'Sprints', color: '#1A3028' },
            { value: '35', label: 'Days logged', color: '#3D7A5F' },
            { value: '7', label: 'Best streak', color: '#1A3028' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: '#6B9E8A' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: '#EDF2EF', marginBottom: '20px' }} />

        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 600, color: '#1A3028', margin: '0 0 12px' }}>Sprint history</h2>

        {/* Sprint cards */}
        {mockProfile.sprints.map((sprint) => (
          <div key={sprint.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid #EDF2EF', padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 500, color: '#1A3028' }}>{sprint.title}</span>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '9999px',
                backgroundColor: sprint.status === 'COMPLETED' ? '#D4EDE3' : '#FEF3E8',
                color: sprint.status === 'COMPLETED' ? '#3D7A5F' : '#D97706',
              }}>
                {sprint.status === 'COMPLETED' ? 'Completed' : 'Active'}
              </span>
            </div>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#6B9E8A', margin: '0 0 10px' }}>
              {sprint.days} days · {sprint.verified} verified ✓ · {sprint.honest} honest 🤍
            </p>

            {/* Progress bar */}
            <div style={{ width: '100%', height: '6px', borderRadius: '9999px', backgroundColor: '#D4EDE3', marginBottom: '4px' }}>
              <div style={{ width: `${sprint.completion}%`, height: '100%', borderRadius: '9999px', backgroundColor: sprint.status === 'ACTIVE' ? '#F59E4A' : '#3D7A5F' }} />
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: sprint.status === 'ACTIVE' ? '#F59E4A' : '#3D7A5F', textAlign: 'right', margin: '0 0 8px' }}>
              {sprint.completion}%
            </p>

            <button
              onClick={() => navigate(`/record/${sprint.id}`)}
              style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontStyle: 'italic', color: '#3D7A5F', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              View Sprint Record →
            </button>
          </div>
        ))}

        {/* Settings */}
        <div style={{ marginTop: '24px' }}>
          {[
            { label: 'Reminder time', value: '9:00 PM' },
            { label: 'Visibility default', value: 'Private' },
            { label: 'Notifications', value: 'On' },
          ].map((item, i) => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < 2 ? '1px solid #EDF2EF' : 'none' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#1A3028' }}>{item.label}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#6B9E8A' }}>{item.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
            <button
              onClick={async () => { await signOut(); navigate('/', { replace: true }) }}
              style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#D97706', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
