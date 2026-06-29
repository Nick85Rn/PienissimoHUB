import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface EmailLog {
  id: string
  task_id: string
  recipient_id: string | null
  recipient_email: string
  sent_at: string
  status: 'sent' | 'failed'
  error_message: string | null
  sent_by: string | null
}

export interface EmailLogEnriched extends EmailLog {
  task: { id: string; title: string } | null
  sender_name: string | null
}

interface LogFilters {
  status?: 'sent' | 'failed' | 'all'
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

const KEY = ['email-logs'] as const

export function useEmailLogs(filters: LogFilters = {}) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => {
      const page = filters.page ?? 0
      const pageSize = filters.pageSize ?? 50
      const from = page * pageSize
      const to = from + pageSize - 1

      // 1. Carico i logs con task embedded
      let query = supabase
        .from('task_notifications')
        .select(
          `
          *,
          task:task_id(id, title)
          `,
          { count: 'exact' }
        )
        .order('sent_at', { ascending: false })
        .range(from, to)

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.search) {
        query = query.ilike('recipient_email', `%${filters.search}%`)
      }
      if (filters.dateFrom) {
        query = query.gte('sent_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('sent_at', filters.dateTo)
      }

      const { data, error, count } = await query
      if (error) throw error
      const logs = (data ?? []) as unknown as (EmailLog & {
        task: { id: string; title: string } | null
      })[]

      // 2. Recupero i nomi dei sender in una seconda query
      const senderIds = Array.from(
        new Set(logs.map((l) => l.sent_by).filter((x): x is string => Boolean(x)))
      )
      let senderMap = new Map<string, string>()
      if (senderIds.length > 0) {
        const { data: senders } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', senderIds)
        senderMap = new Map(
          (senders ?? []).map((s) => [s.id as string, s.full_name as string])
        )
      }

      // 3. Merge
      const enriched: EmailLogEnriched[] = logs.map((l) => ({
        ...l,
        sender_name: l.sent_by ? (senderMap.get(l.sent_by) ?? null) : null,
      }))

      return { logs: enriched, total: count ?? 0 }
    },
    staleTime: 1000 * 30,
  })
}

/**
 * Statistiche aggregate degli ultimi N giorni.
 */
export function useEmailStats(days = 7) {
  return useQuery({
    queryKey: [...KEY, 'stats', days],
    queryFn: async () => {
      const since = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000
      ).toISOString()
      const { data, error } = await supabase
        .from('task_notifications')
        .select('status')
        .gte('sent_at', since)
      if (error) throw error
      const rows = (data ?? []) as { status: 'sent' | 'failed' }[]
      const sent = rows.filter((r) => r.status === 'sent').length
      const failed = rows.filter((r) => r.status === 'failed').length
      return { sent, failed, total: rows.length }
    },
    staleTime: 1000 * 60,
  })
}

/**
 * Rinvia una notifica fallita ad un'email diretta (non più legata ad
 * un user_id, perché potrebbe non esistere più).
 */
export function useResendNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      task_id: string
      recipient_email: string
    }) => {
      const { data, error } = await supabase.functions.invoke(
        'send-task-notifications',
        {
          body: {
            task_id: input.task_id,
            recipient_emails: [input.recipient_email],
            resend: true,
          },
        }
      )
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data as { ok: boolean; sent: number; failed: number }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  })
}
