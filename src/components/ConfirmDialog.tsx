import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  const confirmStyles =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : variant === 'warning'
        ? 'bg-amber-600 hover:bg-amber-700 text-white'
        : 'bg-slate-900 hover:bg-slate-800 text-white'

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          {variant !== 'default' && (
            <div
              className={cn(
                'w-10 h-10 rounded-full grid place-items-center shrink-0',
                variant === 'danger' ? 'bg-red-50' : 'bg-amber-50'
              )}
            >
              <AlertTriangle
                size={20}
                className={
                  variant === 'danger' ? 'text-red-600' : 'text-amber-600'
                }
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3
              id="confirm-title"
              className="text-lg font-bold text-slate-900 mb-1"
            >
              {title}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Chiudi"
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'px-4 py-2 text-sm font-semibold rounded-lg transition-colors',
              confirmStyles
            )}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
