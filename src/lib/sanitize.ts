import DOMPurify from 'dompurify'

// Config restrittiva: ammette solo i tag che usa Tiptap StarterKit + Link.
// Esclude script, iframe, style, on* attributes, javascript: URI.
const SANITIZE_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
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
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
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
