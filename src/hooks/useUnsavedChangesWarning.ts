import { useEffect } from 'react'

/**
 * Mostra una conferma del browser se l'utente prova a chiudere
 * la tab o navigare via mentre `dirty === true`.
 * NB: i browser moderni mostrano un messaggio generico,
 * il `text` viene ignorato per motivi di sicurezza.
 */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
}
