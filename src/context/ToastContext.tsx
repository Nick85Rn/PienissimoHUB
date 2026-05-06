import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastState {
  show: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastState | null>(null)

const VARIANT_STYLES: Record<ToastVariant, { bg: string; icon: ReactNode }> = {
  success: {
    bg: 'bg-slate-900',
    icon: <CheckCircle2 size={18} className="text-emerald-400" />,
  },
  error: {
    bg: 'bg-red-600',
    icon: <AlertCircle size={18} className="text-white" />,
  },
  info: {
    bg: 'bg-slate-900',
    icon: <Info size={18} className="text-blue-300" />,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = crypto.randomUUID()
      setToasts((t) => [...t, { id, message, variant }])
      setTimeout(() => {
        setToasts((t) => t.filter((toast) => toast.id !== id))
      }, 4000)
    },
    []
  )

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => {
          const styles = VARIANT_STYLES[t.variant]
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto text-white shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 animate-slide-up min-w-[260px] max-w-md',
                styles.bg
              )}
            >
              {styles.icon}
              <span className="text-sm font-medium pr-2 flex-1">
                {t.message}
              </span>
              <button
                onClick={() => setToasts((tt) => tt.filter((x) => x.id !== t.id))}
                className="text-white/70 hover:text-white p-0.5 rounded transition-colors"
                aria-label="Chiudi notifica"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastState {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
