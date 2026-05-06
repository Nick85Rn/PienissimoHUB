import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single<Profile>()

    if (error) {
      console.error('[auth] loadProfile error:', error.message)
      return null
    }
    return data
  }

  const refresh = async () => {
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    if (data.session?.user.id) {
      const p = await loadProfile(data.session.user.id)
      setProfile(p)
    } else {
      setProfile(null)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    // onAuthStateChange si occuperà del resto
  }

  useEffect(() => {
    let mounted = true

    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user.id) {
        const p = await loadProfile(data.session.user.id)
        if (mounted) setProfile(p)
      }
      if (mounted) setLoading(false)
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      if (newSession?.user.id) {
        const p = await loadProfile(newSession.user.id)
        if (mounted) setProfile(p)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthState = {
    session,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    refresh,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
