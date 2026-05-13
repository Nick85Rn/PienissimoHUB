import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task, TaskType, TaskWithRelations } from '@/types/database'

const TASKS_KEY = ['tasks'] as const

const TASK_SELECT = `
  *,
  category:category_id(name, color_class),
  author:profiles!tasks_author_profile_fkey(
    full_name,
    department:department_id(name, color_class)
  ),
  task_departments(
    department:department_id(id, name, color_class)
  ),
  task_types(type)
`

interface TaskFilters {
  search?: string
  category_id?: string | null
  type?: TaskType | null
  status?: 'all' | 'published' | 'draft' | 'archived'
  bug_status?: string | null
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: [...TASKS_KEY, filters],
    queryFn: async (): Promise<TaskWithRelations[]> => {
      let query = supabase
        .from('tasks')
        .select(TASK_SELECT)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id)
      }
      if (filters.bug_status) {
        query = query.eq('bug_status', filters.bug_status)
      }
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%,content.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      let result = (data ?? []) as unknown as TaskWithRelations[]

      // Il filtro per tipo si fa client-side: PostgREST non supporta filtri
      // diretti sulle tabelle embedded. Per liste piccole-medie va benissimo.
      if (filters.type) {
        result = result.filter((t) =>
          t.task_types?.some((tt) => tt.type === filters.type)
        )
      }

      return result
    },
  })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: [...TASKS_KEY, 'one', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<TaskWithRelations | null> => {
      if (!id) return null
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data as unknown as TaskWithRelations | null
    },
  })
}

// =====================================================================
// Mutation
// =====================================================================

type TaskInsertCore = Omit<
  Task,
  'id' | 'created_at' | 'updated_at' | 'published_at' | 'excerpt'
> & { excerpt?: string | null }

interface CreateTaskInput {
  task: TaskInsertCore
  department_ids: string[]
  types: TaskType[]
}

async function replaceTaskTypes(taskId: string, types: TaskType[]): Promise<void> {
  const { error: delErr } = await supabase
    .from('task_types')
    .delete()
    .eq('task_id', taskId)
  if (delErr) throw delErr
  if (types.length === 0) return
  const rows = types.map((t) => ({ task_id: taskId, type: t }))
  const { error: insErr } = await supabase.from('task_types').insert(rows)
  if (insErr) throw insErr
}

async function replaceTaskDepartments(
  taskId: string,
  deptIds: string[]
): Promise<void> {
  const { error: delErr } = await supabase
    .from('task_departments')
    .delete()
    .eq('task_id', taskId)
  if (delErr) throw delErr
  if (deptIds.length === 0) return
  const rows = deptIds.map((dept_id) => ({
    task_id: taskId,
    department_id: dept_id,
  }))
  const { error: insErr } = await supabase.from('task_departments').insert(rows)
  if (insErr) throw insErr
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<Task> => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(input.task)
        .select()
        .single()
      if (error) throw error
      const created = data as Task

      await replaceTaskTypes(created.id, input.types)
      if (input.department_ids.length > 0) {
        await replaceTaskDepartments(created.id, input.department_ids)
      }

      return created
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TASKS_KEY })
    },
  })
}

interface UpdateTaskInput {
  id: string
  patch: Partial<TaskInsertCore>
  department_ids: string[]
  types: TaskType[]
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateTaskInput): Promise<Task> => {
      const { data, error } = await supabase
        .from('tasks')
        .update(input.patch)
        .eq('id', input.id)
        .select()
        .single()
      if (error) throw error

      await replaceTaskTypes(input.id, input.types)
      await replaceTaskDepartments(input.id, input.department_ids)

      return data as Task
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: TASKS_KEY })
      void qc.invalidateQueries({ queryKey: [...TASKS_KEY, 'one', variables.id] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TASKS_KEY })
    },
  })
}
