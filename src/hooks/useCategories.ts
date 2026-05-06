import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/types/database'

const CATEGORIES_KEY = ['categories'] as const

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      if (error) throw error
      return (data ?? []) as Category[]
    },
    staleTime: 1000 * 60 * 5, // 5 min: le categorie cambiano raramente
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      color_class: string
      description?: string
    }): Promise<Category> => {
      const { data, error } = await supabase
        .from('categories')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Category
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<Category, 'name' | 'color_class' | 'description'>>
    }): Promise<Category> => {
      const { data, error } = await supabase
        .from('categories')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Category
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  })
}
