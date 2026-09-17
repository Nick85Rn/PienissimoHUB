import { useEffect, useRef, useId, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'
import { describeError } from '@/lib/errors'

// =====================================================================
// RichTextEditor — wrapper React attorno a Summernote (jQuery)
// =====================================================================
// Summernote è scelto per compatibilità con l'HTML prodotto dai manuali
// Pienissimo (stesso editor, stesso markup).
//
// Caricato dinamicamente da CDN (niente dipendenza npm, evita problemi
// di package-lock.json/npm ci su Netlify).
//
// Immagini: caricate su Supabase Storage (bucket pubblico "task-images",
// vedi migration 012) quando l'utente seleziona un file dal proprio PC
// o lo trascina/incolla nell'editor. Il file viene caricato, poi si
// inserisce l'URL pubblico risultante — mai base64 dentro il testo.
// Resta comunque disponibile il tab "Image URL" nel dialog per
// incollare un link esterno già pronto.
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

const IMAGE_BUCKET = 'task-images'
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2 MB, allineato al bucket

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

/**
 * Carica un file immagine su Supabase Storage e restituisce l'URL
 * pubblico. Valida formato e dimensione lato client (il bucket applica
 * comunque gli stessi limiti lato server come seconda linea di difesa).
 */
async function uploadImageToStorage(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Formato immagine non supportato. Usa JPG, PNG, GIF o WEBP.')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Immagine troppo grande. Il limite è 2 MB.')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '31536000', // 1 anno, i file hanno nomi univoci
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) {
    throw new Error('Caricamento riuscito ma URL pubblico non disponibile.')
  }
  return data.publicUrl
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
  const toast = useToast()
  const toastRef = useRef(toast)
  const domId = useId().replace(/:/g, '')
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  useEffect(() => {
    let cancelled = false
    const node = containerRef.current
    if (!node) return

    loadSummernote()
      .then(() => {
        if (cancelled || !node) return
        const $ = window.jQuery!

        node.innerHTML = content || ''

        $(node).summernote({
          placeholder,
          height: 320,
          minHeight: 220,
          maxHeight: 700,
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
          styleTags: ['p', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4'],
          callbacks: {
            onChange: (contents: string) => {
              onChangeRef.current(contents)
            },
            // Gestisce upload da: dialog "Inserisci immagine" (tab
            // file), drag&drop e incolla dagli appunti — Summernote
            // instrada tutti e tre qui. Ogni file viene caricato su
            // Supabase Storage e sostituito con l'URL pubblico
            // risultante, mai inserito come base64.
            onImageUpload: (files: unknown) => {
              const fileList = files as FileList
              Array.from(fileList).forEach((file) => {
                uploadImageToStorage(file)
                  .then((url) => {
                    $(node).summernote('insertImage', url, file.name)
                  })
                  .catch((err) => {
                    toastRef.current.show(
                      describeError(err, "Errore durante il caricamento dell'immagine"),
                      'error'
                    )
                  })
              })
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
          // ignora
        }
      }
    }
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
.pienissimo-summernote .note-codable {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 12.5px;
  padding: 14px 16px;
  color: #0f172a;
  background: #f8fafc;
}
`
