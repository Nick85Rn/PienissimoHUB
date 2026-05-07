import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useUIPrefs } from '@/context/UIPrefsContext'

const ZOHO_SCRIPT_ID = 'zsiqscript'
const ZOHO_WIDGET_CODE =
  'siqa49ea5b0d5197175fefec8336b1cb83bb595b3c99202361d96a0bc308ae83775d72f811bfc2c5b0f65d802081e1545ea'
const ZOHO_SRC = `https://salesiq.zohopublic.eu/widget?wc=${ZOHO_WIDGET_CODE}`

interface ZohoSalesIQ {
  ready?: () => void
  visitor?: {
    name: (n: string) => void
    email: (e: string) => void
  }
  floatbutton?: {
    visible: (state: 'show' | 'hide') => void
  }
  reset?: () => void
}

declare global {
  interface Window {
    $zoho?: { salesiq?: ZohoSalesIQ }
  }
}

/**
 * Inietta il widget Zoho SalesIQ con possibilità di nascondere/mostrare
 * dinamicamente in base alle preferenze utente.
 *
 * Lo script viene caricato la prima volta che `chatEnabled` diventa true,
 * poi viene solo mostrato/nascosto via API floatbutton.visible.
 */
export function ZohoChat() {
  const { profile } = useAuth()
  const { chatEnabled } = useUIPrefs()

  useEffect(() => {
    if (!chatEnabled) {
      // Nasconde il widget se è già caricato
      try {
        window.$zoho?.salesiq?.floatbutton?.visible('hide')
      } catch {
        // ignora
      }
      return
    }

    // chatEnabled === true
    window.$zoho = window.$zoho ?? {}
    window.$zoho.salesiq = window.$zoho.salesiq ?? {
      ready: () => {
        if (profile && window.$zoho?.salesiq?.visitor) {
          window.$zoho.salesiq.visitor.name(profile.full_name)
          window.$zoho.salesiq.visitor.email(profile.email)
        }
        window.$zoho?.salesiq?.floatbutton?.visible('show')
      },
    }

    if (!document.getElementById(ZOHO_SCRIPT_ID)) {
      const script = document.createElement('script')
      script.id = ZOHO_SCRIPT_ID
      script.src = ZOHO_SRC
      script.defer = true
      document.body.appendChild(script)
    } else {
      // Script già caricato in precedenza: re-mostra il widget
      try {
        window.$zoho?.salesiq?.floatbutton?.visible('show')
        if (profile && window.$zoho?.salesiq?.visitor) {
          window.$zoho.salesiq.visitor.name(profile.full_name)
          window.$zoho.salesiq.visitor.email(profile.email)
        }
      } catch {
        // ignora
      }
    }
  }, [profile, chatEnabled])

  return null
}
