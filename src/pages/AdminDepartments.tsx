import { useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Building2,
  ChevronUp,
  ChevronDown,
  Tag,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '@/hooks/useDepartments'
import { useCategories } from '@/hooks/useCategories'
import {
  useDepartmentCategories,
  useReplaceDepartmentCategories,
} from '@/hooks/useCategoryAccess'
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
  const [configuring, setConfiguring] = useState<Department | null>(null)

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
                        onClick={() => setConfiguring(dept)}
                        className="p-2 text-slate-400 hover:text-pienissimo-blue hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        aria-label="Categorie default"
                        title="Categorie default"
                      >
                        <Tag size={14} />
                      </button>
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

      {configuring && (
        <DepartmentCategoriesModal
          department={configuring}
          onClose={() => setConfiguring(null)}
        />
      )}
    </div>
  )
}

// =====================================================================
// Modal: configura le categorie default di un reparto
// =====================================================================
function DepartmentCategoriesModal({
  department,
  onClose,
}: {
  department: Department
  onClose: () => void
}) {
  const toast = useToast()
  const { data: allCategories = [] } = useCategories()
  const { data: deptCategoryIds = [] } = useDepartmentCategories(department.id)
  const replaceMutation = useReplaceDepartmentCategories()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Carica le categorie correnti del reparto
  useEffect(() => {
    setSelectedIds(deptCategoryIds)
  }, [deptCategoryIds])

  const isDirty =
    selectedIds.length !== deptCategoryIds.length ||
    !selectedIds.every((id) => deptCategoryIds.includes(id))

  const handleAttemptClose = () => {
    if (isDirty && !replaceMutation.isPending) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    try {
      await replaceMutation.mutateAsync({
        departmentId: department.id,
        categoryIds: selectedIds,
      })
      toast.show('Categorie default aggiornate')
      onClose()
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : "Errore nel salvataggio",
        'error'
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={handleAttemptClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-start mb-5">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Categorie default
            </p>
            <h3 className="text-lg font-bold text-slate-900">
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-md text-sm font-bold border mr-2',
                  department.color_class
                )}
              >
                {department.name}
              </span>
            </h3>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
            aria-label="Chiudi"
          >
            <X size={18} />
          </button>
        </header>

        <p className="text-sm text-slate-500 mb-4 leading-relaxed">
          Quando un nuovo guest viene assegnato a questo reparto, riceve
          automaticamente queste categorie come "consultabili". I guest
          esistenti non vengono modificati a meno che tu non clicchi
          "Reimposta dal reparto" sulla loro scheda.
        </p>

        {allCategories.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-6 text-center">
            Nessuna categoria definita.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-2">
            {allCategories.map((c) => {
              const active = selectedIds.includes(c.id)
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold border transition-colors',
                    active
                      ? 'bg-pienissimo-blue text-white border-pienissimo-blue'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      active ? 'bg-white' : c.color_class
                    )}
                  />
                  {c.name}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSelectedIds(allCategories.map((c) => c.id))}
            className="text-xs font-semibold text-pienissimo-blue hover:text-pienissimo-dark"
          >
            Seleziona tutte
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={replaceMutation.isPending}
              className="px-4 py-2 text-sm font-semibold text-white bg-pienissimo-blue rounded-lg hover:bg-pienissimo-dark transition-colors disabled:opacity-50"
            >
              {replaceMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showCloseConfirm}
        title="Modifiche non salvate"
        message="Hai modifiche non salvate. Sei sicuro di voler uscire?"
        confirmLabel="Esci senza salvare"
        cancelLabel="Continua a modificare"
        variant="warning"
        onConfirm={() => {
          setShowCloseConfirm(false)
          onClose()
        }}
        onCancel={() => setShowCloseConfirm(false)}
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
