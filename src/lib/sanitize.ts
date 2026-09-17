import DOMPurify from 'dompurify'

// Config allargata per supportare manuali/guide impaginate: tabelle,
// immagini (solo via URL esterno, mai base64), div/span con stile
// inline per box colorati. Esclude sempre script, iframe, on*
// attributes, javascript: URI — DOMPurify li rimuove comunque anche
// se non sono nella blacklist esplicita, perché semplicemente non
// sono nella ALLOWED_TAGS/ALLOWED_ATTR qui sotto.
//
// NOTA IMPORTANTE sullo stile: le classi Tailwind (es. "bg-blue-500")
// scritte dentro il contenuto NON funzionano, perché Tailwind genera
// il CSS solo per le classi trovate nel codice sorgente in fase di
// build — una classe scritta dentro un task salvato nel database non
// avrà mai lo stile corrispondente. Per box colorati, sfondi,
// bordi, ecc. usare SEMPRE l'attributo style="..." con CSS inline
// (es. style="background:#fef3c7;padding:12px;border-radius:8px").
const SANITIZE_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    // Testo base
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'code',
    'pre',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'a',
    'hr',
    // Tabelle
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    // Immagini
    'img',
    // Contenitori per box/impaginazione (guide, manuali)
    'div',
    'span',
  ],
  ALLOWED_ATTR: [
    'href',
    'target',
    'rel',
    'class',
    'src',
    'alt',
    'width',
    'height',
    'style',
    'colspan',
    'rowspan',
  ],
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  // forza target=_blank e rel=noopener su tutti i link
  ADD_ATTR: ['target', 'rel'],
}

/**
 * Sanitizza HTML in entrata per renderlo sicuro da iniettare via
 * dangerouslySetInnerHTML.
 *
 * USARE SEMPRE prima di renderizzare contenuto utente.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, SANITIZE_CONFIG) as string
}

/**
 * Estrae plain text da una stringa HTML, in modo sicuro (DOMParser, non regex).
 * Usato per generare excerpt e per la ricerca full-text lato client.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent?.trim() ?? ''
}

/**
 * Genera un excerpt di max `maxLength` caratteri da contenuto HTML.
 */
export function makeExcerpt(html: string, maxLength = 180): string {
  const plain = htmlToPlainText(html)
  if (plain.length <= maxLength) return plain
  return plain.slice(0, maxLength).trimEnd() + '…'
}
