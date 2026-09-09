import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PinnedTaskRef {
  id: string
  title: string
}

const MAX_PINNED = 3

/**
 * Legge la lista (leggera: solo id + title) dei task attualmente
 * pinnati nell'embed pubblico. Usato dal TaskForm per disabilitare
 * in anticipo la checkbox "Pinna" quando il limite è già raggiunto,
 * invece di far scoprire l'errore solo al salvataggio.
 */
export function usePinnedEmbedTasks() {
  return useQuery({
    queryKey: ['pinned-embed-tasks'],
    queryFn: async (): Promise<PinnedTaskRef[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('pinned_in_embed', true)
        .order('title')
      if (error) throw error
      return (data ?? []) as PinnedTaskRef[]
    },
    staleTime: 1000 * 30,
  })
}

export { MAX_PINNED }
