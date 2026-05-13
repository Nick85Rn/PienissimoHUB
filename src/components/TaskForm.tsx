import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Save,
  Send,
  ArrowLeft,
  Link as LinkIcon,
  AlertCircle,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { useCategories } from '@/hooks/useCategories'
import { useDepartments } from '@/hooks/useDepartments'
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks'
import {
  useTaskAttachments,
  useReplaceTaskAttachments,
} from '@/hooks/useTaskAttachments'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { RichTextEditor } from '@/components/RichTextEditor'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { makeExcerpt } from '@/lib/sanitize'
import { cn } from '@/lib/utils'
import {
  type TaskWithRelations,
  type TaskType,
  type BugStatus,
  type BugSeverity,
  TASK_TYPE_LABELS,
  TASK_TYPE_COLORS,
  BUG_STATUS_LABELS,
  BUG_SEVERITY_LABELS,
} from '@/types/database'

interface TaskFormProps {
  initial?: TaskWithRelations
  mode: 'create' | 'edit'
}

interface AttachmentDraft {
  id: string
  label: string
  url: string
}

function makeId() {
  return Math.random().toString(36).slice(2)
}

const ALL_TASK_TYPES: TaskType[] = [
  'aggiornamento',
  'release',
  'bugfix',
  'guida',
  'comunicazione',
]

