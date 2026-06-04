import { useEffect, useMemo, useState } from 'react'
import { X, Send, Users, Tag, Building2, User, Search } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useUsers } from '@/hooks/useUsers'
import { useCategories } from '@/hooks/useCategories'
import { useDepartments } from '@/hooks/useDepartments'
import { useSendTaskNotifications } from '@/hooks/useEmailSettings'
import { Spinner } from './Spinner'
import { cn, initialsOf } from '@/lib/utils'
import type { ProfileWithDepartment } from '@/types/database'

type Mode = 'all_guests' | 'by_category' | 'by_department' | 'individual'

interface PublishNotifyDialogProps {
  open: boolean
  taskId: string
  taskTitle: string
  /** category_id del task, per pre-selezione "by_category" */
  taskCategoryId?: string | null
  /** dipartimenti targettizzati nel task, per pre-selezione "by_department" */
  taskDepartmentIds?: string[]
  onClose: () => void
  onSent: () => void
}

export function PublishNotifyDialog({
  open,
  taskId,
  taskTitle,
  taskCategoryId,
  taskDepartmentIds = [],
  onClose,
  onSent,
}: PublishNotifyDialogProps) {
  const toast = useToast()
  const { data: users = [], isLoading: loadingUsers } = useUsers()
  const { data: categories = [] } = useCategories()
  const { data: departments = [] } = useDepartments()
  const sendMutation = useSendTaskNotifications()

  // Considero solo i guest come destinatari (admin/master vedono tutto comunque)
  const guests = useMemo(
    () => users.filter((u) => u.role === 'guest'),
    [users]
  )

  const [mode, setMode] = useState<Mode>('all_guests')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [search, setSearch] = useState('')

  // Reset quando si chiude/apre
  useEffect(() => {
    if (!open) return
    // pre-seleziona valori sensati
    if (taskCategoryId) setSelectedCategoryId(taskCategoryId)
    if (taskDepartmentIds[0]) setSelectedDepartmentId(taskDepartmentIds[0])
    setSelectedUserIds([])
    setSearch('')
  }, [open, taskCategoryId, taskDepartmentIds])

  // Calcola la lista effettiva dei destinatari secondo il mode selezionato
  const recipients: ProfileWithDepartment[] = useMemo(() => {
    if (mode === 'all_guests') {
      return guests
    }
    if (mode === 'by_category' && selectedCategoryId) {
      // Filtro lato client: i guest che hanno questa categoria assegnata.
      // NB: la query è semplificata, in realtà dovremmo caricare anche
      // user_categories. Per ora prendiamo tutti i guest e mostriamo
      // un messaggio se non c'è una mappatura precisa.
      // SOLUZIONE PRATICA: la categoria è una HINT, ma il default è
      // "manda a tutti i guest che hanno quella categoria abilitata".
      // Senza query aggiuntiva mando a tutti i guest del reparto, e
      // l'utente filtra manualmente i singoli se serve.
      return guests
    }
    if (mode === 'by_department' && selectedDepartmentId) {
      return guests.filter((u) => u.department_id === selectedDepartmentId)
    }
    if (mode === 'individual') {
      return guests.filter((u) => selectedUserIds.includes(u.id))
    }
    return []
  }, [mode, selectedCategoryId, selectedDepartmentId, selectedUserIds, guests])

  const filteredGuests = useMemo(() => {
    if (!search.trim()) return guests
    const q = search.trim().toLowerCase()
    return guests.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department?.name?.toLowerCase().includes(q) ?? false)
    )
  }, [guests, search])

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.show('Nessun destinatario selezionato', 'error')
      return
    }
    try {
      const result = await sendMutation.mutateAsync({
        task_id: taskId,
        recipient_ids: recipients.map((r) => r.id),
      })
      if (result.failed > 0) {
        toast.show(
          `Inviate ${result.sent}, fallite ${result.failed}`,
          result.sent > 0 ? 'info' : 'error'
        )
      } else {
        toast.show(`Notifica inviata a ${result.sent} ${result.sent === 1 ? 'persona' : 'persone'}`)
      }
      onSent()
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : "Errore nell'invio",
        'error'
      )
    }
  }

  const handleSkip = () => {
    onSent()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-slide-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-start p-6 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
              ✓ Task pubblicato
            </p>
            <h3 className="text-lg font-bold text-slate-900">
              Vuoi avvisare qualcuno?
            </h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-1">
              {taskTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
            aria-label="Chiudi"
          >
            <X size={18} />
          </button>
        </header>

        {/* Tabs di selezione */}
        <div className="px-6 pt-4 border-b border-slate-100">
          <div className="flex flex-wrap gap-1">
            <ModeTab
              icon={<Users size={14} />}
              active={mode === 'all_guests'}
              onClick={() => setMode('all_guests')}
            >
              Tutti i guest
            </ModeTab>
            <ModeTab
              icon={<Building2 size={14} />}
              active={mode === 'by_department'}
              onClick={() => setMode('by_department')}
            >
              Per reparto
            </ModeTab>
            <ModeTab
              icon={<User size={14} />}
              active={mode === 'individual'}
              onClick={() => setMode('individual')}
            >
              Singoli utenti
            </ModeTab>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingUsers ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : guests.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">
              Non ci sono guest a cui inviare notifiche.
            </p>
          ) : (
            <>
              {mode === 'all_guests' && (
                <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm text-slate-700">
                    La notifica verrà inviata a tutti i <strong>{guests.length} guest</strong>{' '}
                    del sistema, indipendentemente dal reparto o dalle categorie.
                  </p>
                </div>
              )}

              {mode === 'by_department' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Reparto
                  </label>
                  <select
                    value={selectedDepartmentId}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    className="form-select w-full"
                  >
                    <option value="">— Scegli reparto —</option>
                    {departments.map((d) => {
                      const count = guests.filter(
                        (u) => u.department_id === d.id
                      ).length
                      return (
                        <option key={d.id} value={d.id}>
                          {d.name} ({count} {count === 1 ? 'guest' : 'guest'})
                        </option>
                      )
                    })}
                  </select>
                  {selectedDepartmentId && recipients.length > 0 && (
                    <div className="mt-3 max-h-64 overflow-y-auto bg-slate-50/60 border border-slate-200 rounded-xl p-2 space-y-1">
                      {recipients.map((r) => (
                        <UserRow key={r.id} user={r} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {mode === 'individual' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-3 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Cerca per nome, email o reparto..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="form-input pl-9"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedUserIds(filteredGuests.map((u) => u.id))
                      }
                      className="font-semibold text-pienissimo-blue hover:text-pienissimo-dark"
                    >
                      Seleziona tutti i visibili
                    </button>
                    {selectedUserIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedUserIds([])}
                        className="font-semibold text-slate-500 hover:text-slate-900"
                      >
                        Deseleziona tutti
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto bg-slate-50/60 border border-slate-200 rounded-xl p-2 space-y-1">
                    {filteredGuests.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">
                        Nessun risultato.
                      </p>
                    ) : (
                      filteredGuests.map((u) => {
                        const selected = selectedUserIds.includes(u.id)
                        return (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() =>
                              setSelectedUserIds((prev) =>
                                prev.includes(u.id)
                                  ? prev.filter((x) => x !== u.id)
                                  : [...prev, u.id]
                              )
                            }
                            className={cn(
                              'w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                              selected
                                ? 'bg-pienissimo-50 ring-1 ring-pienissimo-blue/30'
                                : 'hover:bg-white'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              readOnly
                              className="rounded text-pienissimo-blue pointer-events-none"
                            />
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 grid place-items-center font-bold text-[10px] shrink-0">
                                {initialsOf(u.full_name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {u.full_name}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                  {u.email}
                                  {u.department && (
                                    <span className="ml-1">
                                      · {u.department.name}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-bold text-slate-900">
              {recipients.length}
            </span>{' '}
            <span className="text-slate-500">
              {recipients.length === 1
                ? 'destinatario'
                : 'destinatari'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Salta notifica
            </button>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={recipients.length === 0 || sendMutation.isPending}
              className="px-4 py-2 bg-pienissimo-blue text-white rounded-lg text-sm font-semibold hover:bg-pienissimo-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={14} />
              {sendMutation.isPending
                ? 'Invio...'
                : `Invia a ${recipients.length}`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function ModeTab({
  icon,
  children,
  active,
  onClick,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-2 rounded-t-lg text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors',
        active
          ? 'text-pienissimo-blue border-pienissimo-blue bg-pienissimo-50/40'
          : 'text-slate-500 border-transparent hover:text-slate-900'
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function UserRow({ user }: { user: ProfileWithDepartment }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded text-sm">
      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 grid place-items-center font-bold text-[10px] shrink-0">
        {initialsOf(user.full_name)}
      </div>
      <span className="text-sm font-semibold text-slate-900">{user.full_name}</span>
      <span className="text-xs text-slate-400 truncate">
        {user.email}
      </span>
    </div>
  )
}
