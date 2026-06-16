import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TaskType, BugStatus, BugSeverity } from '@/types/database'

export interface EmbedSettings {
  id: number
  enabled: boolean
  access_key: string
  allowed_types: TaskType[]
  allowed_category_ids: string[]
  max_items: number
  updated_at: string
  updated_by: string | null
}

const KEY = ['embed-settings'] as const

export function useEmbedSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<EmbedSettings | null> => {
      const { data, error } = await supabase
        .from('embed_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle<EmbedSettings>()
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60,
  })
}

export function useUpdateEmbedSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<EmbedSettings>): Promise<EmbedSettings> => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('embed_settings')
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq('id', 1)
        .select()
        .single()
      if (error) throw error
      return data as EmbedSettings
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  })
}

/**
 * Rigenera la chiave di accesso.
 * Lato client generiamo un valore casuale forte e lo salviamo.
 */
export function useRegenerateAccessKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<string> => {
      // Genera 24 byte casuali → 48 char hex
      const bytes = new Uint8Array(24)
      crypto.getRandomValues(bytes)
      const newKey = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('embed_settings')
        .update({
          access_key: newKey,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq('id', 1)
      if (error) throw error
      return newKey
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  })
}

// =====================================================================
// Hook pubblici (usati nella rotta /embed, senza auth)
// =====================================================================

export interface EmbedTask {
  id: string
  title: string
  excerpt: string | null
  content: string
  version: string | null
  bug_status: BugStatus | null
  bug_severity: BugSeverity | null
  published_at: string | null
  created_at: string
  category_name: string | null
  category_color_class: string | null
  author_name: string | null
  task_types: string[]
}

export interface EmbedTaskDetail extends EmbedTask {
  attachments: { label: string; url: string }[]
}

export function useEmbedTasks(accessKey: string | null) {
  return useQuery({
    queryKey: ['embed-tasks', accessKey],
    enabled: Boolean(accessKey),
    queryFn: async (): Promise<EmbedTask[]> => {
      if (!accessKey) return []
      const { data, error } = await supabase.rpc('get_embed_tasks', {
        p_access_key: accessKey,
      })
      if (error) throw error
      return (data ?? []) as EmbedTask[]
    },
    staleTime: 1000 * 60, // 1 min
  })
}

export function useEmbedTaskDetail(
  accessKey: string | null,
  taskId: string | null
) {
  return useQuery({
    queryKey: ['embed-task-detail', accessKey, taskId],
    enabled: Boolean(accessKey && taskId),
    queryFn: async (): Promise<EmbedTaskDetail | null> => {
      if (!accessKey || !taskId) return null
      const { data, error } = await supabase.rpc('get_embed_task_detail', {
        p_access_key: accessKey,
        p_task_id: taskId,
      })
      if (error) throw error
      // RPC restituisce un array (anche se ha 1 sola riga)
      return (Array.isArray(data) ? data[0] : data) ?? null
    },
  })
}
