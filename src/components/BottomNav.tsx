import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Users, Plus, FileText, User } from 'lucide-react'

const NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: Users, label: 'Feed', path: '/feed' },
  { icon: null, label: '', path: '/log' }, // center button placeholder
  { icon: FileText, label: 'Record', path: '/record' },
  { icon: User, label: 'Profile', path: '/profile' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  // Hide on onboarding and waiting
  if (['/onboarding', '/waiting'].includes(location.pathname)) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '430px',
        height: '64px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #EDF2EF',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 50,
      }}
    >
      {NAV_ITEMS.map((item, i) => {
        if (i === 2) {
          // Center + button
          return (
            <div key="plus" style={{ transform: 'translateY(-10px)' }}>
              <button
                onClick={() => navigate('/log')}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #76C548 0%, #6BB048 100%)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(107,176,72,0.32), 0 4px 12px rgba(107,176,72,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={24} color="#FFFFFF" />
              </button>
            </div>
          )
        }
        const Icon = item.icon!
        const active = location.pathname === item.path ||
          (item.path === '/dashboard' && location.pathname === '/') ||
          (item.path === '/record' && location.pathname.startsWith('/record'))
        return (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: active ? '#3D7A5F' : '#9BBFB2',
            }}
          >
            <Icon size={20} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontStyle: 'italic', marginTop: '2px' }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
