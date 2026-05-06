import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, Send, ArrowLeft, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { useCategories } from '@/hooks/useCategories'
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import { RichTextEditor } from '@/components/RichTextEditor'
import { makeExcerpt } from '@/lib/sanitize'
import { cn } from '@/lib/utils'
import {
  type Task,
  type TaskType,
  type Department,
  type BugStatus,
  type BugSeverity,
  TASK_TYPE_LABELS,
  BUG_STATUS_LABELS,
  BUG_SEVERITY_LABELS,
  DEPARTMENT_LABELS,
  ALL_DEPARTMENTS,
} from '@/types/database'

interface TaskFormProps {
  initial?: Task
  mode: 'create' | 'edit'
}

export function TaskForm({ initial, mode }: TaskFormProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()
  const { data: categories = [] } = useCategories()
  const createMutation = useCreateTask()
  const updateMutation = useUpdateTask()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [type, setType] = useState<TaskType>(initial?.type ?? 'aggiornamento')
  const [categoryId, setCategoryId] = useState<string>(initial?.category_id ?? '')
  const [version, setVersion] = useState(initial?.version ?? '')
  const [attachmentUrl, setAttachmentUrl] = useState(initial?.attachment_url ?? '')
  const [targetDepartments, setTargetDepartments] = useState<Department[]>(
    initial?.target_departments ?? []
  )
  const [bugStatus, setBugStatus] = useState<BugStatus | ''>(
    initial?.bug_status ?? ''
  )
  const [bugSeverity, setBugSeverity] = useState<BugSeverity | ''>(
    initial?.bug_severity ?? ''
  )

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // pre-popola bug fields se cambia il tipo
  useEffect(() => {
    if (type === 'bugfix') {
      if (!bugStatus) setBugStatus('aperto')
      if (!bugSeverity) setBugSeverity('media')
    } else {
      setBugStatus('')
      setBugSeverity('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  const toggleDepartment = (d: Department) => {
    setTargetDepartments((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
  }

  const handleSave = async (status: 'draft' | 'published') => {
    if (!profile) return

    if (!title.trim() || title.trim().length < 3) {
      setError('Il titolo deve avere almeno 3 caratteri.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!content.trim() || content === '<p></p>') {
      setError('Il contenuto non può essere vuoto.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (type === 'bugfix' && (!bugStatus || !bugSeverity)) {
      setError('Per i bug fix specifica stato e severità.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setIsSubmitting(true)
    setError(null)

    const excerpt = makeExcerpt(content, 180)

    const payload = {
      title: title.trim(),
      content,
      excerpt,
      type,
      category_id: categoryId || null,
      version: version.trim() || null,
      attachment_url: attachmentUrl.trim() || null,
      target_departments: targetDepartments,
      status,
      bug_status: type === 'bugfix' ? (bugStatus as BugStatus) : null,
      bug_severity: type === 'bugfix' ? (bugSeverity as BugSeverity) : null,
      author_id: profile.id,
    }

    try {
      if (mode === 'create') {
        const created = await createMutation.mutateAsync(payload)
        toast.show(
          status === 'published' ? 'Task pubblicato' : 'Bozza salvata'
        )
        navigate(`/task/${created.id}`)
      } else if (initial) {
        await updateMutation.mutateAsync({ id: initial.id, patch: payload })
        toast.show(
          status === 'published'
            ? 'Modifiche pubblicate'
            : 'Modifiche salvate in bozza'
        )
        navigate(`/task/${initial.id}`)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Errore durante il salvataggio: ${err.message}`
          : 'Errore sconosciuto'
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
            aria-label="Torna indietro"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              {mode === 'create' ? 'Nuovo task' : 'Modifica task'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'create'
                ? 'Crea un nuovo aggiornamento, rilascio o bug fix.'
                : 'Stai modificando un task esistente.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSave('draft')}
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={14} /> Salva bozza
          </button>
          <button
            type="button"
            onClick={() => void handleSave('published')}
            disabled={isSubmitting}
            className="px-4 py-2 bg-pienissimo-blue text-white rounded-lg text-sm font-semibold hover:bg-pienissimo-dark shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Send size={14} />
            {isSubmitting ? 'Salvataggio...' : 'Pubblica'}
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-6">
        {/* Title */}
        <input
          type="text"
          placeholder="Titolo del task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="w-full text-2xl md:text-3xl font-bold text-slate-900 placeholder:text-slate-300 outline-none border-b border-transparent focus:border-slate-200 pb-2 transition-colors"
        />

        {/* Meta grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
          <Field label="Tipo *">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              className="form-select"
            >
              {(
                [
                  'aggiornamento',
                  'release',
                  'bugfix',
                  'guida',
                  'comunicazione',
                ] as TaskType[]
              ).map((t) => (
                <option key={t} value={t}>
                  {TASK_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Categoria">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="form-select"
            >
              <option value="">Nessuna</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Versione">
            <input
              type="text"
              placeholder="es. 2.8.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="form-input"
            />
          </Field>
        </div>

        {/* Bug-specific fields */}
        {type === 'bugfix' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50/30 p-5 rounded-xl border border-red-100">
            <Field label="Stato del bug *">
              <select
                value={bugStatus}
                onChange={(e) => setBugStatus(e.target.value as BugStatus)}
                className="form-select"
              >
                <option value="" disabled>
                  Seleziona...
                </option>
                {(Object.keys(BUG_STATUS_LABELS) as BugStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {BUG_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Severità *">
              <select
                value={bugSeverity}
                onChange={(e) => setBugSeverity(e.target.value as BugSeverity)}
                className="form-select"
              >
                <option value="" disabled>
                  Seleziona...
                </option>
                {(Object.keys(BUG_SEVERITY_LABELS) as BugSeverity[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {BUG_SEVERITY_LABELS[s]}
                    </option>
                  )
                )}
              </select>
            </Field>
          </div>
        )}

        {/* Target departments */}
        <Field
          label="Reparti interessati"
          hint="Indica a chi è utile questo task (puramente informativo, non filtra la visibilità)"
        >
          <div className="flex flex-wrap gap-2">
            {ALL_DEPARTMENTS.map((d) => {
              const active = targetDepartments.includes(d)
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDepartment(d)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                    active
                      ? 'bg-pienissimo-blue text-white border-pienissimo-blue'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {DEPARTMENT_LABELS[d]}
                </button>
              )
            })}
          </div>
        </Field>

        {/* Attachment URL */}
        <Field label="Allegato esterno (Zoho WorkDrive, Drive...)">
          <div className="relative">
            <LinkIcon
              className="absolute left-4 top-3 text-slate-400"
              size={16}
            />
            <input
              type="url"
              placeholder="https://workdrive.zoho.eu/..."
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              className="form-input pl-10"
            />
          </div>
        </Field>

        {/* Editor */}
        <Field label="Contenuto *">
          <RichTextEditor content={content} onChange={setContent} />
        </Field>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
