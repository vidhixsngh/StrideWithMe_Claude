import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'

interface Props {
  children: React.ReactNode
  showNav?: boolean
}

export default function PageWrapper({ children, showNav = true }: Props) {
  const location = useLocation()
  const hideNav = ['/onboarding', '/waiting'].includes(location.pathname)
  const shouldShowNav = showNav && !hideNav

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #EAF5F0 0%, #F0F7F4 35%, #F5F0E8 100%)',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          maxWidth: '430px',
          margin: '0 auto',
          paddingBottom: shouldShowNav ? '80px' : '0',
        }}
      >
        {children}
      </div>
      {shouldShowNav && <BottomNav />}
    </div>
  )
}
