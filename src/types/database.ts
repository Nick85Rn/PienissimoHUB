// =====================================================================
// Tipi del database. Sincronizzati a mano con lo schema Supabase.
// Quando il progetto è stabile e hai la CLI, puoi rigenerarli con
// `npm run types:gen`.
// =====================================================================

export type UserRole = 'master' | 'admin' | 'guest'

// Department è ora una tabella editabile, non più un enum.
// Il vecchio enum `department_type` resta nel DB per compatibilità ma
// non è più usato dal frontend.

export type TaskType =
  | 'release'
  | 'aggiornamento'
  | 'bugfix'
  | 'guida'
  | 'comunicazione'

export type TaskStatus = 'draft' | 'published' | 'archived'

export type BugStatus = 'aperto' | 'in_lavorazione' | 'risolto' | 'wontfix'

export type BugSeverity = 'bassa' | 'media' | 'alta' | 'critica'

// ---------------------------------------------------------------------
// Tabelle
// ---------------------------------------------------------------------
export interface Department {
  id: string
  name: string
  color_class: string
  position: number
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  department_id: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ProfileWithDepartment extends Profile {
  department: Pick<Department, 'name' | 'color_class'> | null
}

export interface Category {
  id: string
  name: string
  color_class: string
  description: string | null
  created_at: string
}

export interface Task {
  id: string
  title: string
  excerpt: string | null
  content: string
  type: TaskType
  category_id: string | null
  version: string | null
  status: TaskStatus
  bug_status: BugStatus | null
  bug_severity: BugSeverity | null
  author_id: string
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface TaskAttachment {
  id: string
  task_id: string
  label: string
  url: string
  position: number
  created_at: string
}

export interface TaskWithRelations extends Task {
  category: Pick<Category, 'name' | 'color_class'> | null
  author: Pick<Profile, 'full_name'> & {
    department: Pick<Department, 'name' | 'color_class'> | null
  } | null
  task_departments: { department: Pick<Department, 'id' | 'name' | 'color_class'> }[]
}

export interface Comment {
  id: string
  task_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface CommentWithAuthor extends Comment {
  author: (Pick<Profile, 'full_name'> & {
    department: Pick<Department, 'name'> | null
  }) | null
}

// ---------------------------------------------------------------------
// Costanti UI (residue, non più reparto-specifiche)
// ---------------------------------------------------------------------
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  release: 'Release',
  aggiornamento: 'Aggiornamento',
  bugfix: 'Bug Fix',
  guida: 'Guida',
  comunicazione: 'Comunicazione',
}

export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  release: 'bg-emerald-100 text-emerald-700',
  aggiornamento: 'bg-blue-100 text-blue-700',
  bugfix: 'bg-red-100 text-red-700',
  guida: 'bg-purple-100 text-purple-700',
  comunicazione: 'bg-slate-100 text-slate-700',
}

export const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  aperto: 'Aperto',
  in_lavorazione: 'In lavorazione',
  risolto: 'Risolto',
  wontfix: 'Non risolveremo',
}

export const BUG_STATUS_COLORS: Record<BugStatus, string> = {
  aperto: 'bg-red-100 text-red-700 border-red-200',
  in_lavorazione: 'bg-amber-100 text-amber-700 border-amber-200',
  risolto: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  wontfix: 'bg-slate-100 text-slate-700 border-slate-200',
}

export const BUG_SEVERITY_LABELS: Record<BugSeverity, string> = {
  bassa: 'Bassa',
  media: 'Media',
  alta: 'Alta',
  critica: 'Critica',
}

export const BUG_SEVERITY_COLORS: Record<BugSeverity, string> = {
  bassa: 'bg-slate-100 text-slate-700',
  media: 'bg-amber-100 text-amber-700',
  alta: 'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
}

// Palette di colori predefinita per nuovi reparti / categorie
export const DEPARTMENT_COLOR_OPTIONS: { label: string; class: string }[] = [
  { label: 'Rosa', class: 'bg-pink-100 text-pink-700 border-pink-200' },
  { label: 'Blu', class: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Giallo', class: 'bg-amber-100 text-amber-700 border-amber-200' },
  { label: 'Viola', class: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'Verde', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Grigio', class: 'bg-slate-100 text-slate-700 border-slate-200' },
  { label: 'Rosso', class: 'bg-red-100 text-red-700 border-red-200' },
  { label: 'Arancio', class: 'bg-orange-100 text-orange-700 border-orange-200' },
  { label: 'Ciano', class: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { label: 'Indaco', class: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
]
