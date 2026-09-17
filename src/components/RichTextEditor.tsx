import { useEffect, useRef, useId, useState } from 'react'

// =====================================================================
// RichTextEditor — wrapper React attorno a Summernote (jQuery)
// =====================================================================
// Summernote è scelto per compatibilità con l'HTML prodotto dai manuali
// Pienissimo (stesso editor, stesso markup).
//
// Caricato dinamicamente da CDN (niente dipendenza npm, evita problemi
// di package-lock.json/npm ci su Netlify).
//
// Toolbar allargata per supportare guide/manuali impaginati:
// - tabelle
// - immagini SOLO via URL esterno (mai upload/base64: disableDragAndDrop
//   + onImageUpload no-op bloccano il caricamento di file locali; il
//   tab "Image URL" del dialog Inserisci Immagine resta invece
//   utilizzabile perché non passa da onImageUpload)
// - codeview: passa dalla modalità visuale al codice HTML sorgente e
//   viceversa, utile per incollare blocchi HTML già pronti dai manuali
// - color: per evidenziare testo con sfondi colorati (box)
//
// I tag/attributi effettivamente accettati sono definiti in
// src/lib/sanitize.ts — qui esponiamo solo pulsanti per formattazioni
// che il sanitizzatore poi conserva davvero.
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
          height: 320,
          minHeight: 220,
          maxHeight: 700,
          disableDragAndDrop: true,
          toolbar: [
            ['style', ['style']],
            ['font', ['bold', 'italic', 'underline', 'strikethrough', 'clear']],
            ['color', ['color']],
            ['list', ['ul', 'ol']],
            ['table', ['table']],
            ['insert', ['link', 'picture', 'hr']],
            ['view', ['codeview']],
            ['edit', ['undo', 'redo']],
          ],
          // Solo i tag di blocco che il sanitizzatore conserva davvero
          styleTags: ['p', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4'],
          callbacks: {
            onChange: (contents: string) => {
              onChangeRef.current(contents)
            },
            // Blocca SOLO l'upload di file locali (che verrebbero
            // convertiti in base64, gonfiando il DB). L'inserimento
            // immagini via URL esterno (tab "Image URL" nel dialog
            // Inserisci Immagine) NON passa da questo callback e
            // resta quindi utilizzabile.
            onImageUpload: () => {
              // no-op volontario
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
    // presente al primo render (comportamento "uncontrolled").
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
// CSS di override: il reset di Tailwind (preflight) toglie
// bordi/padding di default a bottoni e input, rendendo sia la toolbar
// sia i dialog (inserisci link/immagine/tabella) di Summernote poco
// leggibili. Queste regole ripristinano un aspetto coerente senza
// toccare il CSS globale del progetto.
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
.pienissimo-summernote .note-editable table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}
.pienissimo-summernote .note-editable table td,
.pienissimo-summernote .note-editable table th {
  border: 1px solid #cbd5e1;
  padding: 6px 10px;
}
.pienissimo-summernote .note-editable table th {
  background: #f1f5f9;
  font-weight: 600;
}
.pienissimo-summernote .note-editable img {
  max-width: 100%;
  height: auto;
  border-radius: 0.375rem;
}
.pienissimo-summernote .note-editable hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 16px 0;
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
/* Dialog: Inserisci Link / Immagine / Tabella */
.pienissimo-summernote .note-modal-content {
  border-radius: 0.75rem;
  padding: 16px;
}
.pienissimo-summernote .note-modal-title {
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 8px;
}
.pienissimo-summernote .note-modal-body input[type="text"],
.pienissimo-summernote .note-modal-body input[type="url"] {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 8px 10px;
  font-size: 13px;
  margin-bottom: 8px;
}
.pienissimo-summernote .note-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
.pienissimo-summernote .note-btn-primary {
  background: #1a65a4;
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.pienissimo-summernote .note-btn-primary:hover {
  background: #14507f;
}
.pienissimo-summernote .note-modal-footer .note-close {
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 0.5rem;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
/* Codeview: textarea del sorgente HTML */
.pienissimo-summernote .note-codable {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 12.5px;
  padding: 14px 16px;
  color: #0f172a;
  background: #f8fafc;
}
`
