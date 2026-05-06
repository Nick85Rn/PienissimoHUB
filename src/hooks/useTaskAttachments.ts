import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TaskAttachment } from '@/types/database'

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-attachments', taskId],
    enabled: Boolean(taskId),
    queryFn: async (): Promise<TaskAttachment[]> => {
      if (!taskId) return []
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as TaskAttachment[]
    },
  })
}

interface AttachmentInput {
  label: string
  url: string
  position?: number
}

/**
 * Sostituisce l'intera lista di allegati per un task.
 * Cancella tutti gli esistenti e inserisce i nuovi (più semplice
 * della diff, e va bene per liste piccole).
 */
export function useReplaceTaskAttachments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      taskId,
      attachments,
    }: {
      taskId: string
      attachments: AttachmentInput[]
    }) => {
      // 1. cancella tutti gli esistenti
      const { error: deleteErr } = await supabase
        .from('task_attachments')
        .delete()
        .eq('task_id', taskId)
      if (deleteErr) throw deleteErr

      // 2. inserisce i nuovi (se ce ne sono)
      if (attachments.length === 0) return

      const rows = attachments.map((a, idx) => ({
        task_id: taskId,
        label: a.label.trim(),
        url: a.url.trim(),
        position: a.position ?? idx,
      }))

      const { error: insertErr } = await supabase
        .from('task_attachments')
        .insert(rows)
      if (insertErr) throw insertErr
    },
    onSuccess: (_d, variables) => {
      void qc.invalidateQueries({
        queryKey: ['task-attachments', variables.taskId],
      })
    },
  })
}
