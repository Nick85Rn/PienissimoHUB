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
} from '@/types/database'
import { cn, formatRelative } from '@/lib/utils'

interface TaskListItemProps {
  task: TaskWithRelations
  unread: boolean
  isAdmin: boolean
  onEdit?: (id: string) => void
  onDelete?: (task: TaskWithRelations) => void
}

export function TaskListItem({
  task,
  unread,
  isAdmin,
  onEdit,
  onDelete,
}: TaskListItemProps) {
  const departments = task.task_departments?.map((td) => td.department) ?? []
  const taskTypes = task.task_types?.map((t) => t.type) ?? []
  const hasBugfix = taskTypes.includes('bugfix')

  return (
    <Link
      to={`/task/${task.id}`}
      className={cn(
        'group block bg-white border rounded-xl px-4 md:px-5 py-4 transition-all relative',
        unread
          ? 'border-pienissimo-blue/30 bg-pienissimo-50/30 hover:border-pienissimo-blue/50'
          : 'border-slate-200 hover:border-slate-300'
      )}
    >
      <div className="flex items-start gap-4">
        <div className="pt-1.5 shrink-0">
          {unread ? (
            <span
              aria-label="Non letto"
              className="block w-2 h-2 rounded-full bg-pienissimo-blue ring-4 ring-pienissimo-blue/20"
            />
          ) : (
            <span className="block w-2 h-2 rounded-full bg-slate-200" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            {taskTypes.map((t) => (
              <span
                key={t}
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0',
                  TASK_TYPE_COLORS[t]
                )}
              >
                {TASK_TYPE_LABELS[t]}
              </span>
            ))}

            {task.category && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-semibold shrink-0">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    task.category.color_class
                  )}
                />
                {task.category.name}
              </span>
            )}

            {task.version && (
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider font-mono shrink-0">
                v{task.version}
              </span>
            )}

            {hasBugfix && task.bug_severity && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0',
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
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0',
                  BUG_STATUS_COLORS[task.bug_status]
                )}
              >
                <Bug size={9} />
                {BUG_STATUS_LABELS[task.bug_status]}
              </span>
            )}

            {task.status === 'draft' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                Bozza
              </span>
            )}
          </div>

          <h3
            className={cn(
              'text-base md:text-lg leading-snug truncate group-hover:text-pienissimo-blue transition-colors',
              unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-900'
            )}
          >
            {task.title}
          </h3>

          {task.excerpt && (
            <p className="text-sm text-slate-500 mt-1 truncate">
              {task.excerpt}
            </p>
          )}

          <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar size={11} className="text-slate-400" />
              {formatRelative(task.published_at ?? task.created_at)}
            </span>
            <span className="flex items-center gap-1.5 truncate max-w-[180px]">
              <User size={11} className="text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700 truncate">
                {task.author?.full_name ?? 'Sconosciuto'}
              </span>
            </span>

            {departments.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {departments.slice(0, 4).map((d) => (
                  <span
                    key={d.id}
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                      d.color_class
                    )}
                  >
                    {d.name}
                  </span>
                ))}
                {departments.length > 4 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">
                    +{departments.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 self-center">
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
          <ChevronRight
            size={18}
            className="text-slate-300 group-hover:text-pienissimo-blue transition-colors"
          />
        </div>
      </div>
    </Link>
  )
}
