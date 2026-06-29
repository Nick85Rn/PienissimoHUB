import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Mail,
  ExternalLink,
} from 'lucide-react'
import {
  useEmailLogs,
  useEmailStats,
  useResendNotification,
  fetchAllFailedLogs,
  bulkResendNotifications,
  type EmailLogEnriched,
} from '@/hooks/useEmailLogs'
import { useToast } from '@/context/ToastContext'
import { useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { cn, formatRelative } from '@/lib/utils'

type StatusFilter = 'all' | 'sent' | 'failed'

const PAGE_SIZE = 50

export default function EmailLogs() {
  const toast = useToast()
  const qc = useQueryClient()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const [expandedError, setExpandedError] = useState<string | null>(null)

  // Stati per il bulk resend
  const [confirmBulkResend, setConfirmBulkResend] = useState<{
    count: number
  } | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{
    done: number
    total: number
  } | null>(null)

  const filters = useMemo(
    () => ({
      status,
      search: search.trim() || undefined,
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo
        ? new Date(dateTo + 'T23:59:59').toISOString()
        : undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [status, search, dateFrom, dateTo, page]
  )

  const { data, isLoading, refetch } = useEmailLogs(filters)
  const { data: stats } = useEmailStats(7)
  const resendMutation = useResendNotification()

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const hasFilters =
    status !== 'all' || Boolean(search) || Boolean(dateFrom) || Boolean(dateTo)

  const clearFilters = () => {
    setStatus('all')
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  const handleResend = async (log: EmailLogEnriched) => {
    try {
      const result = await resendMutation.mutateAsync({
        task_id: log.task_id,
        recipient_email: log.recipient_email,
      })
      if (result.sent > 0) {
        toast.show(`Email rinviata a ${log.recipient_email}`)
      } else {
        toast.show("Rinvio fallito, controlla i logs", 'error')
      }
      // refetch automatica per onSuccess del hook
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Errore nel rinvio',
        'error'
      )
    }
  }

  // Apre la conferma per il rinvio massivo
  const openBulkResend = async () => {
    try {
      const failed = await fetchAllFailedLogs({
        search: search.trim() || undefined,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo
          ? new Date(dateTo + 'T23:59:59').toISOString()
          : undefined,
      })
      if (failed.length === 0) {
        toast.show("Nessuna email fallita da rinviare", 'info')
        return
      }
      setConfirmBulkResend({ count: failed.length })
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Errore caricamento falliti',
        'error'
      )
    }
  }

  // Esegue il rinvio massivo
  const runBulkResend = async () => {
    setConfirmBulkResend(null)
    try {
      const failed = await fetchAllFailedLogs({
        search: search.trim() || undefined,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo
          ? new Date(dateTo + 'T23:59:59').toISOString()
          : undefined,
      })
      const totalGroups = new Set(failed.map((f) => f.task_id)).size
      setBulkProgress({ done: 0, total: totalGroups })

      const result = await bulkResendNotifications(failed, (done, total) => {
        setBulkProgress({ done, total })
      })

      setBulkProgress(null)

      // Toast con riepilogo
      const parts: string[] = []
      if (result.sent > 0) parts.push(`${result.sent} inviate`)
      if (result.failed > 0) parts.push(`${result.failed} ancora fallite`)
      if (result.skipped > 0) parts.push(`${result.skipped} saltate (task eliminati)`)
      const msg = parts.join(', ') || 'Nessuna azione'

      if (result.failed === 0 && result.skipped === 0) {
        toast.show(`✓ ${msg}`)
      } else if (result.sent === 0) {
        toast.show(msg, 'error')
      } else {
        toast.show(msg, 'info')
      }

      void qc.invalidateQueries({ queryKey: ['email-logs'] })
    } catch (err) {
      setBulkProgress(null)
      toast.show(
        err instanceof Error ? err.message : 'Errore nel rinvio massivo',
        'error'
      )
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Logs email
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Storico degli invii di notifiche email. Filtra, cerca e ri-invia
            i messaggi falliti.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Bottone rinvia tutti — visibile solo se ci sono falliti */}
          {stats && stats.failed > 0 && (
            <button
              type="button"
              onClick={() => void openBulkResend()}
              disabled={bulkProgress !== null}
              className="px-3 py-2 bg-pienissimo-blue text-white rounded-lg text-sm font-semibold hover:bg-pienissimo-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Rinvia tutti i messaggi falliti (corrispondenti ai filtri attuali)"
            >
              <RefreshCw size={14} />
              Rinvia falliti
            </button>
          )}
          <button
            type="button"
            onClick={() => void refetch()}
            className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} /> Aggiorna
          </button>
        </div>
      </header>

      {/* Banner progress bulk resend */}
      {bulkProgress && (
        <div className="mb-6 bg-pienissimo-50 border border-pienissimo-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Spinner size="sm" />
            <p className="text-sm font-semibold text-pienissimo-blue">
              Rinvio in corso... {bulkProgress.done} di {bulkProgress.total} task
            </p>
          </div>
          <div className="w-full bg-pienissimo-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-pienissimo-blue h-full transition-all duration-300"
              style={{
                width: `${bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Stats ultime 7 giorni */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            label="Inviate (7 giorni)"
            value={stats.sent}
            color="emerald"
            icon={<Check size={16} />}
          />
          <StatCard
            label="Fallite (7 giorni)"
            value={stats.failed}
            color={stats.failed > 0 ? 'red' : 'slate'}
            icon={<AlertCircle size={16} />}
          />
          <StatCard
            label="Tasso successo"
            value={
              stats.total === 0
                ? '—'
                : `${Math.round((stats.sent / stats.total) * 100)}%`
            }
            color={
              stats.total === 0 || stats.sent / stats.total >= 0.95
                ? 'emerald'
                : stats.sent / stats.total >= 0.8
                  ? 'amber'
                  : 'red'
            }
            icon={<Mail size={16} />}
          />
        </div>
      )}

      {/* Filtri */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-2.5 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Cerca per email destinatario..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pienissimo-blue/20 focus:border-pienissimo-blue"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(0)
                }}
                className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-700"
                aria-label="Pulisci"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-1">
            <FilterPill
              active={status === 'all'}
              onClick={() => {
                setStatus('all')
                setPage(0)
              }}
            >
              Tutti
            </FilterPill>
            <FilterPill
              active={status === 'sent'}
              onClick={() => {
                setStatus('sent')
                setPage(0)
              }}
              variant="success"
            >
              Inviati
            </FilterPill>
            <FilterPill
              active={status === 'failed'}
              onClick={() => {
                setStatus('failed')
                setPage(0)
              }}
              variant="danger"
            >
              Falliti
            </FilterPill>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div className="flex items-center gap-2 text-xs">
            <Calendar size={14} className="text-slate-400" />
            <label className="font-semibold text-slate-500 uppercase tracking-wider">
              Periodo
            </label>
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPage(0)
            }}
            className="form-input text-sm w-auto"
          />
          <span className="text-slate-400 text-sm">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPage(0)
            }}
            className="form-input text-sm w-auto"
          />
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 ml-auto"
            >
              <X size={12} /> Pulisci tutto
            </button>
          )}
        </div>
      </div>

      {/* Tabella logs */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={hasFilters ? 'Nessun risultato' : 'Nessuna email inviata'}
          description={
            hasFilters
              ? 'Prova a modificare i filtri.'
              : "Quando pubblichi un task con notifica email, i log appariranno qui."
          }
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 bg-pienissimo-blue text-white rounded-lg text-sm font-semibold"
              >
                Pulisci filtri
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <Th>Quando</Th>
                    <Th>Stato</Th>
                    <Th>Destinatario</Th>
                    <Th>Task</Th>
                    <Th>Da</Th>
                    <Th>Azioni</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      expanded={expandedError === log.id}
                      onToggleExpand={() =>
                        setExpandedError(
                          expandedError === log.id ? null : log.id
                        )
                      }
                      onResend={() => void handleResend(log)}
                      resending={resendMutation.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginazione */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
              <span>
                {page * PAGE_SIZE + 1}-
                {Math.min((page + 1) * PAGE_SIZE, total)} di {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Pagina precedente"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 font-semibold text-slate-700">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Pagina successiva"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirmBulkResend)}
        title="Rinviare tutti i messaggi falliti?"
        message={
          confirmBulkResend
            ? `Stai per rinviare ${confirmBulkResend.count} email fallite (corrispondenti ai filtri di data e ricerca attuali). I task eliminati saranno saltati. L'operazione può richiedere fino a 1 minuto.`
            : ''
        }
        variant="warning"
        confirmLabel="Rinvia tutti"
        cancelLabel="Annulla"
        onConfirm={() => void runBulkResend()}
        onCancel={() => setConfirmBulkResend(null)}
      />
    </div>
  )
}

// =====================================================================
// Riga log
// =====================================================================
function LogRow({
  log,
  expanded,
  onToggleExpand,
  onResend,
  resending,
}: {
  log: EmailLogEnriched
  expanded: boolean
  onToggleExpand: () => void
  onResend: () => void
  resending: boolean
}) {
  return (
    <>
      <tr className="hover:bg-slate-50/60 transition-colors">
        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
          <span title={new Date(log.sent_at).toLocaleString('it-IT')}>
            {formatRelative(log.sent_at)}
          </span>
        </td>
        <td className="px-4 py-3">
          {log.status === 'sent' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase tracking-wider">
              <Check size={9} /> Inviata
            </span>
          ) : log.resolved ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase tracking-wider"
              title="Questa email era fallita ma è stata rinviata con successo"
            >
              <CheckCircle2 size={9} /> Risolto
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold uppercase tracking-wider">
              <AlertCircle size={9} /> Fallita
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-slate-700 truncate max-w-[220px]">
          {log.recipient_email}
        </td>
        <td className="px-4 py-3 text-sm truncate max-w-[260px]">
          {log.task ? (
            <Link
              to={`/task/${log.task.id}`}
              className="text-pienissimo-blue hover:text-pienissimo-dark font-medium inline-flex items-center gap-1"
            >
              <ExternalLink size={11} className="shrink-0" />
              <span className="truncate">{log.task.title}</span>
            </Link>
          ) : (
            <span className="text-slate-400 italic">Task eliminato</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-[140px]">
          {log.sender_name ?? <span className="italic">—</span>}
        </td>
        <td className="px-4 py-3 text-right whitespace-nowrap">
          {log.status === 'failed' && !log.resolved && (
            <div className="flex items-center gap-1 justify-end">
              {log.error_message && (
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                >
                  {expanded ? 'Nascondi' : 'Dettaglio'}
                </button>
              )}
              <button
                type="button"
                onClick={onResend}
                disabled={resending || !log.task}
                className="px-2 py-1 bg-pienissimo-blue text-white text-xs font-semibold rounded hover:bg-pienissimo-dark disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                title={!log.task ? 'Task eliminato, impossibile rinviare' : 'Rinvia'}
              >
                <RefreshCw size={11} />
                Rinvia
              </button>
            </div>
          )}
          {log.status === 'failed' && log.resolved && log.error_message && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
            >
              {expanded ? 'Nascondi' : 'Errore originale'}
            </button>
          )}
        </td>
      </tr>
      {expanded && log.error_message && (
        <tr className="bg-red-50/60">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex items-start gap-2 text-xs">
              <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">
                  Errore SMTP
                </p>
                <p className="text-red-700 font-mono break-all whitespace-pre-wrap">
                  {log.error_message}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// =====================================================================
// Componenti helper
// =====================================================================

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
      {children}
    </th>
  )
}

function FilterPill({
  active,
  onClick,
  variant,
  children,
}: {
  active: boolean
  onClick: () => void
  variant?: 'success' | 'danger'
  children: React.ReactNode
}) {
  const activeColors =
    variant === 'success'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : variant === 'danger'
        ? 'bg-red-100 text-red-700 border-red-200'
        : 'bg-slate-900 text-white border-slate-900'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-2 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap',
        active
          ? activeColors
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
      )}
    >
      {children}
    </button>
  )
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: number | string
  color: 'emerald' | 'red' | 'slate' | 'amber'
  icon: React.ReactNode
}) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <div
      className={cn(
        'border rounded-xl p-4 flex items-center gap-3',
        colorMap[color]
      )}
    >
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs font-semibold mt-1 opacity-80">{label}</p>
      </div>
    </div>
  )
}
