import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CommentWithAuthor } from '@/types/database'

// Hint FK esplicito: il commento ha author_id → profiles.id
const COMMENT_SELECT = `
  *,
  author:profiles!comments_author_id_fkey(full_name, department)
`

export function useComments(taskId: string | undefined) {
  const qc = useQueryClient()
  const queryKey = ['comments', taskId] as const

  const query = useQuery({
    queryKey,
    enabled: Boolean(taskId),
    queryFn: async (): Promise<CommentWithAuthor[]> => {
      if (!taskId) return []
      const { data, error } = await supabase
        .from('comments')
        .select(COMMENT_SELECT)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as CommentWithAuthor[]
    },
  })

  // Realtime
  useEffect(() => {
    if (!taskId) return
    const channel = supabase
      .channel(`comments:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [taskId, qc, queryKey])

  return query
}

export function useCreateComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { task_id: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessione non valida')
      const { data, error } = await supabase
        .from('comments')
        .insert({ ...input, author_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['comments', variables.task_id] })
    },
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      task_id: _task_id,
    }: {
      id: string
      task_id: string
    }): Promise<void> => {
      const { error } = await supabase.from('comments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, variables) => {
      void qc.invalidateQueries({ queryKey: ['comments', variables.task_id] })
    },
  })
}
