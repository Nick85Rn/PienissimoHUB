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
} from 'lucide-react'
import { useEmbedTasks, useEmbedTaskDetail } from '@/hooks/useEmbedSettings'
import { Spinner } from '@/components/Spinner'
import { cn, formatRelative } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/sanitize'
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
 * Niente sidebar, niente login, solo lista task e modal con il dettaglio.
 */
export default function EmbedView() {
  const [searchParams] = useSearchParams()
  const accessKey = searchParams.get('key')

  const { data: tasks, isLoading, error } = useEmbedTasks(accessKey)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

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
        <header className="mb-5">
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

        {!tasks || tasks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-sm text-slate-500">
              Non ci sono ancora aggiornamenti da mostrare.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <EmbedTaskItem
                key={t.id}
                task={t}
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
  onClick,
}: {
  task: {
    id: string
    title: string
    excerpt: string | null
    published_at: string | null
    created_at: string
    category_name: string | null
    category_color_class: string | null
    author_name: string | null
    task_types: string[]
    bug_status: BugStatus | null
    bug_severity: BugSeverity | null
  }
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
                BUG_SEVERITY_COLORS[task.bug_severity]
              )}
            >
              <AlertCircle size={9} />
              {BUG_SEVERITY_LABELS[task.bug_severity]}
            </span>
          )}
          {hasBugfix && task.bug_status && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border',
                BUG_STATUS_COLORS[task.bug_status]
              )}
            >
              <Bug size={9} />
              {BUG_STATUS_LABELS[task.bug_status]}
            </span>
          )}
        </div>

        <h3 className="text-sm md:text-base font-bold text-slate-900 leading-snug mb-1">
          {task.title}
        </h3>

        {task.excerpt && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">
            {task.excerpt}
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
    () => (task?.content ? sanitizeContent(task.content) : ''),
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
