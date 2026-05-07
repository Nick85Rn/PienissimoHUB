import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  Bug,
  AlertCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useTask, useDeleteTask } from '@/hooks/useTasks'
import { useTaskAttachments } from '@/hooks/useTaskAttachments'
import { useMarkTaskRead } from '@/hooks/useReadReceipts'
import { SafeHtml } from '@/components/SafeHtml'
import { CommentsSection } from '@/components/CommentsSection'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageLoader } from '@/components/Spinner'
import {
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  BUG_STATUS_LABELS,
  BUG_STATUS_COLORS,
  BUG_SEVERITY_LABELS,
  BUG_SEVERITY_COLORS,
  DEPARTMENT_LABELS,
  DEPARTMENT_COLORS,
} from '@/types/database'
import { cn, formatDate } from '@/lib/utils'

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const toast = useToast()
  const { data: task, isLoading, error } = useTask(id)
  const { data: attachments = [] } = useTaskAttachments(id)
  const deleteMutation = useDeleteTask()
  const markRead = useMarkTaskRead()
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Quando il task è pubblicato e viene visualizzato, segnalo come letto
  useEffect(() => {
    if (task?.id && task.status === 'published') {
      markRead.mutate(task.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id])

  if (isLoading) return <PageLoader />

  if (error || !task) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Task non trovato
        </h2>
        <p className="text-slate-500 mb-6">
          Il task richiesto non esiste o è stato eliminato.
        </p>
        <Link
          to="/dashboard"
          className="text-pienissimo-blue hover:underline font-medium"
        >
          Torna alla Dashboard
        </Link>
      </div>
    )
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(task.id)
      toast.show('Task eliminato')
      navigate('/dashboard')
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : "Errore nell'eliminazione",
        'error'
      )
    }
  }

  const wasModified =
    task.updated_at && task.created_at && task.updated_at !== task.created_at

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
          aria-label="Torna alla dashboard"
        >
          <ArrowLeft size={18} />
        </button>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              to={`/edit-task/${task.id}`}
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm transition-colors flex items-center gap-2"
            >
              <Edit2 size={14} /> Modifica
            </Link>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="px-3.5 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 shadow-sm transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} /> Elimina
            </button>
          </div>
        )}
      </header>

      {/* Article card */}
      <article className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/40 relative">
          {task.status === 'draft' && (
            <div className="absolute top-3 right-3 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider">
              Bozza
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold',
                TASK_TYPE_COLORS[task.type]
              )}
            >
              {TASK_TYPE_LABELS[task.type]}
            </span>

            {task.category && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-semibold shadow-sm">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    task.category.color_class
                  )}
                />
                {task.category.name}
              </span>
            )}

            {task.version && (
              <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-bold uppercase tracking-wider font-mono">
                v{task.version}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-5">
            {task.title}
          </h1>

          {/* Bug-specific info */}
          {task.type === 'bugfix' && (task.bug_status || task.bug_severity) && (
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {task.bug_status && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border',
                    BUG_STATUS_COLORS[task.bug_status]
                  )}
                >
                  <Bug size={12} />
                  {BUG_STATUS_LABELS[task.bug_status]}
                </span>
              )}
              {task.bug_severity && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold',
                    BUG_SEVERITY_COLORS[task.bug_severity]
                  )}
                >
                  <AlertCircle size={12} />
                  Severità: {BUG_SEVERITY_LABELS[task.bug_severity]}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <User size={14} className="text-slate-400" />
              <span className="font-semibold text-slate-700">
                {task.author?.full_name ?? 'Autore sconosciuto'}
              </span>
              {task.author?.department && (
                <span className="text-xs text-slate-400 ml-0.5">
                  · {DEPARTMENT_LABELS[task.author.department]}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              {formatDate(task.published_at ?? task.created_at, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            {wasModified && (
              <span className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Clock size={12} /> Modificato il{' '}
                {formatDate(task.updated_at)}
              </span>
            )}
          </div>

          {/* Target departments */}
          {task.target_departments.length > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-200/80">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Utile per
              </p>
              <div className="flex flex-wrap gap-1.5">
                {task.target_departments.map((d) => (
                  <span
                    key={d}
                    className={cn(
                      'text-xs font-bold px-2.5 py-1 rounded-md border',
                      DEPARTMENT_COLORS[d]
                    )}
                  >
                    {DEPARTMENT_LABELS[d]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Allegati */}
        {attachments.length > 0 && (
          <div className="bg-blue-50/40 border-b border-blue-100 px-8 md:px-10 py-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Link e allegati
            </p>
            <div className="space-y-2">
              {attachments.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-pienissimo-blue/40 hover:shadow-sm transition-all group"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 grid place-items-center shrink-0">
                    <ExternalLink size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate group-hover:text-pienissimo-blue transition-colors">
                      {a.label}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{a.url}</p>
                  </div>
                  <ExternalLink
                    size={14}
                    className="text-slate-400 group-hover:text-pienissimo-blue transition-colors shrink-0"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-8 md:p-10">
          <SafeHtml html={task.content || '<p>Nessun contenuto</p>'} />
        </div>
      </article>

      {/* Commenti */}
      <CommentsSection taskId={task.id} />

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminare il task?"
        message={`"${task.title}" verrà eliminato in modo permanente, insieme ai suoi commenti.`}
        variant="danger"
        confirmLabel="Elimina"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
