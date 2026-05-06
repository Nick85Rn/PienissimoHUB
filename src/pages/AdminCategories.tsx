import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/useCategories'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database'

const COLOR_OPTIONS = [
  'bg-slate-500',
  'bg-red-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
]

export default function AdminCategories() {
  const toast = useToast()
  const { data: categories = [], isLoading } = useCategories()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()

  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[4]!)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const [toDelete, setToDelete] = useState<Category | null>(null)

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await createMutation.mutateAsync({
        name: newName.trim(),
        color_class: newColor,
      })
      setNewName('')
      toast.show('Categoria creata')
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Errore nella creazione',
        'error'
      )
    }
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color_class)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('')
  }

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        patch: { name: editName.trim(), color_class: editColor },
      })
      cancelEdit()
      toast.show('Categoria aggiornata')
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Errore aggiornamento',
        'error'
      )
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await deleteMutation.mutateAsync(toDelete.id)
      setToDelete(null)
      toast.show('Categoria eliminata')
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Errore cancellazione',
        'error'
      )
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Categorie
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Gestisci le categorie usate per classificare i task.
        </p>
      </header>

      {/* New category form */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3">
            <div className="flex gap-1.5 border-r border-slate-200 pr-3 py-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  aria-label={`Colore ${c}`}
                  className={cn(
                    'w-3.5 h-3.5 rounded-full transition-all',
                    c,
                    newColor === c
                      ? 'ring-2 ring-offset-1 ring-slate-400 scale-110'
                      : 'opacity-40 hover:opacity-100'
                  )}
                />
              ))}
            </div>
            <input
              type="text"
              placeholder="Nome nuova categoria..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreate()
              }}
              className="flex-1 py-2 text-sm outline-none bg-transparent"
            />
          </div>
          <button
            onClick={() => void handleCreate()}
            disabled={!newName.trim() || createMutation.isPending}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors shrink-0 disabled:opacity-50"
          >
            <Plus size={16} /> Aggiungi
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Nessuna categoria"
          description="Aggiungi la prima categoria usando il form sopra."
        />
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => {
            const isEditing = editingId === cat.id
            return (
              <div
                key={cat.id}
                className={cn(
                  'group flex justify-between items-center p-4 border rounded-xl transition-all',
                  isEditing
                    ? 'border-pienissimo-blue bg-pienissimo-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-3 w-full max-w-md">
                      <div className="flex gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            className={cn(
                              'w-3.5 h-3.5 rounded-full transition-all',
                              c,
                              editColor === c
                                ? 'ring-2 ring-offset-1 ring-slate-400 scale-110'
                                : 'opacity-40 hover:opacity-100'
                            )}
                          />
                        ))}
                      </div>
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveEdit()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm w-full outline-none focus:ring-2 focus:ring-pienissimo-blue/20 focus:border-pienissimo-blue"
                      />
                    </div>
                  ) : (
                    <>
                      <div className={cn('w-2.5 h-2.5 rounded-full', cat.color_class)} />
                      <span className="font-semibold text-slate-700 text-sm">
                        {cat.name}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => void saveEdit()}
                        className="p-1.5 text-emerald-600 bg-emerald-100 rounded-md hover:bg-emerald-200 transition-colors"
                        aria-label="Salva"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 text-slate-500 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                        aria-label="Annulla"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-2 text-slate-400 hover:text-pienissimo-blue hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        aria-label="Modifica"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setToDelete(cat)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        aria-label="Elimina"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminare la categoria?"
        message={
          toDelete
            ? `"${toDelete.name}" sarà rimossa. I task che la usano resteranno (verranno semplicemente "senza categoria").`
            : ''
        }
        variant="danger"
        confirmLabel="Elimina"
        onConfirm={() => void handleDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
