import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task, TaskWithRelations } from '@/types/database'

const TASKS_KEY = ['tasks'] as const

interface TaskFilters {
  search?: string
  category_id?: string | null
  type?: string | null
  status?: 'all' | 'published' | 'draft' | 'archived'
  bug_status?: string | null
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: [...TASKS_KEY, filters],
    queryFn: async (): Promise<TaskWithRelations[]> => {
      let query = supabase
        .from('tasks')
        .select(
          `
          *,
          category:categories(name, color_class),
          author:profiles(full_name, department)
        `
        )
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id)
      }
      if (filters.type) {
        query = query.eq('type', filters.type)
      }
      if (filters.bug_status) {
        query = query.eq('bug_status', filters.bug_status)
      }
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as TaskWithRelations[]
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
        .select(
          `
          *,
          category:categories(name, color_class),
          author:profiles(full_name, department)
        `
        )
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data as TaskWithRelations | null
    },
  })
}

type TaskInsert = Omit<
  Task,
  'id' | 'created_at' | 'updated_at' | 'published_at' | 'excerpt'
> & { excerpt?: string | null }

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TaskInsert): Promise<Task> => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TASKS_KEY })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<TaskInsert>
    }): Promise<Task> => {
      const { data, error } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
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
