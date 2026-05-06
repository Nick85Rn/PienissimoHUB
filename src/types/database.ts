// Tipi del database. Una volta che il progetto Supabase è creato,
// puoi rigenerarli automaticamente con `npm run types:gen`.

export type UserRole = 'master' | 'admin' | 'guest'

export type Department =
  | 'marketing'
  | 'commerciale'
  | 'zucchetti'
  | 'sviluppo'
  | 'amministrazione'
  | 'direzione'

export type TaskType =
  | 'release'
  | 'aggiornamento'
  | 'bugfix'
  | 'guida'
  | 'comunicazione'

export type TaskStatus = 'draft' | 'published' | 'archived'

export type BugStatus = 'aperto' | 'in_lavorazione' | 'risolto' | 'wontfix'

export type BugSeverity = 'bassa' | 'media' | 'alta' | 'critica'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  department: Department
  avatar_url: string | null
  created_at: string
  updated_at: string
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
  target_departments: Department[]
  status: TaskStatus
  bug_status: BugStatus | null
  bug_severity: BugSeverity | null
  attachment_url: string | null
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

// Task con relazioni espanse (come restituito dalle query con join)
export interface TaskWithRelations extends Task {
  category: Pick<Category, 'name' | 'color_class'> | null
  author: Pick<Profile, 'full_name' | 'department'> | null
  attachments?: TaskAttachment[]
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
  author: Pick<Profile, 'full_name' | 'department'> | null
}

// ---------------------------------------------------------------------
// Costanti UI
// ---------------------------------------------------------------------
export const DEPARTMENT_LABELS: Record<Department, string> = {
  marketing: 'Marketing',
  commerciale: 'Commerciale',
  zucchetti: 'Zucchetti',
  sviluppo: 'Sviluppo',
  amministrazione: 'Amministrazione',
  direzione: 'Direzione',
}

export const DEPARTMENT_COLORS: Record<Department, string> = {
  marketing: 'bg-pink-100 text-pink-700 border-pink-200',
  commerciale: 'bg-blue-100 text-blue-700 border-blue-200',
  zucchetti: 'bg-amber-100 text-amber-700 border-amber-200',
  sviluppo: 'bg-purple-100 text-purple-700 border-purple-200',
  amministrazione: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  direzione: 'bg-slate-100 text-slate-700 border-slate-200',
}

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

export const ALL_DEPARTMENTS: Department[] = [
  'marketing',
  'commerciale',
  'zucchetti',
  'sviluppo',
  'amministrazione',
  'direzione',
]
