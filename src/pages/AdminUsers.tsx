import { useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  Users as UsersIcon,
  X,
  Mail,
  Lock,
  User as UserIcon,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { useUsers, useManageUser } from '@/hooks/useUsers'
import { useDepartments } from '@/hooks/useDepartments'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import { cn, initialsOf } from '@/lib/utils'
import type {
  ProfileWithDepartment,
  UserRole,
} from '@/types/database'

export default function AdminUsers() {
  const toast = useToast()
  const { profile: me } = useAuth()
  const { data: users = [], isLoading } = useUsers()
  const manageMutation = useManageUser()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ProfileWithDepartment | null>(null)
  const [toDelete, setToDelete] = useState<ProfileWithDepartment | null>(null)

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await manageMutation.mutateAsync({
        action: 'delete',
        user_id: toDelete.id,
      })
      setToDelete(null)
      toast.show('Utente eliminato')
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : "Errore nell'eliminazione",
        'error'
      )
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Utenti
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Crea, modifica e gestisci gli accessi del team al workspace.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-pienissimo-blue text-white rounded-xl text-sm font-semibold hover:bg-pienissimo-dark shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={16} /> Crea utente
        </button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Nessun utente"
          description="Crea il primo utente per iniziare."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Utente
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ruolo
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Reparto
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isMe = u.id === me?.id
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-full grid place-items-center font-bold text-xs shrink-0',
                            u.role === 'master'
                              ? 'bg-purple-600 text-white'
                              : u.role === 'admin'
                                ? 'bg-pienissimo-blue text-white'
                                : 'bg-slate-200 text-slate-700'
                          )}
                        >
                          {initialsOf(u.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {u.full_name}
                            {isMe && (
                              <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">
                                Tu
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold',
                          u.role === 'master'
                            ? 'bg-purple-100 text-purple-700'
                            : u.role === 'admin'
                              ? 'bg-pienissimo-50 text-pienissimo-blue'
                              : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {u.role !== 'guest' && <ShieldCheck size={11} />}
                        {u.role === 'master'
                          ? 'Master'
                          : u.role === 'admin'
                            ? 'Admin'
                            : 'Guest'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {u.department ? (
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border',
                            u.department.color_class
                          )}
                        >
                          {u.department.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(u)}
                          className="p-2 text-slate-400 hover:text-pienissimo-blue hover:bg-blue-50 rounded-lg transition-colors"
                          aria-label="Modifica"
                          title="Modifica"
                        >
                          <Edit2 size={14} />
                        </button>
                        {!isMe && (
                          <button
                            onClick={() => setToDelete(u)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label="Elimina"
                            title="Elimina"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <UserFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {editing && (
        <UserFormModal
          mode="edit"
          user={editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Eliminare l'utente?"
        message={
          toDelete
            ? `"${toDelete.full_name}" perderà l'accesso al workspace. I suoi task pubblicati restano (l'autore sarà mantenuto storicamente).`
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

function UserFormModal({
  mode,
  user,
  onClose,
}: {
  mode: 'create' | 'edit'
  user?: ProfileWithDepartment
  onClose: () => void
}) {
  const toast = useToast()
  const manageMutation = useManageUser()
  const { data: departments = [] } = useDepartments()

  const initialFullName = user?.full_name ?? ''
  const initialEmail = user?.email ?? ''
  const initialRole: UserRole = user?.role ?? 'guest'
  const initialDeptId = user?.department_id ?? ''

  const [fullName, setFullName] = useState(initialFullName)
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(initialRole)
  const [departmentId, setDepartmentId] = useState<string>(initialDeptId)
  const [error, setError] = useState<string | null>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Default reparto se nuovo: il primo della lista per evitare valore vuoto
  useEffect(() => {
    if (mode === 'create' && !departmentId && departments.length > 0) {
      setDepartmentId(departments[0]?.id ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments])

  const isDirty =
    fullName !== initialFullName ||
    email !== initialEmail ||
    password !== '' ||
    role !== initialRole ||
    departmentId !== initialDeptId

  const handleAttemptClose = () => {
    if (isDirty && !manageMutation.isPending) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCloseConfirm) {
          setShowCloseConfirm(false)
        } else {
          handleAttemptClose()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, showCloseConfirm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'create' && password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.')
      return
    }
    if (!email.trim() || !fullName.trim()) {
      setError('Email e nome completo sono obbligatori.')
      return
    }

    try {
      if (mode === 'create') {
        await manageMutation.mutateAsync({
          action: 'create',
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role,
          department_id: departmentId || null,
        })
        toast.show('Utente creato')
      } else if (user) {
        await manageMutation.mutateAsync({
          action: 'update',
          user_id: user.id,
          email: email.trim() !== user.email ? email.trim() : undefined,
          password: password || undefined,
          full_name: fullName.trim(),
          role,
          department_id: departmentId || null,
        })
        toast.show('Utente aggiornato')
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={handleAttemptClose}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-slate-900">
            {mode === 'create' ? 'Nuovo utente' : 'Modifica utente'}
          </h3>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
            aria-label="Chiudi"
          >
            <X size={18} />
          </button>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <ModalField
            label="Nome completo"
            icon={<UserIcon size={16} className="text-slate-400" />}
          >
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-input pl-10"
              placeholder="Mario Rossi"
            />
          </ModalField>

          <ModalField
            label="Email"
            icon={<Mail size={16} className="text-slate-400" />}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input pl-10"
              placeholder="mario@pienissimo.it"
            />
          </ModalField>

          <ModalField
            label={
              mode === 'create'
                ? 'Password'
                : 'Nuova password (lascia vuoto per non modificare)'
            }
            icon={<Lock size={16} className="text-slate-400" />}
          >
            <input
              type="password"
              required={mode === 'create'}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input pl-10"
              placeholder="Almeno 8 caratteri"
            />
          </ModalField>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Ruolo
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="form-select"
              >
                <option value="guest">Guest — solo lettura</option>
                <option value="admin">Admin — può creare task</option>
                <option value="master">Master — gestisce anche utenti</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Reparto
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="form-select"
              >
                <option value="">— Nessuno —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={handleAttemptClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={manageMutation.isPending}
            className="px-4 py-2 text-sm font-semibold text-white bg-pienissimo-blue rounded-lg hover:bg-pienissimo-dark transition-colors disabled:opacity-50"
          >
            {manageMutation.isPending
              ? 'Salvataggio...'
              : mode === 'create'
                ? 'Crea utente'
                : 'Salva modifiche'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={showCloseConfirm}
        title="Modifiche non salvate"
        message="Hai modifiche non salvate. Sei sicuro di voler uscire? I dati inseriti andranno persi."
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

function ModalField({
  label,
  icon,
  children,
}: {
  label: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-3 pointer-events-none">
            {icon}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}
