import { Link } from 'react-router-dom'
import {
  Calendar,
  User,
  Edit2,
  Trash2,
  ChevronRight,
  Bug,
  AlertCircle,
} from 'lucide-react'
import {
  type TaskWithRelations,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  BUG_STATUS_COLORS,
  BUG_STATUS_LABELS,
  BUG_SEVERITY_COLORS,
  BUG_SEVERITY_LABELS,
  DEPARTMENT_LABELS,
  DEPARTMENT_COLORS,
} from '@/types/database'
import { cn, formatRelative } from '@/lib/utils'

interface TaskCardProps {
  task: TaskWithRelations
  isAdmin: boolean
  onEdit?: (id: string) => void
  onDelete?: (task: TaskWithRelations) => void
}

export function TaskCard({ task, isAdmin, onEdit, onDelete }: TaskCardProps) {
  return (
    <Link
      to={`/task/${task.id}`}
      className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all relative overflow-hidden flex flex-col h-full"
    >
      {task.status === 'draft' && (
        <div className="absolute top-3 right-3 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
          Bozza
        </div>
      )}

      {/* Header chips */}
      <div className="flex items-center flex-wrap gap-2 mb-4">
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold',
            TASK_TYPE_COLORS[task.type]
          )}
        >
          {TASK_TYPE_LABELS[task.type]}
        </span>

        {task.category && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-xs font-semibold">
            <span
              className={cn('w-1.5 h-1.5 rounded-full', task.category.color_class)}
            />
            {task.category.name}
          </span>
        )}

        {task.version && (
          <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono">
            v{task.version}
          </span>
        )}

        {task.type === 'bugfix' && task.bug_severity && (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase',
              BUG_SEVERITY_COLORS[task.bug_severity]
            )}
          >
            <AlertCircle size={10} />
            {BUG_SEVERITY_LABELS[task.bug_severity]}
          </span>
        )}
      </div>

      {/* Title + excerpt */}
      <h2 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-pienissimo-blue transition-colors line-clamp-2 leading-snug">
        {task.title}
      </h2>
      <p className="text-sm text-slate-500 mb-5 line-clamp-2 leading-relaxed flex-1">
        {task.excerpt || 'Nessuna descrizione disponibile.'}
      </p>

      {/* Bug status */}
      {task.type === 'bugfix' && task.bug_status && (
        <div className="mb-4">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border',
              BUG_STATUS_COLORS[task.bug_status]
            )}
          >
            <Bug size={12} />
            {BUG_STATUS_LABELS[task.bug_status]}
          </span>
        </div>
      )}

      {/* Target departments */}
      {task.target_departments.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {task.target_departments.slice(0, 3).map((d) => (
            <span
              key={d}
              className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded border',
                DEPARTMENT_COLORS[d]
              )}
            >
              {DEPARTMENT_LABELS[d]}
            </span>
          ))}
          {task.target_departments.length > 3 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded text-slate-500 border border-slate-200">
              +{task.target_departments.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Calendar size={12} />
            {formatRelative(task.published_at ?? task.created_at)}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold truncate">
            <User size={12} className="text-slate-400 shrink-0" />
            <span className="truncate">{task.author?.full_name ?? 'Sconosciuto'}</span>
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && onEdit && onDelete && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onEdit(task.id)
                }}
                className="p-1.5 text-slate-400 hover:text-pienissimo-blue hover:bg-blue-50 rounded-md transition-colors"
                title="Modifica"
                aria-label="Modifica"
              >
                <Edit2 size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDelete(task)
                }}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Elimina"
                aria-label="Elimina"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
          <div className="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-pienissimo-blue text-slate-400 group-hover:text-white grid place-items-center transition-colors">
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </Link>
  )
}
