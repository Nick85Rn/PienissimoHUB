import { useState } from 'react'
import { Send, Trash2, MessageSquare } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import {
  useComments,
  useCreateComment,
  useDeleteComment,
} from '@/hooks/useComments'
import { ConfirmDialog } from './ConfirmDialog'
import { Spinner } from './Spinner'
import { cn, formatRelative, initialsOf } from '@/lib/utils'
import type { CommentWithAuthor } from '@/types/database'

export function CommentsSection({ taskId }: { taskId: string }) {
  const { profile, isAdmin } = useAuth()
  const toast = useToast()
  const { data: comments = [], isLoading } = useComments(taskId)
  const createMutation = useCreateComment()
  const deleteMutation = useDeleteComment()

  const [content, setContent] = useState('')
  const [toDelete, setToDelete] = useState<CommentWithAuthor | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    try {
      await createMutation.mutateAsync({ task_id: taskId, content: content.trim() })
      setContent('')
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Errore nel salvataggio',
        'error'
      )
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await deleteMutation.mutateAsync({ id: toDelete.id, task_id: taskId })
      setToDelete(null)
      toast.show('Commento eliminato')
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Errore nella cancellazione',
        'error'
      )
    }
  }

  return (
    <section className="mt-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <header className="px-6 md:px-8 py-5 border-b border-slate-100 flex items-center gap-3">
        <MessageSquare size={18} className="text-slate-400" />
        <h2 className="text-base font-bold text-slate-900">
          Commenti
          <span className="ml-2 text-slate-400 font-medium">
            {comments.length}
          </span>
        </h2>
      </header>

      <div className="px-6 md:px-8 py-6 space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Nessun commento ancora. Sii il primo a scrivere.
          </p>
        ) : (
          comments.map((c) => {
            const isOwn = c.author_id === profile?.id
            const canDelete = isOwn || isAdmin
            return (
              <div key={c.id} className="flex gap-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full grid place-items-center font-bold text-xs shrink-0',
                    isOwn
                      ? 'bg-pienissimo-blue text-white'
                      : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {initialsOf(c.author?.full_name ?? '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-900">
                      {c.author?.full_name ?? 'Sconosciuto'}
                    </span>
                    {c.author?.department && (
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {c.author.department.name}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-400">
                      {formatRelative(c.created_at)}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setToDelete(c)}
                        className="ml-auto p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        aria-label="Elimina commento"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Compose */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="px-6 md:px-8 py-5 border-t border-slate-100 bg-slate-50/50"
      >
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-pienissimo-blue text-white grid place-items-center font-bold text-xs shrink-0">
            {initialsOf(profile?.full_name ?? '')}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Scrivi un commento o chiedi un chiarimento..."
              rows={2}
              maxLength={2000}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pienissimo-blue/20 focus:border-pienissimo-blue resize-none transition-all"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">
                {content.length}/2000
              </span>
              <button
                type="submit"
                disabled={!content.trim() || createMutation.isPending}
                className="px-4 py-2 bg-pienissimo-blue text-white rounded-lg text-sm font-semibold hover:bg-pienissimo-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={14} />
                {createMutation.isPending ? 'Invio...' : 'Invia'}
              </button>
            </div>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminare il commento?"
        message="Questa azione è permanente."
        variant="danger"
        confirmLabel="Elimina"
        onConfirm={() => void handleDelete()}
        onCancel={() => setToDelete(null)}
      />
    </section>
  )
}
