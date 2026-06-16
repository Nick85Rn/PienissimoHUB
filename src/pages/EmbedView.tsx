import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Calendar,
  User,
  Bug,
  AlertCircle,
  X,
  ExternalLink,
  Lock,
  Search,
  Filter,
} from 'lucide-react'
import {
  useEmbedTasks,
  useEmbedTaskDetail,
  type EmbedTask,
} from '@/hooks/useEmbedSettings'
import { Spinner } from '@/components/Spinner'
import { cn, formatRelative } from '@/lib/utils'
import { sanitizeHtml, htmlToPlainText } from '@/lib/sanitize'
import {
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  BUG_STATUS_LABELS,
  BUG_STATUS_COLORS,
  BUG_SEVERITY_LABELS,
  BUG_SEVERITY_COLORS,
  type TaskType,
  type BugStatus,
  type BugSeverity,
} from '@/types/database'

/**
 * Pagina embed pubblica: viene caricata in iframe dal backoffice
 * Pienissimo PRO. URL: /embed?key=ACCESS_KEY
 *
 * Include: barra di ricerca, filtri per tipo e categoria, contatore.
 * Tutto il filtraggio è client-side perché operiamo su pochi task (max 100).
 */
export default function EmbedView() {
  const [searchParams] = useSearchParams()
  const accessKey = searchParams.get('key')

  const { data: tasks, isLoading, error } = useEmbedTasks(accessKey)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Calcola la lista filtrata
  const filteredTasks = useMemo(() => {
    if (!tasks) return []
    const q = search.trim().toLowerCase()

    return tasks.filter((t) => {
      // Filtro tipo
      if (activeType && !t.task_types.includes(activeType)) {
        return false
      }
      // Filtro categoria
      if (activeCategory) {
        if (activeCategory === '__none__' && t.category_name) return false
        if (activeCategory !== '__none__' && t.category_name !== activeCategory) {
          return false
        }
      }
      // Search testo (titolo + excerpt + contenuto plain)
      if (q) {
        const inTitle = t.title.toLowerCase().includes(q)
        const inExcerpt = (t.excerpt ?? '').toLowerCase().includes(q)
        const contentPlain = htmlToPlainText(t.content ?? '').toLowerCase()
        const inContent = contentPlain.includes(q)
        if (!inTitle && !inExcerpt && !inContent) return false
      }
      return true
    })
  }, [tasks, activeType, activeCategory, search])

  // Tipi presenti almeno una volta nei task caricati (per le pillole)
  const availableTypes = useMemo(() => {
    if (!tasks) return [] as string[]
    const set = new Set<string>()
    for (const t of tasks) {
      for (const tt of t.task_types) set.add(tt)
    }
    return Array.from(set)
  }, [tasks])

  // Categorie presenti
  const availableCategories = useMemo(() => {
    if (!tasks) return [] as { name: string; color: string | null }[]
    const map = new Map<string, string | null>()
    let hasNone = false
    for (const t of tasks) {
      if (t.category_name) {
        map.set(t.category_name, t.category_color_class ?? null)
      } else {
        hasNone = true
      }
    }
    const list = Array.from(map.entries()).map(([name, color]) => ({
      name,
      color,
    }))
    list.sort((a, b) => a.name.localeCompare(b.name))
    // "Senza categoria" in fondo se presente
    if (hasNone) {
      list.push({ name: '__none__', color: null })
    }
    return list
  }, [tasks])

  const hasActiveFilters =
    Boolean(search) || Boolean(activeType) || Boolean(activeCategory)

  const clearFilters = () => {
    setSearch('')
    setActiveType(null)
    setActiveCategory(null)
  }

  // -------- Stati di errore / loading / vuoto --------
  if (!accessKey) {
    return <ErrorScreen message="Chiave di accesso mancante." />
  }

  if (error) {
    const msg = error instanceof Error ? error.message : 'Errore sconosciuto'
    return (
      <ErrorScreen
        message={
          msg.toLowerCase().includes('chiave')
            ? 'Chiave di accesso non valida.'
            : msg.toLowerCase().includes('disabilitato')
              ? 'Embed temporaneamente disabilitato.'
              : `Errore: ${msg}`
        }
      />
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        {/* Header */}
        <header className="mb-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Pienissimo PRO" className="h-8 w-auto" />
            <div>
              <h1 className="text-base md:text-lg font-bold text-slate-900">
                Novità Pienissimo PRO
              </h1>
              <p className="text-xs text-slate-500">
                Ultimi aggiornamenti e release
              </p>
            </div>
          </div>
        </header>

        {/* Search + filtri */}
        {tasks && tasks.length > 0 && (
          <div className="mb-4 space-y-2.5">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-2.5 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Cerca per titolo, contenuto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pienissimo-blue/20 focus:border-pienissimo-blue transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                  aria-label="Pulisci ricerca"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Pillole tipo */}
            {availableTypes.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <Pill
                  active={activeType === null}
                  onClick={() => setActiveType(null)}
                >
                  Tutti i tipi
                </Pill>
                {availableTypes.map((t) => {
                  const key = t as TaskType
                  return (
                    <Pill
                      key={t}
                      active={activeType === t}
                      onClick={() => setActiveType(activeType === t ? null : t)}
                    >
                      {TASK_TYPE_LABELS[key] ?? t}
                    </Pill>
                  )
                })}
              </div>
            )}

            {/* Pillole categoria */}
            {availableCategories.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <Pill
                  active={activeCategory === null}
                  onClick={() => setActiveCategory(null)}
                >
                  Tutte le categorie
                </Pill>
                {availableCategories.map((c) => (
                  <Pill
                    key={c.name}
                    active={activeCategory === c.name}
                    onClick={() =>
                      setActiveCategory(activeCategory === c.name ? null : c.name)
                    }
                  >
                    {c.color && c.name !== '__none__' && (
                      <span
                        className={cn('w-1.5 h-1.5 rounded-full', c.color)}
                      />
                    )}
                    {c.name === '__none__' ? 'Senza categoria' : c.name}
                  </Pill>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contatore + clear filters */}
        {tasks && tasks.length > 0 && (
          <div className="flex items-center justify-between mb-2.5 text-xs text-slate-500 px-1">
            <span>
              {filteredTasks.length === 0
                ? hasActiveFilters
                  ? 'Nessun risultato'
                  : 'Nessun aggiornamento'
                : `${filteredTasks.length} ${
                    filteredTasks.length === 1 ? 'aggiornamento' : 'aggiornamenti'
                  }${
                    hasActiveFilters && filteredTasks.length !== tasks.length
                      ? ` su ${tasks.length}`
                      : ''
                  }`}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-pienissimo-blue hover:text-pienissimo-dark font-semibold"
              >
                <Filter size={11} /> Pulisci filtri
              </button>
            )}
          </div>
        )}

        {/* Lista o stato vuoto */}
        {!tasks || tasks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-sm text-slate-500">
              Non ci sono ancora aggiornamenti da mostrare.
            </p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-sm text-slate-500">
              Nessun aggiornamento corrisponde ai filtri.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 text-xs font-semibold text-pienissimo-blue hover:text-pienissimo-dark"
            >
              Pulisci filtri
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredTasks.map((t) => (
              <EmbedTaskItem
                key={t.id}
                task={t}
                searchHighlight={search.trim()}
                onClick={() => setSelectedTaskId(t.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {selectedTaskId && (
        <EmbedTaskModal
          accessKey={accessKey}
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  )
}

// =====================================================================
// Riga task nella lista
// =====================================================================
function EmbedTaskItem({
  task,
  searchHighlight,
  onClick,
}: {
  task: EmbedTask
  searchHighlight: string
  onClick: () => void
}) {
  const hasBugfix = task.task_types.includes('bugfix')
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:border-pienissimo-blue/50 hover:shadow-sm transition-all"
      >
        <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
          {task.task_types.map((t) => {
            const key = t as TaskType
            return (
              <span
                key={t}
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                  TASK_TYPE_COLORS[key] ?? 'bg-slate-100 text-slate-700'
                )}
              >
                {TASK_TYPE_LABELS[key] ?? t}
              </span>
            )
          })}
          {task.category_name && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-semibold">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  task.category_color_class ?? 'bg-slate-400'
                )}
              />
              {task.category_name}
            </span>
          )}
          {hasBugfix && task.bug_severity && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                BUG_SEVERITY_COLORS[task.bug_severity as BugSeverity]
              )}
            >
              <AlertCircle size={9} />
              {BUG_SEVERITY_LABELS[task.bug_severity as BugSeverity]}
            </span>
          )}
          {hasBugfix && task.bug_status && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border',
                BUG_STATUS_COLORS[task.bug_status as BugStatus]
              )}
            >
              <Bug size={9} />
              {BUG_STATUS_LABELS[task.bug_status as BugStatus]}
            </span>
          )}
        </div>

        <h3 className="text-sm md:text-base font-bold text-slate-900 leading-snug mb-1">
          <Highlight text={task.title} query={searchHighlight} />
        </h3>

        {task.excerpt && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">
            <Highlight text={task.excerpt} query={searchHighlight} />
          </p>
        )}

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            {formatRelative(task.published_at ?? task.created_at)}
          </span>
          {task.author_name && (
            <span className="flex items-center gap-1">
              <User size={10} />
              {task.author_name}
            </span>
          )}
        </div>
      </button>
    </li>
  )
}

