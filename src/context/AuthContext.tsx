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

// Timeout di sicurezza: dopo questo tempo togliamo lo spinner
// anche se Supabase non ha risposto, così l'app non resta bloccata.
const INIT_TIMEOUT_MS = 5000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const initDoneRef = useRef(false)

  const loadProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle<Profile>()

      if (error) {
        console.error('[auth] loadProfile error:', error.message)
        return null
      }
      return data
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

    // Timeout di sicurezza: se dopo N secondi siamo ancora bloccati
    // su loading, sblocchiamo comunque l'UI (utente vedrà la pagina
    // di login, oppure la dashboard se la sessione è poi arrivata)
    const timeoutId = setTimeout(() => {
      if (mounted && !initDoneRef.current) {
        console.warn(
          '[auth] init timeout dopo ' + INIT_TIMEOUT_MS + 'ms, sblocco UI'
        )
        initDoneRef.current = true
        setLoading(false)
      }
    }, INIT_TIMEOUT_MS)

    // Single source of truth: onAuthStateChange.
    // Viene chiamato anche all'init con la sessione recuperata dal
    // localStorage, quindi NON serve un getSession() manuale (che
    // creerebbe race condition con il listener).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return

      setSession(newSession)

      // Sblocco lo spinner subito: l'app può già renderizzare il layout.
      // Il profilo lo carico in background.
      if (!initDoneRef.current) {
        initDoneRef.current = true
        setLoading(false)
      }

      // Carica/aggiorna il profilo in background, senza bloccare l'UI
      if (newSession?.user.id) {
        void loadProfile(newSession.user.id).then((p) => {
          if (mounted) setProfile(p)
        })
      } else {
        setProfile(null)
      }

      // log per debug
      if (event !== 'INITIAL_SESSION') {
        console.info('[auth] event:', event)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
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
