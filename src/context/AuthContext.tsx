import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { identify, reset, registerSuper, setPeopleOnce, track, Events } from '../lib/analytics'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Register some constant super-properties on every event
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const platform = /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
      : /Android/i.test(ua) ? 'Android'
      : 'Desktop/Web'
    const standalone = typeof window !== 'undefined'
      && (window.matchMedia('(display-mode: standalone)').matches
        || (navigator as Navigator & { standalone?: boolean }).standalone === true)
    registerSuper({ platform, is_pwa: standalone, app: 'stridewithme' })

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        identify(session.user.id, {
          $email: session.user.email,
          $name: (session.user.user_metadata?.full_name as string | undefined) ?? null,
        })
        setPeopleOnce({ first_seen_at: new Date().toISOString() })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        if (session?.user) {
          identify(session.user.id, {
            $email: session.user.email,
            $name: (session.user.user_metadata?.full_name as string | undefined) ?? null,
          })
          setPeopleOnce({ first_seen_at: new Date().toISOString() })
          if (event === 'SIGNED_IN') track(Events.AuthSigninCompleted, { method: session.user.app_metadata?.provider ?? 'unknown' })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    track(Events.AuthSignedOut)
    await supabase.auth.signOut()
    reset()
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
