import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface EmailSettings {
  id: number
  enabled: boolean
  from_email: string
  from_name: string
  subject_template: string
  body_template: string
  updated_at: string
  updated_by: string | null
}

const KEY = ['email-settings'] as const

export function useEmailSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<EmailSettings | null> => {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle<EmailSettings>()
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60,
  })
}

export function useUpdateEmailSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<EmailSettings>): Promise<EmailSettings> => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('email_settings')
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        })
        .eq('id', 1)
        .select()
        .single()
      if (error) throw error
      return data as EmailSettings
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  })
}

/**
 * Wrapper attorno alla Edge Function send-task-notifications.
 */
export function useSendTaskNotifications() {
  return useMutation({
    mutationFn: async (input: {
      task_id: string
      recipient_ids: string[]
    }) => {
      const { data, error } = await supabase.functions.invoke(
        'send-task-notifications',
        { body: input }
      )
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data as { ok: boolean; sent: number; failed: number }
    },
  })
}
