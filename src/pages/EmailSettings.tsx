import { useEffect, useState } from 'react'
import { Save, Send, Mail, AlertCircle, Eye, Info } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import {
  useEmailSettings,
  useUpdateEmailSettings,
  useSendTaskNotifications,
} from '@/hooks/useEmailSettings'
import { useTasks } from '@/hooks/useTasks'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { Spinner } from '@/components/Spinner'
import { cn } from '@/lib/utils'

const PLACEHOLDERS = [
  { key: 'titolo', desc: 'Titolo del task' },
  { key: 'tipi', desc: 'Tipi (es. "Release, Bug Fix")' },
  { key: 'categoria', desc: 'Categoria' },
  { key: 'autore', desc: 'Nome dell\'autore' },
  { key: 'anteprima', desc: 'Excerpt del contenuto' },
  { key: 'link', desc: 'URL completo del task' },
]

export default function EmailSettings() {
  const toast = useToast()
  const { profile } = useAuth()
  const { data: settings, isLoading } = useEmailSettings()
  const updateMutation = useUpdateEmailSettings()
  const sendMutation = useSendTaskNotifications()

  // Per il test, prendo un task qualsiasi pubblicato
  const { data: tasks = [] } = useTasks({ status: 'published' })

  const [enabled, setEnabled] = useState(false)
  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled)
      setFromEmail(settings.from_email)
      setFromName(settings.from_name)
      setSubject(settings.subject_template)
      setBody(settings.body_template)
    }
  }, [settings])

  const isDirty = settings
    ? enabled !== settings.enabled ||
      fromEmail !== settings.from_email ||
      fromName !== settings.from_name ||
      subject !== settings.subject_template ||
      body !== settings.body_template
    : false

  useUnsavedChangesWarning(isDirty)

  const handleSave = async () => {
    setError(null)
    if (!fromEmail.trim() || !fromEmail.includes('@')) {
      setError('Email mittente non valida')
      return
    }
    if (!subject.trim()) {
      setError("L'oggetto non può essere vuoto")
      return
    }
    if (!body.trim()) {
      setError('Il corpo non può essere vuoto')
      return
    }
    try {
      await updateMutation.mutateAsync({
        enabled,
        from_email: fromEmail.trim(),
        from_name: fromName.trim() || 'Pienissimo Hub',
        subject_template: subject,
        body_template: body,
      })
      toast.show('Impostazioni salvate')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
    }
  }

  const handleSendTest = async () => {
    if (!profile) return
    if (isDirty) {
      toast.show('Salva prima le modifiche, poi invia il test', 'info')
      return
    }
    if (!enabled) {
      toast.show('Abilita prima le notifiche per fare il test', 'error')
      return
    }
    if (tasks.length === 0) {
      toast.show('Serve almeno un task pubblicato per fare il test', 'error')
      return
    }
    const firstTask = tasks[0]
    if (!firstTask) return
    try {
      const result = await sendMutation.mutateAsync({
        task_id: firstTask.id,
        recipient_ids: [profile.id],
      })
      if (result.sent > 0) {
        toast.show(`Email di test inviata a ${profile.email}`)
      } else {
        toast.show("L'invio è fallito, controlla la console", 'error')
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Errore: ${err.message}`
          : 'Errore sconosciuto'
      )
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  // Preview con valori di esempio
  const previewSubject = applyPlaceholders(subject, samplePlaceholders)
  const previewBody = applyPlaceholders(body, samplePlaceholders)

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Impostazioni email
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Configura il template delle notifiche inviate alla pubblicazione dei
          task.
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Toggle abilitato */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-full grid place-items-center shrink-0',
                  enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                )}
              >
                <Mail size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Notifiche email
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {enabled
                    ? 'Attive: al rilascio di un task potrai scegliere chi avvisare.'
                    : 'Disabilitate: il pulsante Pubblica non chiede niente.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
                enabled ? 'bg-pienissimo-blue' : 'bg-slate-200'
              )}
            >
              <span
                className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform mt-0.5',
                  enabled ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>

        {/* Mittente */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Mittente</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Nome
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Pienissimo Hub"
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="onboarding@resend.dev"
                className="form-input"
              />
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-start gap-2 leading-relaxed pt-2">
            <Info size={13} className="text-slate-400 shrink-0 mt-0.5" />
            <span>
              Per usare <code className="bg-slate-100 px-1 rounded">noreply@pienissimo.pro</code> come
              mittente devi prima verificare il dominio su Resend → Domains. Finché
              non è verificato, usa <code className="bg-slate-100 px-1 rounded">onboarding@resend.dev</code>.
            </span>
          </div>
        </div>

        {/* Placeholder disponibili */}
        <div className="bg-pienissimo-50/40 border border-pienissimo-100 rounded-2xl p-5">
          <h4 className="text-xs font-bold text-pienissimo-blue uppercase tracking-wider mb-3">
            Placeholder disponibili
          </h4>
          <div className="flex flex-wrap gap-2">
            {PLACEHOLDERS.map((p) => (
              <code
                key={p.key}
                className="text-xs bg-white border border-slate-200 px-2 py-1 rounded font-mono"
                title={p.desc}
              >
                {`{{${p.key}}}`}
              </code>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Saranno sostituiti con i valori del task al momento dell'invio.
          </p>
        </div>

        {/* Template */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Template</h3>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs font-semibold text-pienissimo-blue hover:text-pienissimo-dark flex items-center gap-1.5"
            >
              <Eye size={14} /> {showPreview ? 'Nascondi anteprima' : 'Anteprima'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Oggetto
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Corpo
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="form-input font-mono text-sm"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Supporta <code className="bg-slate-100 px-1 rounded">**grassetto**</code> e URL automatici.
            </p>
          </div>

          {showPreview && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Anteprima
              </h4>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Oggetto
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {previewSubject}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Corpo
                  </p>
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {previewBody}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Invia un'email di test a te stesso
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Userà il primo task pubblicato come esempio. Indirizzo: {profile?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleSendTest()}
            disabled={sendMutation.isPending || isDirty || !enabled}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Send size={14} />
            {sendMutation.isPending ? 'Invio...' : 'Invia test'}
          </button>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || updateMutation.isPending}
            className="px-4 py-2 bg-pienissimo-blue text-white rounded-lg text-sm font-semibold hover:bg-pienissimo-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {updateMutation.isPending ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </div>
      </div>
    </div>
  )
}

const samplePlaceholders: Record<string, string> = {
  titolo: 'Nuova versione 2.8.0 disponibile',
  tipi: 'Release, Aggiornamento',
  categoria: 'Frontend',
  autore: 'Nicola',
  anteprima:
    'Sono disponibili nuovi miglioramenti dell\'interfaccia e la correzione di alcuni bug minori.',
  link: 'https://pienissimo-hub.netlify.app/task/abc-123',
}

function applyPlaceholders(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`)
}
