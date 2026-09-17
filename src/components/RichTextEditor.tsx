import { useEffect, useRef, useId, useState } from 'react'

// =====================================================================
// RichTextEditor — wrapper React attorno a Summernote (jQuery)
// =====================================================================
// Summernote è scelto per compatibilità con l'HTML prodotto dai manuali
// Pienissimo (stesso editor, stesso markup).
//
// Essendo una libreria jQuery, non è un componente React nativo: viene
// caricata dinamicamente da CDN al primo utilizzo e montata/smontata
// manualmente su un nodo DOM tramite ref. Questo evita di aggiungere
// jQuery/Summernote come dipendenze npm (che richiederebbero un
// package-lock.json coerente per "npm ci" su Netlify).
//
// La toolbar espone SOLO le formattazioni ammesse dal sanitizzatore
// HTML (src/lib/sanitize.ts: p, br, strong, em, u, s, blockquote,
// h1-h4, ul, ol, li, a, pre). Immagini disabilitate volutamente:
// verrebbero salvate come base64 dentro il testo, gonfiando il DB e
// venendo comunque rimosse in visualizzazione dal sanitizzatore.
// =====================================================================

const JQUERY_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js'
const SUMMERNOTE_JS_SRC =
  'https://cdnjs.cloudflare.com/ajax/libs/summernote/0.8.20/summernote-lite.min.js'
const SUMMERNOTE_CSS_HREF =
  'https://cdnjs.cloudflare.com/ajax/libs/summernote/0.8.20/summernote-lite.min.css'

interface JQueryStatic {
  (selector: unknown): JQuerySummernoteInstance
  fn: { summernote?: unknown }
}

interface JQuerySummernoteInstance {
  summernote: (...args: unknown[]) => unknown
}

declare global {
  interface Window {
    jQuery?: JQueryStatic
    $?: JQueryStatic
  }
}

let loaderPromise: Promise<void> | null = null

/**
 * Carica jQuery + Summernote (JS e CSS) da CDN, una sola volta per
 * l'intera sessione della pagina, indipendentemente da quanti editor
 * vengono montati. Le chiamate successive riusano la stessa Promise.
 */
function loadSummernote(): Promise<void> {
  if (loaderPromise) return loaderPromise

  loaderPromise = new Promise((resolve, reject) => {
    // Già presente (es. hot reload, o secondo editor nella pagina)
    if (window.jQuery?.fn?.summernote) {
      resolve()
      return
    }

    const loadScript = (src: string) =>
      new Promise<void>((res, rej) => {
        const existing = document.querySelector(`script[src="${src}"]`)
        if (existing) {
          existing.addEventListener('load', () => res())
          existing.addEventListener('error', () => rej(new Error(`Errore caricamento ${src}`)))
          // Se lo script è già stato caricato in passato (cache/hot reload)
          if ((existing as HTMLScriptElement).dataset.loaded === 'true') res()
          return
        }
        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.onload = () => {
          script.dataset.loaded = 'true'
          res()
        }
        script.onerror = () => rej(new Error(`Errore caricamento ${src}`))
        document.head.appendChild(script)
      })

    const loadCss = (href: string) => {
      if (document.querySelector(`link[href="${href}"]`)) return
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      document.head.appendChild(link)
    }

    loadCss(SUMMERNOTE_CSS_HREF)

    loadScript(JQUERY_SRC)
      .then(() => loadScript(SUMMERNOTE_JS_SRC))
      .then(() => resolve())
      .catch(reject)
  })

  return loaderPromise
}

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Scrivi il contenuto qui...',
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const onChangeRef = useRef(onChange)
  const domId = useId().replace(/:/g, '')
  const [loadFailed, setLoadFailed] = useState(false)

  // Tiene sempre l'ultima versione di onChange senza dover
  // reinizializzare Summernote (che perderebbe cursore/focus).
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let cancelled = false
    const node = containerRef.current
    if (!node) return

    loadSummernote()
      .then(() => {
        if (cancelled || !node) return
        const $ = window.jQuery!

        // Contenuto iniziale: Summernote legge l'innerHTML del nodo
        // target al momento dell'init.
        node.innerHTML = content || ''

        $(node).summernote({
          placeholder,
          height: 280,
          minHeight: 200,
          maxHeight: 600,
          disableDragAndDrop: true,
          toolbar: [
            ['style', ['style']],
            ['font', ['bold', 'italic', 'underline', 'strikethrough', 'clear']],
            ['list', ['ul', 'ol']],
            ['insert', ['link']],
            ['edit', ['undo', 'redo']],
          ],
          // Solo i tag di blocco ammessi dal sanitizzatore HTML
          styleTags: ['p', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4'],
          callbacks: {
            onChange: (contents: string) => {
              onChangeRef.current(contents)
            },
            // Immagini disabilitate: nessun upload, nessun base64.
            // Copre sia il bottone (non presente in toolbar) sia il
            // drag&drop/incolla di immagini dagli appunti.
            onImageUpload: () => {
              // no-op volontario: le immagini non sono supportate,
              // usa la sezione "Link e allegati" del task.
            },
          },
        })
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })

    return () => {
      cancelled = true
      const $ = window.jQuery
      if ($ && node && $.fn?.summernote) {
        try {
          $(node).summernote('destroy')
        } catch {
          // ignora: il nodo potrebbe essere già stato rimosso dal DOM
        }
      }
    }
    // Init una sola volta al mount; il contenuto iniziale è quello
    // presente al primo render (comportamento "uncontrolled", uguale
    // a come si comportano la maggior parte degli editor WYSIWYG
    // incapsulati in React).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loadFailed) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-xl p-4 text-sm text-red-700">
        Impossibile caricare l'editor di testo (Summernote). Verifica la
        connessione e ricarica la pagina.
      </div>
    )
  }

  return (
    <div className="pienissimo-summernote">
      <style>{SUMMERNOTE_OVERRIDE_CSS}</style>
      <div id={`summernote-${domId}`} ref={containerRef} />
    </div>
  )
}

// =====================================================================
// CSS di override minimale: il reset di Tailwind (preflight) toglie
// bordi/padding di default ai bottoni, rendendo la toolbar di
// Summernote poco leggibile. Queste regole ripristinano un aspetto
// coerente senza toccare il CSS globale del progetto.
// =====================================================================
const SUMMERNOTE_OVERRIDE_CSS = `
.pienissimo-summernote .note-editor.note-frame {
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
  font-family: inherit;
}
.pienissimo-summernote .note-toolbar {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 6px 8px;
}
.pienissimo-summernote .note-btn {
  border: 1px solid transparent;
  border-radius: 0.375rem;
  background: transparent;
  padding: 4px 8px;
  margin: 1px;
  color: #334155;
  font-size: 13px;
  cursor: pointer;
}
.pienissimo-summernote .note-btn:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}
.pienissimo-summernote .note-btn.active {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}
.pienissimo-summernote .note-editable {
  padding: 14px 16px;
  font-size: 14px;
  line-height: 1.6;
  color: #0f172a;
}
.pienissimo-summernote .note-editable:focus {
  outline: none;
}
.pienissimo-summernote .note-status-output {
  display: none;
}
.pienissimo-summernote .note-dropdown-menu {
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.pienissimo-summernote .note-dropdown-item {
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}
.pienissimo-summernote .note-dropdown-item:hover {
  background: #f1f5f9;
}
`
