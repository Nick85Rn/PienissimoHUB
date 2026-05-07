import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ProfileWithDepartment } from '@/types/database'

interface AuthState {
  session: Session | null
  profile: ProfileWithDepartment | null
  loading: boolean
  isAdmin: boolean // include master
  isMaster: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const INIT_TIMEOUT_MS = 5000

/**
 * Self-heal: se Supabase non risponde entro X ms,
 * cancella i token corrotti dal localStorage e ricarica.
 * Evita il loop "loading infinito dopo refresh".
 */
function purgeSupabaseStorage() {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('sb-') || k.includes('supabase'))) {
        keys.push(k)
      }
    }
    keys.forEach((k) => localStorage.removeItem(k))
    console.warn('[auth] purge supabase storage:', keys)
  } catch (err) {
    console.error('[auth] purge error:', err)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileWithDepartment | null>(null)
  const [loading, setLoading] = useState(true)
  const initDoneRef = useRef(false)

  const loadProfile = async (
    userId: string
  ): Promise<ProfileWithDepartment | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          department:department_id(name, color_class)
        `)
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[auth] loadProfile error:', error.message)
        return null
      }
      return (data ?? null) as unknown as ProfileWithDepartment | null
    } catch (err) {
      console.error('[auth] loadProfile exception:', err)
      return null
    }
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
  }

  useEffect(() => {
    let mounted = true

    // Self-healing timeout: se onAuthStateChange non viene mai chiamato
    // (token corrotto / deadlock), puliamo localStorage e ricarichiamo
    // automaticamente la pagina. L'utente vedrà la schermata di login.
    const timeoutId = setTimeout(() => {
      if (mounted && !initDoneRef.current) {
        console.warn(
          '[auth] init timeout dopo ' +
            INIT_TIMEOUT_MS +
            'ms — pulisco storage e ricarico'
        )
        purgeSupabaseStorage()
        // Reload solo se non siamo già sulla pagina di login
        if (!window.location.pathname.startsWith('/login')) {
          window.location.replace('/login')
        } else {
          initDoneRef.current = true
          setLoading(false)
        }
      }
    }, INIT_TIMEOUT_MS)

    // Single source of truth: onAuthStateChange.
    // Viene chiamato anche all'init (event 'INITIAL_SESSION') con la
    // sessione recuperata dal localStorage.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return

      console.info('[auth] event:', event, 'session?', Boolean(newSession))

      setSession(newSession)

      if (!initDoneRef.current) {
        initDoneRef.current = true
        setLoading(false)
      }

      if (newSession?.user.id) {
        void loadProfile(newSession.user.id).then((p) => {
          if (mounted) setProfile(p)
        })
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const role = profile?.role
  const value: AuthState = {
    session,
    profile,
    loading,
    isAdmin: role === 'admin' || role === 'master',
    isMaster: role === 'master',
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
