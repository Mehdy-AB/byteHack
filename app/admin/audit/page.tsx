'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity, Search, RotateCcw, Filter, Loader2, AlertCircle, TrendingUp } from 'lucide-react'

function relativeTime(s: string) {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const ACTION_COLORS: Record<string, string> = {
  STEP_APPROVE: 'var(--status-done)',
  STEP_REJECT: 'var(--severity-critical)',
  CLOSE_INCIDENT: 'var(--severity-high)',
  SUSPEND_WORKFLOW: 'var(--severity-medium)',
  VOID_WORKFLOW: 'var(--severity-critical)',
  ADMIN_UPDATE_USER: 'oklch(0.7 0.2 290)',
  WORKFLOW_ENGINE: 'var(--color-primary)',
  REASSIGN_INCIDENT: 'var(--status-progress)',
  SET_PRIORITY: 'var(--severity-medium)',
}

function getActionColor(action: string) {
  for (const [key, val] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return val
  }
  return 'var(--color-muted-foreground)'
}

interface AuditEntry {
  id: string
  incident_id: string | null
  step_id: string | null
  actor: string
  action: string
  status: string
  payload: any
  created_at: string
}

interface Stats {
  by_day: Record<string, number>
  action_counts: Record<string, number>
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 50

  const fetchAudit = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (filterAction) params.set('action', filterAction)
    if (search) params.set('actor', search)
    fetch(`/api/admin/audit?${params}`)
      .then(r => r.json())
      .then(d => {
        setEntries(d.entries || [])
        setTotal(d.total ?? 0)
        setStats(d.stats || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterAction, search, offset])

  useEffect(() => { fetchAudit() }, [fetchAudit])

  // Bar chart from by_day
  const dayEntries = stats ? Object.entries(stats.by_day).slice(-7) : []
  const maxDay = dayEntries.reduce((m, [, v]) => Math.max(m, v), 1)

  // Top actions
  const topActions = stats
    ? Object.entries(stats.action_counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    : []
  const maxAction = topActions.reduce((m, [, v]) => Math.max(m, v), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
        <div>
          <h1 className="text-xl font-semibold">System Audit</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{total.toLocaleString()} total events</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Events last 7 days */}
        <div className="rounded-xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            <span className="text-xs font-semibold">Events — last 7 days</span>
          </div>
          {dayEntries.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: 'var(--color-muted-foreground)' }}>No data</p>
          ) : (
            <div className="flex items-end gap-1.5 h-24">
              {dayEntries.map(([day, count]) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px]" style={{ color: 'var(--color-muted-foreground)' }}>{count}</span>
                  <div
                    className="w-full rounded-t-sm min-h-1"
                    style={{
                      height: `${Math.max(4, (count / maxDay) * 72)}px`,
                      background: 'color-mix(in oklab, var(--primary) 70%, transparent)',
                    }}
                  />
                  <span className="text-[8px]" style={{ color: 'var(--color-muted-foreground)' }}>{day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top actions */}
        <div className="rounded-xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            <span className="text-xs font-semibold">Top Action Types (7d)</span>
          </div>
          {topActions.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: 'var(--color-muted-foreground)' }}>No data</p>
          ) : (
            <div className="space-y-2">
              {topActions.map(([action, count]) => {
                const color = getActionColor(action)
                return (
                  <div key={action} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono w-40 truncate shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>{action}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(count / maxAction) * 100}%`, background: color }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums w-6 text-right" style={{ color: 'var(--color-muted-foreground)' }}>{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-0 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--color-muted-foreground)' }} />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setOffset(0) }}
            placeholder="Filter by actor (ID or name)…"
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--color-muted-foreground)' }} />
          <input
            type="text"
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setOffset(0) }}
            placeholder="Filter action…"
            className="pl-9 pr-3 py-2 rounded-lg text-sm outline-none w-44"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
          />
        </div>
        <button onClick={fetchAudit} className="p-2 rounded-lg" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <RotateCcw className="h-3.5 w-3.5" style={{ color: 'var(--color-muted-foreground)' }} />
        </button>
      </div>

      {/* Log table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Audit Log</span>
          <span className="text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>showing {entries.length} of {total}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-7 w-7 mx-auto mb-2" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)' }} />
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No audit events found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'color-mix(in oklab, var(--muted) 15%, transparent)' }}>
                  {['Time', 'Actor', 'Action', 'Status', 'Incident'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)', fontSize: '10px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => {
                  const actionColor = getActionColor(e.action)
                  return (
                    <tr
                      key={e.id}
                      className="fade-up"
                      style={{ borderBottom: '1px solid color-mix(in oklab, var(--border) 40%, transparent)', animationDelay: `${idx * 15}ms` }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--color-muted-foreground)' }}>
                        {relativeTime(e.created_at)}
                      </td>
                      <td className="px-4 py-3 max-w-[140px]">
                        <span className="truncate block font-mono text-[10px]" style={{ color: 'var(--color-foreground)' }}>
                          {e.actor.length > 20 ? e.actor.slice(0, 8) + '…' : e.actor}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ color: actionColor, background: `color-mix(in oklab, ${actionColor} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${actionColor} 25%, transparent)` }}
                        >
                          {e.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[10px] font-semibold"
                          style={{ color: e.status === 'SUCCESS' ? 'var(--status-done)' : 'var(--severity-critical)' }}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>
                        {e.incident_id ? e.incident_id.slice(0, 8) + '…' : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all"
              style={{ background: 'color-mix(in oklab, var(--muted) 30%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }}
            >
              Previous
            </button>
            <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
              {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition-all"
              style={{ background: 'color-mix(in oklab, var(--muted) 30%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
