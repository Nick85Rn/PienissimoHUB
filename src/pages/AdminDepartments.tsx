import { useState } from 'react'
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Building2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '@/hooks/useDepartments'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import {
  type Department,
  DEPARTMENT_COLOR_OPTIONS,
} from '@/types/database'

export default function AdminDepartments() {
  const toast = useToast()
  const { data: departments = [], isLoading } = useDepartments()
  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()
  const deleteMutation = useDeleteDepartment()

  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(
    DEPARTMENT_COLOR_OPTIONS[1]?.class ?? ''
  )

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const [toDelete, setToDelete] = useState<Department | null>(null)

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const maxPos = departments.reduce((m, d) => Math.max(m, d.position), 0)
      await createMutation.mutateAsync({
        name: newName.trim(),
        color_class: newColor,
        position: maxPos + 10,
      })
      setNewName('')
      toast.show('Reparto creato')
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Errore nella creazione',
        'error'
      )
    }
  }

  const startEdit = (d: Department) => {
    setEditingId(d.id)
    setEditName(d.name)
    setEditColor(d.color_class)
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
      toast.show('Reparto aggiornato')
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Errore aggiornamento',
        'error'
      )
    }
  }

  const moveDepartment = async (dept: Department, direction: 'up' | 'down') => {
    const idx = departments.findIndex((d) => d.id === dept.id)
    if (idx === -1) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= departments.length) return
    const target = departments[targetIdx]
    if (!target) return
    try {
      await Promise.all([
        updateMutation.mutateAsync({
          id: dept.id,
          patch: { position: target.position },
        }),
        updateMutation.mutateAsync({
          id: target.id,
          patch: { position: dept.position },
        }),
      ])
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Errore nel riordino',
        'error'
      )
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await deleteMutation.mutateAsync(toDelete.id)
      setToDelete(null)
      toast.show('Reparto eliminato')
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
          Reparti
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Gestisci i reparti aziendali. Sono usati come etichette sui task e
          per il targeting delle notifiche.
        </p>
      </header>

      {/* Nuovo reparto */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Nome del nuovo reparto..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate()
            }}
            maxLength={50}
            className="form-input flex-1"
          />
          <ColorPicker value={newColor} onChange={setNewColor} />
          <button
            onClick={() => void handleCreate()}
            disabled={!newName.trim() || createMutation.isPending}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors shrink-0 disabled:opacity-50"
          >
            <Plus size={16} /> Aggiungi
          </button>
        </div>
      </div>

      {/* Lista reparti */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nessun reparto"
          description="Aggiungi il primo reparto usando il form sopra."
        />
      ) : (
        <div className="space-y-2">
          {departments.map((dept, idx) => {
            const isEditing = editingId === dept.id
            return (
              <div
                key={dept.id}
                className={cn(
                  'group flex justify-between items-center p-4 border rounded-xl transition-all',
                  isEditing
                    ? 'border-pienissimo-blue bg-pienissimo-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {!isEditing && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => void moveDepartment(dept, 'up')}
                        disabled={idx === 0}
                        className="p-0.5 text-slate-300 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Sposta su"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void moveDepartment(dept, 'down')}
                        disabled={idx === departments.length - 1}
                        className="p-0.5 text-slate-300 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Sposta giù"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  )}

                  {isEditing ? (
                    <div className="flex items-center gap-3 w-full max-w-2xl">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveEdit()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        maxLength={50}
                        className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm flex-1 outline-none focus:ring-2 focus:ring-pienissimo-blue/20 focus:border-pienissimo-blue"
                      />
                      <ColorPicker value={editColor} onChange={setEditColor} />
                    </div>
                  ) : (
                    <span
                      className={cn(
                        'inline-flex items-center px-3 py-1 rounded-md text-sm font-bold border',
                        dept.color_class
                      )}
                    >
                      {dept.name}
                    </span>
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
                        onClick={() => startEdit(dept)}
                        className="p-2 text-slate-400 hover:text-pienissimo-blue hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        aria-label="Modifica"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setToDelete(dept)}
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
        title="Eliminare il reparto?"
        message={
          toDelete
            ? `"${toDelete.name}" sarà rimosso. Gli utenti e i task associati resteranno, ma senza reparto assegnato. Dovrai riassegnarli manualmente.`
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

function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-1.5 items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-2">
      {DEPARTMENT_COLOR_OPTIONS.map((opt) => {
        const active = value === opt.class
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.class)}
            aria-label={`Colore ${opt.label}`}
            title={opt.label}
            className={cn(
              'w-5 h-5 rounded-full border transition-all',
              opt.class,
              active
                ? 'ring-2 ring-offset-1 ring-slate-400 scale-110'
                : 'opacity-60 hover:opacity-100'
            )}
          />
        )
      })}
    </div>
  )
}
