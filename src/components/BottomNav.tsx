import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Compass, Plus, Award, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  icon: LucideIcon | null
  label: string
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: Compass, label: 'Feed', path: '/feed' },
  { icon: null, label: '', path: '/log' }, // center button slot
  { icon: Award, label: 'Record', path: '/record' },
  { icon: User, label: 'Profile', path: '/profile' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

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
        height: 'calc(70px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundColor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(184,217,204,0.45)',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 50,
      }}
    >
      {NAV_ITEMS.map((item, i) => {
        if (i === 2) {
          // Center + button
          return (
            <div
              key="plus"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <button
                onClick={() => navigate('/log')}
                aria-label="Log today"
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, #76C548 0%, #6BB048 60%, #5A9A3A 100%)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 22px rgba(107,176,72,0.34), 0 2px 6px rgba(107,176,72,0.18), inset 0 1px 0 rgba(255,255,255,0.20)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'translateY(-14px)',
                  transition: 'transform 0.15s ease',
                  padding: 0,
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(-12px) scale(0.96)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-14px) scale(1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(-14px) scale(1)')}
              >
                <Plus size={26} strokeWidth={2.4} color="#FFFFFF" />
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
            aria-label={item.label}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 0 8px',
              gap: '3px',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '28px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: active
                  ? 'linear-gradient(135deg, rgba(118,197,72,0.18) 0%, rgba(107,176,72,0.10) 100%)'
                  : 'transparent',
                transition: 'background 0.2s ease',
              }}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.2 : 1.7}
                color={active ? '#3D7A5F' : '#9BBFB2'}
                style={{ transition: 'color 0.2s ease, stroke-width 0.2s ease' }}
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                fontWeight: active ? 600 : 500,
                fontStyle: active ? 'normal' : 'italic',
                color: active ? '#3D7A5F' : '#9BBFB2',
                letterSpacing: '0.02em',
                lineHeight: 1,
                transition: 'color 0.2s ease, font-weight 0.2s ease',
              }}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
