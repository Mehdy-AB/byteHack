'use client'

import { useEffect, useState } from 'react'
import { FileText, Code2, Server, AlertCircle, User, GitBranch, CheckCircle2, XCircle, Clock } from 'lucide-react'

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

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'var(--severity-high)',
  CONTAINED: 'var(--severity-medium)',
  RESOLVED: 'var(--status-done)',
  CLOSED: 'var(--color-muted-foreground)',
  SUSPENDED: 'var(--color-muted-foreground)',
}

interface Step {
  id: string
  step_type: string
  step_order: number
  status: string
  result: Record<string, unknown> | null
  created_at: string
}

interface IncidentDetail {
  id: string
  severity: string
  status: string
  source: string
  raw_input: Record<string, unknown>
  created_at: string
  assigned_to: string | null
  sla_breached: boolean
  steps: Step[]
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3.5" style={{ border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)', background: 'color-mix(in oklab, var(--muted) 20%, transparent)' }}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold mb-2.5" style={{ color: 'var(--color-muted-foreground)' }}>
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}

function StepRow({ step }: { step: Step }) {
  const statusColor = step.status === 'COMPLETED' ? 'var(--status-done)' : step.status === 'FAILED' ? 'var(--severity-critical)' : step.status === 'WAITING_APPROVAL' ? 'var(--severity-medium)' : 'var(--color-muted-foreground)'
  const StatusIcon = step.status === 'COMPLETED' ? CheckCircle2 : step.status === 'FAILED' ? XCircle : Clock

  return (
    <div className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid color-mix(in oklab, var(--border) 40%, transparent)' }}>
      <span className="text-xs font-mono w-5 text-center shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>
        {step.step_order}
      </span>
      <StatusIcon className="h-3.5 w-3.5 shrink-0" style={{ color: statusColor }} />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium">{step.step_type.replace(/_/g, ' ')}</span>
      </div>
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
        style={{
          color: statusColor,
          background: `color-mix(in oklab, ${statusColor} 12%, transparent)`,
          border: `1px solid color-mix(in oklab, ${statusColor} 25%, transparent)`,
        }}
      >
        {step.status}
      </span>
      <span className="text-[10px] shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>
        {relativeTime(step.created_at)}
      </span>
    </div>
  )
}

interface Props {
  incidentId: string | null
}

export function IncidentDetailPanel({ incidentId }: Props) {
  const [incident, setIncident] = useState<IncidentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'readable' | 'json'>('readable')

  useEffect(() => {
    if (!incidentId) { setIncident(null); return }
    setLoading(true)
    fetch(`/api/admin/incidents/${incidentId}`)
      .then(r => r.json())
      .then(d => setIncident(d.incident || d))
      .catch(() => setIncident(null))
      .finally(() => setLoading(false))
  }, [incidentId])

  if (!incidentId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24">
        <AlertCircle className="h-12 w-12 mb-4" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)' }} />
        <div className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Select an incident</div>
        <div className="text-xs mt-1" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 60%, transparent)' }}>
          Click any alert in the sidebar to view details
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 rounded-lg w-2/3" style={{ background: 'var(--color-muted)' }} />
        <div className="h-24 rounded-xl" style={{ background: 'var(--color-muted)' }} />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 rounded-lg" style={{ background: 'var(--color-muted)' }} />
          <div className="h-20 rounded-lg" style={{ background: 'var(--color-muted)' }} />
        </div>
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Failed to load incident</div>
      </div>
    )
  }

  const sevColor = SEV_COLORS[incident.severity] || 'var(--color-muted-foreground)'
  const statusColor = STATUS_COLORS[incident.status] || 'var(--color-muted-foreground)'
  const title = (incident.raw_input?.title as string) || 'Untitled Incident'
  const description = (incident.raw_input?.description as string) || null

  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-card)' }}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded"
              style={{ background: `color-mix(in oklab, ${sevColor} 15%, transparent)`, color: sevColor, border: `1px solid color-mix(in oklab, ${sevColor} 30%, transparent)` }}
            >
              <AlertCircle className="h-3 w-3" />
              {incident.severity}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
              style={{ background: `color-mix(in oklab, ${statusColor} 15%, transparent)`, color: statusColor, border: `1px solid color-mix(in oklab, ${statusColor} 30%, transparent)` }}
            >
              {incident.status}
            </span>
            <span className="text-[11px] font-mono" style={{ color: 'var(--color-muted-foreground)' }}>
              {incident.id.slice(0, 8)}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
              {relativeTime(incident.created_at)}
            </span>
          </div>
          <h2 className="text-sm font-semibold leading-snug">{title}</h2>
          {incident.source && (
            <div className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>{incident.source}</div>
          )}
        </div>

        {/* View toggle */}
        <div
          className="flex gap-1 shrink-0 rounded-lg p-1"
          style={{ background: 'color-mix(in oklab, var(--muted) 30%, transparent)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}
        >
          {(['readable', 'json'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-[11px] px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all duration-150"
              style={view === v
                ? { background: 'var(--color-card)', color: 'var(--color-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }
                : { color: 'var(--color-muted-foreground)', border: '1px solid transparent' }
              }
            >
              {v === 'readable' ? <FileText className="h-3 w-3" /> : <Code2 className="h-3 w-3" />}
              {v === 'readable' ? 'Readable' : 'Raw JSON'}
            </button>
          ))}
        </div>
      </div>

      {view === 'readable' ? (
        <div className="p-5 space-y-5">
          {description && (
            <p className="text-sm leading-relaxed" style={{ color: 'color-mix(in oklab, var(--foreground) 85%, transparent)' }}>
              {description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field icon={<Server className="h-3.5 w-3.5" />} label="Source">
              <span className="text-[11px] font-mono">{incident.source || '—'}</span>
            </Field>
            <Field icon={<User className="h-3.5 w-3.5" />} label="Assigned To">
              <span className="text-[11px] font-mono">{incident.assigned_to || 'Unassigned'}</span>
            </Field>
            {incident.sla_breached && (
              <Field icon={<Clock className="h-3.5 w-3.5" />} label="SLA Status">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--severity-critical)' }}>SLA Breached</span>
              </Field>
            )}
          </div>

          {/* Workflow steps */}
          {incident.steps && incident.steps.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="h-3.5 w-3.5" style={{ color: 'var(--color-muted-foreground)' }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                  Workflow Steps
                </span>
              </div>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
                <div className="px-4 py-1 last:border-b-0">
                  {incident.steps.map(step => (
                    <StepRow key={step.id} step={step} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <pre
          className="p-5 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-96"
          style={{ background: 'oklch(0.15 0.02 260)', color: 'color-mix(in oklab, var(--foreground) 80%, transparent)' }}
        >
          {JSON.stringify(incident, null, 2)}
        </pre>
      )}
    </section>
  )
}
