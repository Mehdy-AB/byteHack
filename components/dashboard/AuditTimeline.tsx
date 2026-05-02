'use client'

import { useEffect, useState } from 'react'
import { Activity, AlertCircle, Sparkles, Users, Clock } from 'lucide-react'

function relativeTime(s: string) {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface AuditEntry {
  id: string
  action: string
  performed_by: string | null
  reason: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

type EventKind = 'alert' | 'workflow' | 'assigned' | 'update'

function inferKind(action: string): EventKind {
  if (action.startsWith('STEP_') || action.includes('WORKFLOW') || action.includes('APPROVE') || action.includes('REJECT')) return 'workflow'
  if (action.includes('CREATED') || action.includes('OPENED')) return 'alert'
  if (action.includes('ASSIGN') || action.includes('REASSIGN')) return 'assigned'
  return 'update'
}

const KIND_META: Record<EventKind, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; label: string }> = {
  alert: { icon: AlertCircle, color: 'var(--severity-high)', label: 'Alert' },
  workflow: { icon: Sparkles, color: 'var(--color-primary)', label: 'Workflow' },
  assigned: { icon: Users, color: 'var(--status-progress)', label: 'Assignment' },
  update: { icon: Activity, color: 'var(--status-done)', label: 'Update' },
}

interface Props {
  incidentId: string | null
}

export function AuditTimeline({ incidentId }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!incidentId) { setEntries([]); return }
    setLoading(true)
    fetch(`/api/admin/incidents/${incidentId}`)
      .then(r => r.json())
      .then(d => {
        const incident = d.incident || d
        const auditLog: any[] = d.audit_log || incident.audit_log || []
        const steps: any[] = d.steps || incident.steps || []

        const auditEvents: AuditEntry[] = auditLog.map((e: any) => ({
          id: `audit-${e.id}`,
          action: e.action,
          performed_by: e.profiles?.name || e.actor || null,
          reason: e.reason || null,
          metadata: e.metadata || null,
          created_at: e.created_at,
        }))

        const stepEvents: AuditEntry[] = steps.map((s: any) => ({
          id: `step-${s.id}`,
          action: `STEP_${s.status}: ${s.step_type.replace(/_/g, ' ')}`,
          performed_by: s.assigned_role ? s.assigned_role.replace(/_/g, ' ') : 'System',
          reason: s.message || null,
          metadata: null,
          created_at: s.completed_at || s.started_at || s.created_at,
        }))

        const creation: AuditEntry = {
          id: 'creation',
          action: 'INCIDENT_CREATED',
          performed_by: 'System',
          reason: incident.raw_input?.title || 'New incident',
          metadata: null,
          created_at: incident.created_at,
        }

        const all = [creation, ...auditEvents, ...stepEvents].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        setEntries(all)
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [incidentId])

  if (!incidentId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24">
        <Clock className="h-12 w-12 mb-4" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)' }} />
        <div className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Select an incident</div>
        <div className="text-xs mt-1" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 60%, transparent)' }}>
          Choose an alert from the sidebar to view its timeline
        </div>
      </div>
    )
  }

  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-card)' }}
    >
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-muted-foreground)' }}>
          Incident Timeline
        </h3>
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
          {loading ? '…' : `${entries.length} events`}
        </span>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-7 w-7 rounded-full shrink-0" style={{ background: 'var(--color-muted)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded w-1/4" style={{ background: 'var(--color-muted)' }} />
                  <div className="h-4 rounded w-3/4" style={{ background: 'var(--color-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No events recorded</div>
          </div>
        ) : (
          <ol className="relative space-y-1 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-px before:bg-border/50">
            {entries.map((entry, idx) => {
              const kind = inferKind(entry.action)
              const meta = KIND_META[kind]
              const Icon = meta.icon

              return (
                <li
                  key={entry.id}
                  className="relative fade-up"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-start gap-3 w-full text-left rounded-lg px-3 py-2.5">
                    <div
                      className="h-7 w-7 rounded-full grid place-items-center shrink-0 z-10 mt-px"
                      style={{
                        background: 'var(--color-card)',
                        border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)',
                        boxShadow: '0 0 0 3px var(--color-card)',
                      }}
                    >
                      <Icon className="h-3 w-3" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>
                          {relativeTime(entry.created_at)}
                        </span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'color-mix(in oklab, var(--foreground) 90%, transparent)' }}>
                        {entry.action.replace(/_/g, ' ')}
                        {entry.reason ? ` — ${entry.reason}` : ''}
                      </div>
                      {entry.performed_by && (
                        <div className="text-[11px] font-mono mt-0.5" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 70%, transparent)' }}>
                          {entry.performed_by}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
