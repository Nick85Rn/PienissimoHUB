import { useState } from 'react'
import { Save, Mail, Lock, User as UserIcon, ShieldCheck, Building2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/Spinner'
import { initialsOf, cn } from '@/lib/utils'
import { DEPARTMENT_LABELS } from '@/types/database'

export default function Settings() {
  const { profile, isAdmin, isMaster, refresh } = useAuth()
  const toast = useToast()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [email, setEmail] = useState(profile?.email ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!profile) return <Spinner />

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      // 1. Aggiorna nome nel profilo (RLS: profiles_update_self lo permette,
      //    ma blocca cambio role/department per i guest)
      if (fullName.trim() !== profile.full_name) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ full_name: fullName.trim() })
          .eq('id', profile.id)
        if (profileErr) throw profileErr
      }

      // 2. Aggiorna email/password lato auth
      const authUpdates: { email?: string; password?: string } = {}
      if (email.trim() && email.trim() !== profile.email) {
        authUpdates.email = email.trim()
      }
      if (newPassword) {
        if (newPassword.length < 8) {
          throw new Error('La password deve essere di almeno 8 caratteri.')
        }
        authUpdates.password = newPassword
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authErr } = await supabase.auth.updateUser(authUpdates)
        if (authErr) throw authErr

        // Se è cambiata l'email, aggiorna anche il profilo
        // (il trigger non ascolta gli update di auth.users, solo gli insert)
        if (authUpdates.email) {
          await supabase
            .from('profiles')
            .update({ email: authUpdates.email })
            .eq('id', profile.id)
        }
      }

      await refresh()
      setNewPassword('')
      toast.show('Profilo aggiornato')

      if (authUpdates.email) {
        toast.show(
          'Per confermare il cambio email controlla la nuova casella di posta',
          'info'
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Profilo
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Aggiorna i dati del tuo account.
        </p>
      </header>

      {/* Identity card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-16 h-16 rounded-2xl grid place-items-center font-bold text-xl shrink-0',
              isAdmin
                ? 'bg-pienissimo-blue text-white'
                : 'bg-slate-200 text-slate-700'
            )}
          >
            {initialsOf(profile.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-slate-900 truncate">
              {profile.full_name}
            </p>
            <p className="text-sm text-slate-500 truncate">{profile.email}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                  isMaster
                    ? 'bg-purple-100 text-purple-700'
                    : isAdmin
                      ? 'bg-pienissimo-50 text-pienissimo-blue'
                      : 'bg-slate-100 text-slate-600'
                )}
              >
                {isAdmin && <ShieldCheck size={10} />}
                {isMaster ? 'Master' : isAdmin ? 'Admin' : 'Guest'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                <Building2 size={10} />
                {DEPARTMENT_LABELS[profile.department]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={(e) => void handleSave(e)}
        className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5"
      >
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Dati personali
        </h2>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <Field
          label="Nome completo"
          icon={<UserIcon size={16} className="text-slate-400" />}
        >
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="form-input pl-10"
          />
        </Field>

        <Field
          label="Email"
          icon={<Mail size={16} className="text-slate-400" />}
          hint="Cambiare l'email richiede una conferma sulla nuova casella."
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input pl-10"
          />
        </Field>

        <Field
          label="Nuova password"
          icon={<Lock size={16} className="text-slate-400" />}
          hint="Lascia vuoto per non modificare. Min 8 caratteri."
        >
          <input
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="form-input pl-10"
            autoComplete="new-password"
          />
        </Field>

        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs text-slate-400 mb-4">
            Ruolo e reparto possono essere modificati solo da un amministratore
            dalla sezione <strong>Utenti</strong>.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-pienissimo-blue text-white rounded-lg text-sm font-semibold hover:bg-pienissimo-dark shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  icon,
  hint,
  children,
}: {
  label: string
  icon?: React.ReactNode
  hint?: string
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
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
