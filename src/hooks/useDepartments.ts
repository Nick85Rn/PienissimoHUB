import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Department } from '@/types/database'

const DEPARTMENTS_KEY = ['departments'] as const

export function useDepartments() {
  return useQuery({
    queryKey: DEPARTMENTS_KEY,
    queryFn: async (): Promise<Department[]> => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('position', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []) as Department[]
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      color_class: string
      position?: number
    }): Promise<Department> => {
      const { data, error } = await supabase
        .from('departments')
        .insert({
          name: input.name.trim(),
          color_class: input.color_class,
          position: input.position ?? 999,
        })
        .select()
        .single()
      if (error) throw error
      return data as Department
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: DEPARTMENTS_KEY }),
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<Department, 'name' | 'color_class' | 'position'>>
    }): Promise<Department> => {
      const { data, error } = await supabase
        .from('departments')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Department
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: DEPARTMENTS_KEY }),
  })
}

export function useDeleteDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('departments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: DEPARTMENTS_KEY }),
  })
}
