'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, MessageSquare, Flag, AlertCircle, Loader2, Filter } from 'lucide-react'
import Link from 'next/link'

function relativeTime(s: string) {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const SEV_COLORS: Record<string, string> = {
  CRITICAL: 'var(--severity-critical)',
  HIGH: 'var(--severity-high)',
  MEDIUM: 'var(--severity-medium)',
  LOW: 'var(--severity-low)',
}

const ACTION_META: Record<string, { color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  APPROVE: { color: 'var(--status-done)', icon: CheckCircle2 },
  REJECT: { color: 'var(--severity-critical)', icon: XCircle },
  REPORT: { color: 'var(--severity-medium)', icon: MessageSquare },
  REQUEST_REDESIGN: { color: 'var(--severity-high)', icon: Flag },
}

interface HistoryItem {
  id: string
  action: string
  reason: string | null
  notes: string | null
  created_at: string
  step_id: string | null
  step_type: string | null
  incident_id: string | null
  incident_title: string
  incident_severity: string | null
  incident_source: string | null
}

const ACTIONS = ['ALL', 'APPROVE', 'REJECT', 'REPORT', 'REQUEST_REDESIGN']

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('ALL')

  function fetchHistory(action: string) {
    setLoading(true)
    const params = new URLSearchParams({ limit: '100' })
    if (action !== 'ALL') params.set('action', action)
    fetch(`/api/user/history?${params}`)
      .then(r => r.json())
      .then(d => setItems(d.history || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchHistory(filterAction) }, [filterAction])

  const approvals = items.filter(i => i.action === 'APPROVE').length
  const rejections = items.filter(i => i.action === 'REJECT').length
  const reports = items.filter(i => i.action === 'REPORT').length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">My History</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>All tasks you have handled</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Approvals', value: approvals, color: 'var(--status-done)' },
          { label: 'Rejections', value: rejections, color: 'var(--severity-critical)' },
          { label: 'Reports', value: reports, color: 'var(--severity-medium)' },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-xl p-4"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <Filter className="h-4 w-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} />
        <div className="flex gap-2 flex-wrap">
          {ACTIONS.map(a => (
            <button
              key={a}
              onClick={() => setFilterAction(a)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={filterAction === a
                ? { background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }
                : { background: 'color-mix(in oklab, var(--muted) 30%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }
              }
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="h-8 w-8 mx-auto mb-3" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)' }} />
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No history found</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {items.map((item, idx) => {
              const meta = ACTION_META[item.action] || ACTION_META.REPORT
              const Icon = meta.icon
              const sevColor = item.incident_severity ? (SEV_COLORS[item.incident_severity] || SEV_COLORS.MEDIUM) : 'var(--color-muted-foreground)'

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 px-5 py-4 fade-up"
                  style={{ animationDelay: `${idx * 20}ms` }}
                >
                  <div
                    className="h-8 w-8 rounded-full grid place-items-center shrink-0 mt-0.5"
                    style={{ background: `color-mix(in oklab, ${meta.color} 15%, transparent)`, border: `1px solid color-mix(in oklab, ${meta.color} 30%, transparent)` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold" style={{ color: meta.color }}>{item.action}</span>
                      {item.step_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'color-mix(in oklab, var(--muted) 30%, transparent)', color: 'var(--color-muted-foreground)' }}>
                          {item.step_type}
                        </span>
                      )}
                      {item.incident_severity && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: sevColor, background: `color-mix(in oklab, ${sevColor} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${sevColor} 25%, transparent)` }}>
                          {item.incident_severity}
                        </span>
                      )}
                      <span className="ml-auto text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>{relativeTime(item.created_at)}</span>
                    </div>
                    <div className="text-xs mt-0.5 font-medium">{item.incident_title}</div>
                    {item.reason && (
                      <div className="text-[11px] mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                        Reason: {item.reason}
                      </div>
                    )}
                    {item.step_id && (
                      <Link
                        href={`/dashboard/tasks/${item.step_id}`}
                        className="inline-flex items-center gap-1 text-[10px] mt-1.5 font-medium transition-colors"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        View task →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
