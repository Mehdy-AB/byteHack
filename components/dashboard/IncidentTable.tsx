'use client'

import { useState, useEffect, useCallback } from 'react'
import { SeverityBadge, StatusBadge } from '@/components/badges'
import { Search, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const STATUS_OPTIONS = ['', 'OPEN', 'CONTAINED', 'RESOLVED', 'CLOSED', 'SUSPENDED']
const SEVERITY_OPTIONS = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

const sel: React.CSSProperties = {
  background: 'color-mix(in oklab, var(--muted) 40%, transparent)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-foreground)',
  borderRadius: '0.5rem',
  padding: '4px 8px',
  fontSize: '11px',
}

export interface IncidentRow {
  id: string
  severity: string
  status: string
  source: string
  raw_input: { title?: string; description?: string; ai_confidence?: number; playbook_id?: string } | null
  created_at: string
  assigned_to: string | null
  sla_breached: boolean
  profiles?: { name?: string } | null
}

interface Props {
  onSelect: (incident: IncidentRow) => void
}

export function IncidentTable({ onSelect }: Props) {
  const [incidents, setIncidents] = useState<any[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20 })
  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [source, setSource] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchIncidents = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (severity) params.set('severity', severity)
    if (source) params.set('source', source)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    params.set('sortBy', sortBy)
    params.set('order', order)
    params.set('page', String(page))
    params.set('limit', '20')
    try {
      const res = await fetch(`/api/admin/incidents?${params.toString()}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setIncidents(data.incidents || [])
      setPagination(data.pagination || { total: 0, page: 1, limit: 20 })
    } catch {
      setIncidents([])
    } finally {
      setLoading(false)
    }
  }, [status, severity, source, dateFrom, dateTo, sortBy, order, page])

  useEffect(() => { fetchIncidents() }, [fetchIncidents])

  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const hasFilters = !!(status || severity || source || dateFrom || dateTo || sortBy !== 'created_at' || order !== 'desc')

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Incidents</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>{pagination.total} total</p>
      </div>

      {/* Filters */}
      <div className="rounded-xl px-3 py-2.5 mb-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-end gap-2 flex-nowrap overflow-x-auto no-scrollbar">
          {[
            { label: 'Status', value: status, set: (v: string) => { setStatus(v); setPage(1) }, opts: STATUS_OPTIONS.map(s => [s, s || 'All Statuses']) },
            { label: 'Severity', value: severity, set: (v: string) => { setSeverity(v); setPage(1) }, opts: SEVERITY_OPTIONS.map(s => [s, s || 'All Severities']) },
            { label: 'Sort By', value: sortBy, set: (v: string) => { setSortBy(v); setPage(1) }, opts: [['created_at', 'Created'], ['severity_score', 'Severity'], ['updated_at', 'Updated']] },
            { label: 'Order', value: order, set: (v: string) => { setOrder(v); setPage(1) }, opts: [['desc', 'Descending'], ['asc', 'Ascending']] },
          ].map(({ label, value, set, opts }) => (
            <div key={label} className="flex flex-col gap-0.5 shrink-0">
              <label className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>{label}</label>
              <select value={value} onChange={e => set(e.target.value)} style={sel}>
                {opts.map(([v, l]) => <option key={v} value={v} style={{ background: 'oklch(0.18 0.025 260)' }}>{l}</option>)}
              </select>
            </div>
          ))}

          <div className="flex flex-col gap-0.5 shrink-0">
            <label className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>Source</label>
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-muted-foreground)' }} />
              <input
                type="text"
                placeholder="Source…"
                value={source}
                onChange={e => { setSource(e.target.value); setPage(1) }}
                style={{ ...sel, paddingLeft: '22px', width: '100px' }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-0.5 shrink-0">
            <label className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>From</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} style={sel} />
          </div>

          <div className="flex flex-col gap-0.5 shrink-0">
            <label className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>To</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} style={sel} />
          </div>

          {hasFilters && (
            <button
              onClick={() => { setStatus(''); setSeverity(''); setSource(''); setDateFrom(''); setDateTo(''); setSortBy('created_at'); setOrder('desc'); setPage(1) }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs ml-auto"
              style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)' }}>
                {['#', 'Severity', 'Title', 'Source', 'Assigned', 'Status', 'SLA', 'Created'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderTop: '1px solid color-mix(in oklab, var(--border) 50%, transparent)' }}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: 'var(--color-muted)', width: '60%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Search className="h-10 w-10 mx-auto mb-3" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>No incidents found</p>
                    <p className="text-xs mt-1" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 60%, transparent)' }}>Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                incidents.map((inc: any, idx: number) => (
                  <tr
                    key={inc.id}
                    onClick={() => onSelect(inc as IncidentRow)}
                    className="cursor-pointer transition-colors"
                    style={{ borderTop: '1px solid color-mix(in oklab, var(--border) 50%, transparent)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--accent) 50%, transparent)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-4 py-3 text-[11px] font-mono" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 60%, transparent)' }}>
                      {(page - 1) * 20 + idx + 1}
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={inc.severity} /></td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="font-medium truncate block text-xs">{inc.raw_input?.title || 'Untitled'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{inc.source || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      {inc.profiles?.name || (inc.assigned_to ? 'Assigned' : 'Unassigned')}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={inc.status} /></td>
                    <td className="px-4 py-3">
                      {inc.sla_breached
                        ? <span className="text-[11px] font-semibold" style={{ color: 'var(--severity-critical)' }}>Breached</span>
                        : <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>{relativeTime(inc.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && incidents.length > 0 && (
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid color-mix(in oklab, var(--border) 50%, transparent)' }}>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 grid place-items-center rounded-lg transition-colors disabled:opacity-40"
                style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)', color: 'var(--color-muted-foreground)' }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{page}/{totalPages || 1}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="w-8 h-8 grid place-items-center rounded-lg transition-colors disabled:opacity-40"
                style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)', color: 'var(--color-muted-foreground)' }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
