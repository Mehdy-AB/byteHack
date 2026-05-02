'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, AlertOctagon, AlertCircle, AlertTriangle, Info, Server } from 'lucide-react'

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface Incident {
  id: string
  severity: Severity
  status: string
  source: string
  raw_input: { title?: string } | null
  created_at: string
}

function relativeTime(s: string) {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const SEV_META: Record<Severity, { color: string; icon: React.ReactNode; label: string }> = {
  CRITICAL: { color: 'var(--severity-critical)', icon: <AlertOctagon className="h-3 w-3" />, label: 'Critical' },
  HIGH: { color: 'var(--severity-high)', icon: <AlertCircle className="h-3 w-3" />, label: 'High' },
  MEDIUM: { color: 'var(--severity-medium)', icon: <AlertTriangle className="h-3 w-3" />, label: 'Medium' },
  LOW: { color: 'var(--severity-low)', icon: <Info className="h-3 w-3" />, label: 'Low' },
}

const FILTERS: Array<{ key: 'ALL' | Severity; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'CRITICAL', label: 'Crit' },
  { key: 'HIGH', label: 'High' },
  { key: 'MEDIUM', label: 'Med' },
  { key: 'LOW', label: 'Low' },
]

export interface SidebarIncidentRow {
  id: string
  severity: Severity
  status: string
  source: string
  raw_input: { title?: string } | null
  created_at: string
  assigned_to: string | null
  sla_breached: boolean
  profiles?: { name?: string } | null
}

interface Props {
  selectedId: string | null
  onSelect: (incident: SidebarIncidentRow) => void
  hideBorder?: boolean
}

export function AlertSidebar({ selectedId, onSelect, hideBorder }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [filter, setFilter] = useState<'ALL' | Severity>('ALL')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchIncidents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/incidents?limit=50&order=desc')
      if (!res.ok) return
      const data = await res.json()
      setIncidents(data.incidents || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIncidents()
    const id = setInterval(fetchIncidents, 30_000)
    return () => clearInterval(id)
  }, [fetchIncidents])

  const visible = incidents.filter(i => {
    if (filter !== 'ALL' && i.severity !== filter) return false
    if (query) {
      const title = i.raw_input?.title || ''
      if (!title.toLowerCase().includes(query.toLowerCase()) && !i.source?.toLowerCase().includes(query.toLowerCase())) return false
    }
    return true
  })

  return (
    <aside
      className="flex flex-col h-full"
      style={{ background: 'var(--color-background)', borderRight: hideBorder ? 'none' : '1px solid var(--color-border)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-muted-foreground)' }}>
            Alert Feed
          </h2>
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
            {visible.length}/{incidents.length}
          </span>
        </div>

        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-muted-foreground)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search alerts…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg focus:outline-none transition-colors"
            style={{
              background: 'color-mix(in oklab, var(--muted) 40%, transparent)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-foreground)',
            }}
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => {
            const active = filter === f.key
            const meta = f.key !== 'ALL' ? SEV_META[f.key as Severity] : null
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="text-[11px] px-2 py-0.5 rounded transition-all duration-150"
                style={active
                  ? { background: meta ? `color-mix(in oklab, ${meta.color} 15%, transparent)` : 'color-mix(in oklab, var(--primary) 15%, transparent)', color: meta ? meta.color : 'var(--color-primary)', border: `1px solid ${meta ? `color-mix(in oklab, ${meta.color} 35%, transparent)` : 'color-mix(in oklab, var(--primary) 35%, transparent)'}` }
                  : { border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)', color: 'var(--color-muted-foreground)' }
                }
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--color-card)' }} />
          ))
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-8 w-8 mb-3" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)' }} />
            <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>No alerts match filters</div>
          </div>
        ) : (
          visible.map(inc => {
            const sev = SEV_META[inc.severity] || SEV_META.LOW
            const isSelected = selectedId === inc.id
            return (
              <button
                key={inc.id}
                onClick={() => onSelect(inc as SidebarIncidentRow)}
                className="w-full text-left relative rounded-xl overflow-hidden transition-all duration-200 slide-in"
                style={isSelected
                  ? { border: '1px solid color-mix(in oklab, var(--primary) 50%, transparent)', background: 'color-mix(in oklab, var(--primary) 5%, transparent)' }
                  : { border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)', background: 'color-mix(in oklab, var(--card) 60%, transparent)' }
                }
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: sev.color, opacity: isSelected ? 1 : 0.6 }}
                />
                <div className="px-3 py-3 pl-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-medium leading-snug line-clamp-2">
                      {inc.raw_input?.title || 'Untitled Incident'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: `color-mix(in oklab, ${sev.color} 15%, transparent)`,
                        color: sev.color,
                        border: `1px solid color-mix(in oklab, ${sev.color} 30%, transparent)`,
                      }}
                    >
                      {sev.icon}
                      {inc.severity}
                    </span>
                    <span className="text-[10px] ml-auto" style={{ color: 'var(--color-muted-foreground)' }}>
                      {relativeTime(inc.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                    <Server className="h-3 w-3 shrink-0" />
                    <span className="font-mono truncate">{inc.source || 'Unknown source'}</span>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
