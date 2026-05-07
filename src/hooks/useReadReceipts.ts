import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const READ_KEY = ['read-receipts'] as const

interface ReadReceipt {
  task_id: string
  read_at: string
}

/**
 * Restituisce un Set degli id dei task letti dall'utente corrente.
 * Questo formato rende velocissimo il lookup `readSet.has(taskId)`.
 */
export function useReadTaskIds() {
  return useQuery({
    queryKey: READ_KEY,
    queryFn: async (): Promise<Set<string>> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return new Set()

      const { data, error } = await supabase
        .from('read_receipts')
        .select('task_id, read_at')
        .eq('user_id', user.id)
      if (error) throw error
      const ids = (data ?? []).map((r) => (r as ReadReceipt).task_id)
      return new Set(ids)
    },
    staleTime: 1000 * 30,
  })
}

/**
 * Segna un task come letto. Idempotente.
 */
export function useMarkTaskRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // upsert: se la riga esiste già non fa niente, altrimenti la crea
      const { error } = await supabase
        .from('read_receipts')
        .upsert(
          { user_id: user.id, task_id: taskId },
          { onConflict: 'user_id,task_id', ignoreDuplicates: true }
        )
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: READ_KEY })
    },
  })
}
