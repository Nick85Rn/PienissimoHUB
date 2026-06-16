import { useEffect, useState } from 'react'
import {
  Save,
  Code,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import {
  useEmbedSettings,
  useUpdateEmbedSettings,
  useRegenerateAccessKey,
} from '@/hooks/useEmbedSettings'
import { useCategories } from '@/hooks/useCategories'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Spinner } from '@/components/Spinner'
import { cn } from '@/lib/utils'
import {
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  type TaskType,
} from '@/types/database'

const ALL_TASK_TYPES: TaskType[] = [
  'release',
  'aggiornamento',
  'bugfix',
  'guida',
  'comunicazione',
]

export default function EmbedSettings() {
  const toast = useToast()
  const { data: settings, isLoading } = useEmbedSettings()
  const { data: categories = [] } = useCategories()
  const updateMutation = useUpdateEmbedSettings()
  const regenMutation = useRegenerateAccessKey()

  const [enabled, setEnabled] = useState(false)
  const [allowedTypes, setAllowedTypes] = useState<TaskType[]>([])
  const [allowedCategoryIds, setAllowedCategoryIds] = useState<string[]>([])
  const [maxItems, setMaxItems] = useState(30)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState<'key' | 'snippet' | null>(null)
  const [confirmRegen, setConfirmRegen] = useState(false)

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled)
      setAllowedTypes(settings.allowed_types ?? [])
      setAllowedCategoryIds(settings.allowed_category_ids ?? [])
      setMaxItems(settings.max_items)
    }
  }, [settings])

  const isDirty = settings
    ? enabled !== settings.enabled ||
      maxItems !== settings.max_items ||
      allowedTypes.length !== (settings.allowed_types?.length ?? 0) ||
      !allowedTypes.every((t) => settings.allowed_types?.includes(t)) ||
      allowedCategoryIds.length !== (settings.allowed_category_ids?.length ?? 0) ||
      !allowedCategoryIds.every((id) => settings.allowed_category_ids?.includes(id))
    : false

  useUnsavedChangesWarning(isDirty)

  const toggleType = (t: TaskType) => {
    setAllowedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  const toggleCategory = (id: string) => {
    setAllowedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        enabled,
        allowed_types: allowedTypes,
        allowed_category_ids: allowedCategoryIds,
        max_items: maxItems,
      })
      toast.show('Impostazioni embed salvate')
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Errore salvataggio',
        'error'
      )
    }
  }

  const handleRegenerate = async () => {
    try {
      await regenMutation.mutateAsync()
      setConfirmRegen(false)
      toast.show('Chiave rigenerata. Aggiorna il backoffice!')
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Errore rigenerazione',
        'error'
      )
    }
  }

  const copyToClipboard = async (text: string, kind: 'key' | 'snippet') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      toast.show('Impossibile copiare', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  const accessKey = settings?.access_key ?? ''
  const embedUrl = `${window.location.origin}/embed?key=${accessKey}`
  const htmlSnippet = `<iframe
  src="${embedUrl}"
  width="100%"
  height="600"
  style="border:none;border-radius:8px"
  title="Novità Pienissimo PRO"
></iframe>`

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Embed pubblico
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Configura la vista incorporabile nel backoffice Pienissimo PRO.
        </p>
      </header>

      <div className="space-y-6">
        {/* Toggle abilitato */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-full grid place-items-center shrink-0',
                  enabled
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-500'
                )}
              >
                <Code size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Embed pubblico
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {enabled
                    ? 'Attivo: i clienti col backoffice possono vedere gli aggiornamenti.'
                    : 'Disabilitato: l\'iframe nel backoffice mostrerà errore.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
                enabled ? 'bg-pienissimo-blue' : 'bg-slate-200'
              )}
            >
              <span
                className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform mt-0.5',
                  enabled ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>

        {/* Chiave di accesso */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Chiave di accesso
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Da incollare nell'URL dell'iframe del backoffice. Cambiala
            periodicamente o se sospetti che sia compromessa.
          </p>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={accessKey}
                readOnly
                className="form-input font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-2.5 p-1 text-slate-400 hover:text-slate-700"
                aria-label={showKey ? 'Nascondi' : 'Mostra'}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void copyToClipboard(accessKey, 'key')}
              className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              {copied === 'key' ? <Check size={14} /> : <Copy size={14} />}
              {copied === 'key' ? 'Copiato' : 'Copia'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRegen(true)}
              className="px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Rigenera
            </button>
          </div>
        </div>

        {/* Filtri visibilità */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-900">
            Cosa vedono i clienti
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Tipi di task consentiti
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_TASK_TYPES.map((t) => {
                const active = allowedTypes.includes(t)
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => toggleType(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                      active
                        ? cn(TASK_TYPE_COLORS[t], 'border-current')
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {TASK_TYPE_LABELS[t]}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Solo i task che includono almeno uno di questi tipi saranno
              visibili. Se non selezioni niente, l'embed sarà vuoto.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Categorie consentite
            </label>
            {categories.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Nessuna categoria definita.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = allowedCategoryIds.includes(c.id)
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => toggleCategory(c.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold border transition-colors',
                        active
                          ? 'bg-pienissimo-blue text-white border-pienissimo-blue'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          active ? 'bg-white' : c.color_class
                        )}
                      />
                      {c.name}
                    </button>
                  )
                })}
              </div>
            )}
            <p className="mt-1.5 text-xs text-slate-400">
              Se non selezioni nessuna categoria, vengono mostrati i task di{' '}
              <strong>tutte</strong> le categorie (incluso quelli senza categoria).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Numero massimo di task da mostrare
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxItems}
              onChange={(e) =>
                setMaxItems(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 30)))
              }
              className="form-input w-32"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Vengono mostrati gli ultimi N task pubblicati (1-100).
            </p>
          </div>
        </div>

        {/* Snippet HTML */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900">
              Codice HTML per il backoffice
            </h3>
            <button
              type="button"
              onClick={() => void copyToClipboard(htmlSnippet, 'snippet')}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              {copied === 'snippet' ? <Check size={12} /> : <Copy size={12} />}
              {copied === 'snippet' ? 'Copiato' : 'Copia snippet'}
            </button>
          </div>
          <p className="text-sm text-slate-500 mb-3">
            Incolla questo in una pagina del backoffice Pienissimo PRO.
          </p>
          <pre className="bg-slate-900 text-slate-100 text-xs font-mono p-4 rounded-xl overflow-x-auto">
            {htmlSnippet}
          </pre>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-pienissimo-blue hover:text-pienissimo-dark"
            >
              <ExternalLink size={14} />
              Apri anteprima embed in nuova tab
            </a>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || updateMutation.isPending}
            className="px-4 py-2 bg-pienissimo-blue text-white rounded-lg text-sm font-semibold hover:bg-pienissimo-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {updateMutation.isPending ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRegen}
        title="Rigenerare la chiave di accesso?"
        message="La vecchia chiave smetterà di funzionare immediatamente. Dovrai aggiornare il codice HTML nel backoffice con la nuova chiave."
        variant="warning"
        confirmLabel="Rigenera"
        onConfirm={() => void handleRegenerate()}
        onCancel={() => setConfirmRegen(false)}
      />
    </div>
  )
}
