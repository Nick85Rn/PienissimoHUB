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
  /** true se questo log è 'failed' ma c'è un invio successivo 'sent' */
  resolved: boolean
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

      // 2. Recupero i nomi dei sender
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

      // 3. Cerco quali failed sono "risolti" (hanno un sent successivo)
      const failedIds = logs
        .filter((l) => l.status === 'failed')
        .map((l) => l.id)

      let resolvedSet = new Set<string>()
      if (failedIds.length > 0) {
        const { data: resolvedIds } = await supabase.rpc(
          'get_resolved_log_ids',
          { p_log_ids: failedIds }
        )
        if (Array.isArray(resolvedIds)) {
          resolvedSet = new Set(resolvedIds as string[])
        }
      }

      // 4. Merge
      const enriched: EmailLogEnriched[] = logs.map((l) => ({
        ...l,
        sender_name: l.sent_by ? (senderMap.get(l.sent_by) ?? null) : null,
        resolved: resolvedSet.has(l.id),
      }))

      return { logs: enriched, total: count ?? 0 }
    },
    staleTime: 1000 * 30,
  })
}

/**
 * Statistiche "effettive" degli ultimi N giorni.
 * Per ogni coppia (task_id, recipient_email) conta solo l'ULTIMO tentativo.
 * Così i falliti rinviati con successo non contano più nei "falliti".
 */
export function useEmailStats(days = 7) {
  return useQuery({
    queryKey: [...KEY, 'stats', days],
    queryFn: async () => {
      const since = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000
      ).toISOString()

      const { data, error } = await supabase.rpc('get_email_stats_effective', {
        p_since: since,
      })

      if (error) throw error

      // La RPC restituisce una riga con sent, failed, total
      const row = Array.isArray(data) ? data[0] : data
      return {
        sent: Number(row?.sent ?? 0),
        failed: Number(row?.failed ?? 0),
        total: Number(row?.total ?? 0),
      }
    },
    staleTime: 1000 * 60,
  })
}

/**
 * Rinvia una notifica fallita ad un'email diretta.
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

/**
 * Carica TUTTI i logs falliti NON risolti (cioè quelli che non hanno
 * un invio successivo 'sent'). Usato dal bottone "Rinvia tutti i falliti".
 */
export async function fetchAllFailedLogs(filters: {
  search?: string
  dateFrom?: string
  dateTo?: string
}): Promise<EmailLog[]> {
  let query = supabase
    .from('task_notifications')
    .select('*')
    .eq('status', 'failed')
    .order('sent_at', { ascending: false })

  if (filters.search) {
    query = query.ilike('recipient_email', `%${filters.search}%`)
  }
  if (filters.dateFrom) {
    query = query.gte('sent_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('sent_at', filters.dateTo)
  }

  const { data, error } = await query
  if (error) throw error
  const allFailed = (data ?? []) as EmailLog[]

  // Filtra via i "risolti" (hanno già un sent successivo)
  if (allFailed.length === 0) return []

  const failedIds = allFailed.map((l) => l.id)
  const { data: resolvedIds } = await supabase.rpc('get_resolved_log_ids', {
    p_log_ids: failedIds,
  })
  const resolvedSet = new Set<string>(
    Array.isArray(resolvedIds) ? (resolvedIds as string[]) : []
  )

  return allFailed.filter((l) => !resolvedSet.has(l.id))
}

/**
 * Esegue il rinvio in massa, raggruppando per task_id.
 */
export async function bulkResendNotifications(
  failedLogs: EmailLog[],
  onProgress?: (done: number, total: number) => void
): Promise<{ sent: number; failed: number; skipped: number }> {
  const byTask = new Map<string, string[]>()
  for (const log of failedLogs) {
    if (!log.task_id) continue
    const list = byTask.get(log.task_id) ?? []
    if (!list.includes(log.recipient_email)) {
      list.push(log.recipient_email)
    }
    byTask.set(log.task_id, list)
  }

  let totalSent = 0
  let totalFailed = 0
  let totalSkipped = 0
  let done = 0
  const totalGroups = byTask.size

  for (const [task_id, emails] of byTask) {
    try {
      const { data, error } = await supabase.functions.invoke(
        'send-task-notifications',
        {
          body: {
            task_id,
            recipient_emails: emails,
            resend: true,
          },
        }
      )
      if (error) throw error
      if (data?.error) {
        totalSkipped += emails.length
      } else {
        const result = data as { sent: number; failed: number }
        totalSent += result.sent ?? 0
        totalFailed += result.failed ?? 0
      }
    } catch {
      totalSkipped += emails.length
    }
    done++
    onProgress?.(done, totalGroups)
  }

  return { sent: totalSent, failed: totalFailed, skipped: totalSkipped }
}
