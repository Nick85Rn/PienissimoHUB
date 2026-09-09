/**
 * Estrae un messaggio leggibile da un errore di qualsiasi tipo.
 *
 * Perché serve: gli errori di Supabase (PostgrestError, FunctionsError,
 * ecc.) spesso NON sono istanze di `Error` in JavaScript, quindi un
 * controllo tipo `err instanceof Error` fallisce silenziosamente e si
 * perde il messaggio vero (es. quello sollevato da un trigger Postgres
 * con RAISE EXCEPTION).
 *
 * Questa funzione prova, in ordine:
 *   1. err.message se è una stringa (copre Error, PostgrestError, ecc.)
 *   2. err.error_description o err.error (alcuni client OAuth/edge functions)
 *   3. la stringificazione dell'oggetto, se è un oggetto semplice
 *   4. un messaggio di fallback
 */
export function getErrorMessage(err: unknown, fallback = 'Errore sconosciuto'): string {
  if (err instanceof Error && err.message) {
    return err.message
  }

  if (typeof err === 'string' && err.trim()) {
    return err
  }

  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>

    if (typeof obj.message === 'string' && obj.message.trim()) {
      return obj.message
    }
    if (typeof obj.error_description === 'string' && obj.error_description.trim()) {
      return obj.error_description
    }
    if (typeof obj.error === 'string' && obj.error.trim()) {
      return obj.error
    }
    if (typeof obj.details === 'string' && obj.details.trim()) {
      return obj.details
    }

    // Ultimo tentativo: prova a stringificare in modo leggibile
    try {
      const json = JSON.stringify(obj)
      if (json && json !== '{}') return json
    } catch {
      // ignora, cade nel fallback
    }
  }

  return fallback
}

/**
 * Traduce messaggi tecnici noti (vincoli DB, trigger) in testo
 * comprensibile per l'utente. Se il messaggio non è riconosciuto,
 * lo restituisce invariato (con un prefisso opzionale).
 */
export function friendlyErrorMessage(rawMessage: string): string {
  const known: { match: string; friendly: string }[] = [
    {
      match: 'Massimo 3 task pinnabili',
      friendly:
        'Puoi pinnare al massimo 3 task contemporaneamente nell\'embed pubblico. Togli il pin a un altro task prima di pinnarne uno nuovo.',
    },
    {
      match: 'deve essere visibile nell\'embed per poter essere pinnato',
      friendly:
        'Un task deve essere visibile nell\'embed pubblico prima di poter essere pinnato.',
    },
    {
      match: 'duplicate key value violates unique constraint',
      friendly: 'Esiste già un elemento con questo valore. Usa un nome diverso.',
    },
    {
      match: 'violates foreign key constraint',
      friendly: 'Uno degli elementi collegati non esiste più. Ricarica la pagina e riprova.',
    },
    {
      match: 'JWT expired',
      friendly: 'La sessione è scaduta. Ricarica la pagina ed effettua di nuovo il login.',
    },
    {
      match: 'row-level security',
      friendly: 'Non hai i permessi necessari per questa operazione.',
    },
  ]

  const hit = known.find((k) => rawMessage.includes(k.match))
  return hit ? hit.friendly : rawMessage
}

/**
 * Scorciatoia: estrae + traduce in un colpo solo.
 */
export function describeError(err: unknown, fallback = 'Errore sconosciuto'): string {
  const raw = getErrorMessage(err, fallback)
  return friendlyErrorMessage(raw)
}
