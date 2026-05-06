import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-2xl border-2 border-slate-200 border-dashed">
      <Icon className="mx-auto h-10 w-10 text-slate-300 mb-3" />
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