// =====================================================================
// Modal dettaglio
// =====================================================================
function EmbedTaskModal({
  accessKey,
  taskId,
  onClose,
}: {
  accessKey: string
  taskId: string
  onClose: () => void
}) {
  const { data: task, isLoading, error } = useEmbedTaskDetail(accessKey, taskId)

  const sanitized = useMemo(
    () => (task?.content ? sanitizeHtml(task.content) : ''),
    [task?.content]
  )

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-slide-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : error || !task ? (
          <div className="p-6">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                aria-label="Chiudi"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-red-600">
              {error instanceof Error
                ? error.message
                : 'Task non disponibile.'}
            </p>
          </div>
        ) : (
          <>
            <header className="px-5 md:px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center flex-wrap gap-1.5 mb-2">
                    {task.task_types.map((t) => {
                      const key = t as TaskType
                      return (
                        <span
                          key={t}
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                            TASK_TYPE_COLORS[key] ??
                              'bg-slate-100 text-slate-700'
                          )}
                        >
                          {TASK_TYPE_LABELS[key] ?? t}
                        </span>
                      )
                    })}
                    {task.version && (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
                        v{task.version}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
                    {task.title}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formatRelative(task.published_at ?? task.created_at)}
                    </span>
                    {task.author_name && (
                      <span className="flex items-center gap-1">
                        <User size={11} />
                        {task.author_name}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors shrink-0"
                  aria-label="Chiudi"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-5 md:px-6 py-5">
              <div
                className="prose prose-sm max-w-none prose-slate"
                dangerouslySetInnerHTML={{ __html: sanitized }}
              />

              {task.attachments && task.attachments.length > 0 && (
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Link e allegati
                  </p>
                  <ul className="space-y-1.5">
                    {task.attachments.map((a, i) => (
                      <li key={i}>
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-pienissimo-blue hover:text-pienissimo-dark font-medium"
                        >
                          <ExternalLink size={12} />
                          {a.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// =====================================================================
// Componenti di supporto
// =====================================================================

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors',
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
      )}
    >
      {children}
    </button>
  )
}

/**
 * Evidenzia le occorrenze di `query` dentro `text`.
 * Match case-insensitive. Sicuro per uso in JSX (niente dangerouslySetInnerHTML).
 */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const q = query.trim()
  if (!q) return <>{text}</>

  // Escape regex special chars
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className="bg-yellow-200 text-slate-900 px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// =====================================================================
// Schermata di errore (chiave mancante/invalida/embed disabilitato)
// =====================================================================
function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm text-center shadow-sm">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 grid place-items-center mx-auto mb-3">
          <Lock size={18} />
        </div>
        <p className="text-sm text-slate-700 font-semibold mb-1">
          Accesso non disponibile
        </p>
        <p className="text-xs text-slate-500">{message}</p>
      </div>
    </div>
  )
}