export function TaskForm({ initial, mode }: TaskFormProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()
  const { data: categories = [] } = useCategories()
  const { data: departments = [] } = useDepartments()
  const createMutation = useCreateTask()
  const updateMutation = useUpdateTask()
  const replaceAttachments = useReplaceTaskAttachments()
  const { data: existingAttachments = [] } = useTaskAttachments(initial?.id)

  const initialDepartmentIds =
    initial?.task_departments?.map((td) => td.department.id) ?? []
  const initialTypes: TaskType[] =
    initial?.task_types?.map((t) => t.type) ?? ['aggiornamento']

  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [types, setTypes] = useState<TaskType[]>(initialTypes)
  const [categoryId, setCategoryId] = useState<string>(initial?.category_id ?? '')
  const [version, setVersion] = useState(initial?.version ?? '')
  const [departmentIds, setDepartmentIds] =
    useState<string[]>(initialDepartmentIds)
  const [bugStatus, setBugStatus] = useState<BugStatus | ''>(
    initial?.bug_status ?? ''
  )
  const [bugSeverity, setBugSeverity] = useState<BugSeverity | ''>(
    initial?.bug_severity ?? ''
  )

  const [attachments, setAttachments] = useState<AttachmentDraft[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const hasBugfix = types.includes('bugfix')

  useEffect(() => {
    if (mode === 'edit' && existingAttachments.length > 0) {
      setAttachments(
        existingAttachments.map((a) => ({
          id: a.id,
          label: a.label,
          url: a.url,
        }))
      )
    }
  }, [mode, existingAttachments])

  // Quando "bugfix" entra/esce dai tipi, gestisco i campi correlati
  useEffect(() => {
    if (hasBugfix) {
      if (!bugStatus) setBugStatus('aperto')
      if (!bugSeverity) setBugSeverity('media')
    } else {
      setBugStatus('')
      setBugSeverity('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBugfix])

  const toggleType = (t: TaskType) => {
    setTypes((prev) => {
      // Garantisce sempre almeno 1 tipo
      if (prev.includes(t)) {
        if (prev.length === 1) return prev // non lasciare il task senza tipo
        return prev.filter((x) => x !== t)
      }
      return [...prev, t]
    })
  }

  const isDirty = (() => {
    if (mode === 'create') {
      return (
        title.trim() !== '' ||
        (content.trim() !== '' && content.trim() !== '<p></p>') ||
        version.trim() !== '' ||
        categoryId !== '' ||
        departmentIds.length > 0 ||
        attachments.some((a) => a.label.trim() || a.url.trim()) ||
        types.length !== 1 ||
        types[0] !== 'aggiornamento'
      )
    }
    if (!initial) return false
    if (title !== initial.title) return true
    if (content !== initial.content) return true
    if (
      types.length !== initialTypes.length ||
      !types.every((t) => initialTypes.includes(t))
    ) {
      return true
    }
    if (categoryId !== (initial.category_id ?? '')) return true
    if (version !== (initial.version ?? '')) return true
    if (
      departmentIds.length !== initialDepartmentIds.length ||
      !departmentIds.every((id) => initialDepartmentIds.includes(id))
    ) {
      return true
    }
    if (bugStatus !== (initial.bug_status ?? '')) return true
    if (bugSeverity !== (initial.bug_severity ?? '')) return true
    if (attachments.length !== existingAttachments.length) return true
    for (let i = 0; i < attachments.length; i++) {
      const a = attachments[i]
      const e = existingAttachments[i]
      if (!a || !e) return true
      if (a.label !== e.label || a.url !== e.url) return true
    }
    return false
  })()

  useUnsavedChangesWarning(isDirty && !isSubmitting)

  const tryGoBack = () => {
    if (isDirty && !isSubmitting) {
      setShowLeaveConfirm(true)
    } else {
      navigate(-1)
    }
  }

  const toggleDepartment = (id: string) => {
    setDepartmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const addAttachment = () => {
    setAttachments((prev) => [...prev, { id: makeId(), label: '', url: '' }])
  }
  const updateAttachment = (id: string, patch: Partial<AttachmentDraft>) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    )
  }
  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }
  const moveAttachment = (id: string, direction: 'up' | 'down') => {
    setAttachments((prev) => {
      const idx = prev.findIndex((a) => a.id === id)
      if (idx === -1) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(idx, 1)
      if (item) next.splice(newIdx, 0, item)
      return next
    })
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
    if (types.length === 0) {
      setError('Seleziona almeno un tipo.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (hasBugfix && (!bugStatus || !bugSeverity)) {
      setError('Per i bug fix specifica stato e severità.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const filledAttachments = attachments.filter(
      (a) => a.label.trim() || a.url.trim()
    )
    for (const a of filledAttachments) {
      if (!a.label.trim()) {
        setError('Ogni allegato deve avere un nome.')
        return
      }
      if (!a.url.trim() || !/^https?:\/\//i.test(a.url.trim())) {
        setError(`L'URL "${a.url}" non è valido (deve iniziare con http:// o https://).`)
        return
      }
    }

    setIsSubmitting(true)
    setError(null)

    const excerpt = makeExcerpt(content, 180)

    const taskPayload = {
      title: title.trim(),
      content,
      excerpt,
      category_id: categoryId || null,
      version: version.trim() || null,
      status,
      bug_status: hasBugfix ? (bugStatus as BugStatus) : null,
      bug_severity: hasBugfix ? (bugSeverity as BugSeverity) : null,
      author_id: profile.id,
    }

    try {
      let taskId: string
      if (mode === 'create') {
        const created = await createMutation.mutateAsync({
          task: taskPayload,
          department_ids: departmentIds,
          types,
        })
        taskId = created.id
      } else if (initial) {
        await updateMutation.mutateAsync({
          id: initial.id,
          patch: taskPayload,
          department_ids: departmentIds,
          types,
        })
        taskId = initial.id
      } else {
        return
      }

      await replaceAttachments.mutateAsync({
        taskId,
        attachments: filledAttachments.map((a, idx) => ({
          label: a.label.trim(),
          url: a.url.trim(),
          position: idx,
        })),
      })

      toast.show(
        status === 'published'
          ? mode === 'create' ? 'Task pubblicato' : 'Modifiche pubblicate'
          : mode === 'create' ? 'Bozza salvata' : 'Modifiche salvate in bozza'
      )
      navigate(`/task/${taskId}`)
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
            onClick={tryGoBack}
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
        <input
          type="text"
          placeholder="Titolo del task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="w-full text-2xl md:text-3xl font-bold text-slate-900 placeholder:text-slate-300 outline-none border-b border-transparent focus:border-slate-200 pb-2 transition-colors"
        />

        {/* Tipi (multi-select) */}
        <Field
          label="Tipi *"
          hint="Seleziona uno o più tipi che descrivono il task."
        >
          <div className="flex flex-wrap gap-2">
            {ALL_TASK_TYPES.map((t) => {
              const active = types.includes(t)
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => toggleType(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                    active
                      ? cn(TASK_TYPE_COLORS[t], 'border-current')
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {TASK_TYPE_LABELS[t]}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
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

        {hasBugfix && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50/30 p-5 rounded-xl border border-red-100">
            <Field label="Stato del bug *">
              <select
                value={bugStatus}
                onChange={(e) => setBugStatus(e.target.value as BugStatus)}
                className="form-select"
              >
                <option value="" disabled>Seleziona...</option>
                {(Object.keys(BUG_STATUS_LABELS) as BugStatus[]).map((s) => (
                  <option key={s} value={s}>{BUG_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </Field>

            <Field label="Severità *">
              <select
                value={bugSeverity}
                onChange={(e) => setBugSeverity(e.target.value as BugSeverity)}
                className="form-select"
              >
                <option value="" disabled>Seleziona...</option>
                {(Object.keys(BUG_SEVERITY_LABELS) as BugSeverity[]).map((s) => (
                  <option key={s} value={s}>{BUG_SEVERITY_LABELS[s]}</option>
                ))}
              </select>
            </Field>
          </div>
        )}

        <Field
          label="Reparti interessati"
          hint="Indica a chi è utile questo task. Solo informativo, non filtra la visibilità."
        >
          {departments.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Nessun reparto definito. Vai su Reparti per crearli.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {departments.map((d) => {
                const active = departmentIds.includes(d.id)
                return (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => toggleDepartment(d.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                      active
                        ? 'bg-pienissimo-blue text-white border-pienissimo-blue'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {d.name}
                  </button>
                )
              })}
            </div>
          )}
        </Field>

        <Field
          label="Link e allegati"
          hint="Aggiungi tutti i link utili: documentazione, video, screenshot, ecc."
        >
          <div className="space-y-2">
            {attachments.map((a, idx) => (
              <div
                key={a.id}
                className="flex items-stretch gap-2 group bg-slate-50/40 border border-slate-200 rounded-xl p-2"
              >
                <div className="flex flex-col gap-1 justify-center">
                  <button
                    type="button"
                    onClick={() => moveAttachment(a.id, 'up')}
                    disabled={idx === 0}
                    className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Sposta su"
                  >
                    <GripVertical size={14} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveAttachment(a.id, 'down')}
                    disabled={idx === attachments.length - 1}
                    className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Sposta giù"
                  >
                    <GripVertical size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Nome (es. Documentazione tecnica)"
                  value={a.label}
                  onChange={(e) => updateAttachment(a.id, { label: e.target.value })}
                  maxLength={100}
                  className="form-input flex-1 max-w-xs"
                />
                <div className="relative flex-1">
                  <LinkIcon
                    className="absolute left-3 top-3 text-slate-400"
                    size={14}
                  />
                  <input
                    type="url"
                    placeholder="https://..."
                    value={a.url}
                    onChange={(e) => updateAttachment(a.id, { url: e.target.value })}
                    className="form-input pl-9"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Rimuovi"
                  title="Rimuovi"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAttachment}
              className="w-full py-2.5 border-2 border-dashed border-slate-200 text-slate-500 hover:text-pienissimo-blue hover:border-pienissimo-blue/40 hover:bg-pienissimo-50/40 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={14} /> Aggiungi link
            </button>
          </div>
        </Field>

        <Field label="Contenuto *">
          <RichTextEditor content={content} onChange={setContent} />
        </Field>
      </div>

      <ConfirmDialog
        open={showLeaveConfirm}
        title="Modifiche non salvate"
        message="Hai modifiche non salvate. Vuoi davvero uscire? Tutte le modifiche andranno perse."
        confirmLabel="Esci senza salvare"
        cancelLabel="Continua a modificare"
        variant="warning"
        onConfirm={() => {
          setShowLeaveConfirm(false)
          navigate(-1)
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />
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
