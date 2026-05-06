import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Plus,
  FileText,
  X,
  SlidersHorizontal,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useTasks, useDeleteTask } from '@/hooks/useTasks'
import { useCategories } from '@/hooks/useCategories'
import { TaskCard } from '@/components/TaskCard'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { Spinner } from '@/components/Spinner'
import {
  TASK_TYPE_LABELS,
  type TaskType,
  type TaskStatus,
  type TaskWithRelations,
} from '@/types/database'
import { cn } from '@/lib/utils'

type StatusFilter = TaskStatus | 'all'

const TASK_TYPES: TaskType[] = [
  'release',
  'aggiornamento',
  'bugfix',
  'guida',
  'comunicazione',
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<TaskType | null>(null)
  // null = vede tutto pubblicato (default per admin e per guest);
  // 'draft' = solo bozze (admin); 'archived' = solo archiviati (admin)
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null)

  const filters = useMemo(() => {
    // I guest sono SEMPRE bloccati su 'published' (e comunque le RLS lo
    // garantiscono). Gli admin possono scegliere.
    let status: StatusFilter
    if (!isAdmin) {
      status = 'published'
    } else {
      status = statusFilter ?? 'published'
    }
    return {
      search: search.trim() || undefined,
      category_id: activeCategory ?? undefined,
      type: activeType ?? undefined,
      status,
    }
  }, [search, activeCategory, activeType, statusFilter, isAdmin])

  const { data: tasks = [], isLoading } = useTasks(filters)
  const { data: categories = [] } = useCategories()
  const deleteMutation = useDeleteTask()

  const [toDelete, setToDelete] = useState<TaskWithRelations | null>(null)

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteMutation.mutateAsync(toDelete.id)
      toast.show('Task eliminato')
      setToDelete(null)
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : "Errore nell'eliminazione",
        'error'
      )
    }
  }

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(activeCategory) ||
    Boolean(activeType) ||
    Boolean(statusFilter)

  const clearFilters = () => {
    setSearch('')
    setActiveCategory(null)
    setActiveType(null)
    setStatusFilter(null)
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            {isAdmin ? 'Hub Aggiornamenti' : 'Aggiornamenti del team'}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            {isAdmin
              ? 'Gestisci, pubblica e mantieni il registro tecnico di Pienissimo PRO.'
              : 'Tutti gli aggiornamenti, le release e i bug fix in un unico posto.'}
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/new-task"
            className="px-4 py-2.5 bg-pienissimo-blue text-white rounded-xl text-sm font-semibold hover:bg-pienissimo-dark shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <Plus size={16} /> Nuovo task
          </Link>
        )}
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-8">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-4 top-3 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Cerca per titolo o contenuto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-pienissimo-blue/20 focus:border-pienissimo-blue shadow-sm transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                aria-label="Cancella ricerca"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors flex items-center gap-1.5 self-start"
            >
              <X size={14} /> Pulisci filtri
            </button>
          )}

          {isAdmin && (
            <div className="relative">
              <SlidersHorizontal
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <select
                value={statusFilter ?? ''}
                onChange={(e) =>
                  setStatusFilter((e.target.value || null) as StatusFilter | null)
                }
                className={cn(
                  'pl-9 pr-9 py-2 rounded-lg text-sm font-semibold border cursor-pointer outline-none focus:ring-2 focus:ring-pienissimo-blue/20 focus:border-pienissimo-blue transition-all appearance-none bg-no-repeat bg-right',
                  statusFilter
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-white text-slate-600 border-slate-200'
                )}
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e\")",
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="">Pubblicati</option>
                <option value="draft">Bozze</option>
                <option value="archived">Archiviati</option>
                <option value="all">Tutti gli stati</option>
              </select>
            </div>
          )}
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap gap-2">
          <FilterPill
            active={activeType === null}
            onClick={() => setActiveType(null)}
          >
            Tutti i tipi
          </FilterPill>
          {TASK_TYPES.map((t) => (
            <FilterPill
              key={t}
              active={activeType === t}
              onClick={() => setActiveType(activeType === t ? null : t)}
            >
              {TASK_TYPE_LABELS[t]}
            </FilterPill>
          ))}
        </div>

        {/* Category filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <FilterPill
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            >
              Tutte le categorie
            </FilterPill>
            {categories.map((cat) => (
              <FilterPill
                key={cat.id}
                active={activeCategory === cat.id}
                onClick={() =>
                  setActiveCategory(activeCategory === cat.id ? null : cat.id)
                }
              >
                <span
                  className={cn('w-1.5 h-1.5 rounded-full', cat.color_class)}
                />
                {cat.name}
              </FilterPill>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nessun task trovato"
          description={
            hasActiveFilters
              ? 'Prova a modificare i filtri o pulirli per vedere tutti i risultati.'
              : isAdmin
                ? 'Inizia creando il primo aggiornamento per il team.'
                : 'Non ci sono ancora aggiornamenti pubblicati.'
          }
          action={
            isAdmin && !hasActiveFilters ? (
              <Link
                to="/new-task"
                className="inline-flex items-center gap-2 px-4 py-2 bg-pienissimo-blue text-white rounded-lg text-sm font-semibold hover:bg-pienissimo-dark transition-colors"
              >
                <Plus size={16} /> Crea il primo task
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isAdmin={isAdmin}
              onEdit={(id) => navigate(`/edit-task/${id}`)}
              onDelete={(t) => setToDelete(t)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminare il task?"
        message={
          toDelete
            ? `"${toDelete.title}" verrà eliminato in modo permanente, insieme ai suoi commenti.`
            : ''
        }
        variant="danger"
        confirmLabel="Elimina"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

function FilterPill({
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
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border flex items-center gap-1.5',
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
      )}
    >
      {children}
    </button>
  )
}
