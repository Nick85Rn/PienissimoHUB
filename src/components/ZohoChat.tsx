import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

const ZOHO_SCRIPT_ID = 'zsiqscript'
const ZOHO_WIDGET_CODE =
  'siqa49ea5b0d5197175fefec8336b1cb83bb595b3c99202361d96a0bc308ae83775d72f811bfc2c5b0f65d802081e1545ea'
const ZOHO_SRC = `https://salesiq.zohopublic.eu/widget?wc=${ZOHO_WIDGET_CODE}`

interface ZohoSalesIQ {
  ready: () => void
  visitor?: {
    name: (n: string) => void
    email: (e: string) => void
  }
}

declare global {
  interface Window {
    $zoho?: { salesiq?: ZohoSalesIQ }
  }
}

/**
 * Inietta il widget Zoho SalesIQ nella pagina e lo identifica con
 * i dati dell'utente loggato. Si auto-pulisce al logout.
 */
export function ZohoChat() {
  const { profile } = useAuth()

  useEffect(() => {
    // Init oggetto globale come da snippet ufficiale di Zoho
    window.$zoho = window.$zoho ?? {}
    window.$zoho.salesiq = window.$zoho.salesiq ?? {
      ready: () => {
        // Quando il widget è pronto, identifichiamo l'utente
        if (profile && window.$zoho?.salesiq?.visitor) {
          window.$zoho.salesiq.visitor.name(profile.full_name)
          window.$zoho.salesiq.visitor.email(profile.email)
        }
      },
    }

    // Carica lo script una sola volta
    if (!document.getElementById(ZOHO_SCRIPT_ID)) {
      const script = document.createElement('script')
      script.id = ZOHO_SCRIPT_ID
      script.src = ZOHO_SRC
      script.defer = true
      document.body.appendChild(script)
    } else if (profile && window.$zoho?.salesiq?.visitor) {
      // Se lo script è già caricato e cambia utente (es. dopo refresh),
      // riaggiorniamo i dati visitor
      window.$zoho.salesiq.visitor.name(profile.full_name)
      window.$zoho.salesiq.visitor.email(profile.email)
    }
  }, [profile])

  return null
}
