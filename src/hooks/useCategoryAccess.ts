import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// =====================================================================
// USER CATEGORIES — quali categorie può vedere un singolo utente
// =====================================================================

export function useUserCategories(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-categories', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<string[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('user_categories')
        .select('category_id')
        .eq('user_id', userId)
      if (error) throw error
      return (data ?? []).map((r) => r.category_id as string)
    },
  })
}

/**
 * Sostituisce l'intera lista di categorie di un utente.
 * Cancella tutto e re-inserisce. È più semplice della diff e va bene
 * per liste piccole (< 50 categorie).
 */
export function useReplaceUserCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { userId: string; categoryIds: string[] }) => {
      const { error: delErr } = await supabase
        .from('user_categories')
        .delete()
        .eq('user_id', input.userId)
      if (delErr) throw delErr

      if (input.categoryIds.length === 0) return

      const rows = input.categoryIds.map((cid) => ({
        user_id: input.userId,
        category_id: cid,
      }))
      const { error: insErr } = await supabase
        .from('user_categories')
        .insert(rows)
      if (insErr) throw insErr
    },
    onSuccess: (_d, variables) => {
      void qc.invalidateQueries({
        queryKey: ['user-categories', variables.userId],
      })
      // Invalida anche la lista task: l'utente ora vede cose diverse
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// =====================================================================
// DEPARTMENT CATEGORIES — categorie default per reparto
// =====================================================================

export function useDepartmentCategories(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['department-categories', departmentId],
    enabled: Boolean(departmentId),
    queryFn: async (): Promise<string[]> => {
      if (!departmentId) return []
      const { data, error } = await supabase
        .from('department_categories')
        .select('category_id')
        .eq('department_id', departmentId)
      if (error) throw error
      return (data ?? []).map((r) => r.category_id as string)
    },
  })
}

export function useReplaceDepartmentCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      departmentId: string
      categoryIds: string[]
    }) => {
      const { error: delErr } = await supabase
        .from('department_categories')
        .delete()
        .eq('department_id', input.departmentId)
      if (delErr) throw delErr

      if (input.categoryIds.length === 0) return

      const rows = input.categoryIds.map((cid) => ({
        department_id: input.departmentId,
        category_id: cid,
      }))
      const { error: insErr } = await supabase
        .from('department_categories')
        .insert(rows)
      if (insErr) throw insErr
    },
    onSuccess: (_d, variables) => {
      void qc.invalidateQueries({
        queryKey: ['department-categories', variables.departmentId],
      })
    },
  })
}

/**
 * Reimposta le categorie di un utente copiandole dal suo reparto.
 * Utile come bottone "Resetta dalle default del reparto".
 */
export function useResetUserCategoriesFromDept() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { userId: string; departmentId: string }) => {
      // 1. leggi le default del reparto
      const { data: deptCats, error: readErr } = await supabase
        .from('department_categories')
        .select('category_id')
        .eq('department_id', input.departmentId)
      if (readErr) throw readErr

      // 2. cancella tutte le user_categories esistenti
      const { error: delErr } = await supabase
        .from('user_categories')
        .delete()
        .eq('user_id', input.userId)
      if (delErr) throw delErr

      // 3. inserisci le nuove
      const ids = (deptCats ?? []).map((r) => r.category_id as string)
      if (ids.length > 0) {
        const rows = ids.map((cid) => ({
          user_id: input.userId,
          category_id: cid,
        }))
        const { error: insErr } = await supabase
          .from('user_categories')
          .insert(rows)
        if (insErr) throw insErr
      }
      return ids
    },
    onSuccess: (_d, variables) => {
      void qc.invalidateQueries({
        queryKey: ['user-categories', variables.userId],
      })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
