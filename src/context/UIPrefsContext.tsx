import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

interface UIPreferences {
  chatEnabled: boolean
  toggleChat: () => void
  setChatEnabled: (v: boolean) => void
}

const UIPrefsContext = createContext<UIPreferences | null>(null)

const STORAGE_KEY = 'pienissimo:ui-prefs'

interface StoredPrefs {
  chatEnabled?: boolean
}

function loadPrefs(): StoredPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredPrefs) : {}
  } catch {
    return {}
  }
}

function savePrefs(p: StoredPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // localStorage potrebbe non essere disponibile (sandbox, incognito)
  }
}

export function UIPrefsProvider({ children }: { children: ReactNode }) {
  const [chatEnabled, setChatEnabledState] = useState<boolean>(
    () => loadPrefs().chatEnabled ?? true
  )

  useEffect(() => {
    savePrefs({ chatEnabled })
  }, [chatEnabled])

  const value: UIPreferences = {
    chatEnabled,
    toggleChat: () => setChatEnabledState((v) => !v),
    setChatEnabled: setChatEnabledState,
  }

  return (
    <UIPrefsContext.Provider value={value}>{children}</UIPrefsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUIPrefs(): UIPreferences {
  const ctx = useContext(UIPrefsContext)
  if (!ctx) throw new Error('useUIPrefs must be used within UIPrefsProvider')
  return ctx
}
