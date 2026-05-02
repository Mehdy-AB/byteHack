'use client'

import { useEffect, useState } from 'react'
import { SeverityBadge, StatusBadge } from '@/components/badges'
import { AlertCircle } from 'lucide-react'
import type { IncidentRow } from './IncidentTable'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function relativeTime(s: string) {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  )
}

interface Step {
  id: string
  step_type: string
  step_order: number
  status: string
  assigned_role: string | null
  message: string | null
  result: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
}

interface AuditEntry {
  id: string
  actor: string
  action: string
  status: string
  created_at: string
}

interface FullDetail {
  playbook_id: string | null
  notify_72h_at: string | null
  resolved_at: string | null
  mttr_minutes: number | null
  assigned_to: { name?: string } | string | null
}

interface Props {
  incident: IncidentRow | null
}

export function IncidentDetailPanel({ incident }: Props) {
  const [detail, setDetail] = useState<FullDetail | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!incident) { setDetail(null); setSteps([]); setAuditLog([]); return }
    setLoading(true)
    fetch(`/api/admin/incidents/${incident.id}`)
      .then(r => r.json())
      .then(d => {
        setDetail(d.incident || null)
        setSteps(d.steps || [])
        setAuditLog(d.audit_log || [])
      })
      .catch(() => { setDetail(null); setSteps([]); setAuditLog([]) })
      .finally(() => setLoading(false))
  }, [incident?.id])

  if (!incident) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 mb-4" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)' }} />
        <div className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Select an incident</div>
        <div className="text-xs mt-1" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 60%, transparent)' }}>Click any row to view details</div>
      </div>
    )
  }

  const title = incident.raw_input?.title || 'Untitled Incident'
  const aiConfidence = incident.raw_input?.ai_confidence
  const playbook = detail?.playbook_id || incident.raw_input?.playbook_id
  const assignedName =
    typeof detail?.assigned_to === 'object' && detail?.assigned_to
      ? (detail.assigned_to as { name?: string }).name
      : incident.profiles?.name || (incident.assigned_to ? 'Assigned' : 'Unassigned')

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-xl font-bold">{title}</h1>
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>
        <p className="text-xs font-mono" style={{ color: 'var(--color-muted-foreground)' }}>{incident.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Details */}
          <div className="rounded-xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--color-muted-foreground)' }}>Incident Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Incident ID"><span className="font-mono text-xs break-all">{incident.id}</span></Field>
              <Field label="Source"><span>{incident.source || '—'}</span></Field>
              <Field label="Playbook"><span className="font-mono text-xs">{playbook || '—'}</span></Field>
              <Field label="AI Confidence">
                <span>{aiConfidence != null ? `${(aiConfidence * 100).toFixed(1)}%` : '—'}</span>
              </Field>
              <Field label="Assigned To"><span>{assignedName}</span></Field>
              <Field label="72h Notify At"><span>{formatDate(detail?.notify_72h_at ?? null)}</span></Field>
              <Field label="Created At"><span>{formatDate(incident.created_at)}</span></Field>
              <Field label="Resolved At"><span>{formatDate(detail?.resolved_at ?? null)}</span></Field>
              <Field label="MTTR">
                <span>{detail?.mttr_minutes != null ? `${detail.mttr_minutes} min` : '—'}</span>
              </Field>
              <Field label="SLA Status">
                <span style={{ color: incident.sla_breached ? 'var(--severity-critical)' : 'var(--status-done)', fontWeight: 600 }}>
                  {incident.sla_breached ? 'Breached' : 'OK'}
                </span>
              </Field>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="rounded-xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Workflow Steps</h2>
              {steps.length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'color-mix(in oklab, var(--primary) 12%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in oklab, var(--primary) 25%, transparent)' }}>
                  {steps.length}
                </span>
              )}
            </div>
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg" style={{ background: 'var(--color-muted)' }} />)}
              </div>
            ) : steps.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No workflow steps recorded.</p>
            ) : (
              <div className="space-y-3">
                {[...steps].sort((a, b) => a.step_order - b.step_order).map(step => (
                  <div key={step.id} className="rounded-lg p-4"
                    style={{ background: 'color-mix(in oklab, var(--muted) 20%, transparent)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-mono" style={{ color: 'var(--color-muted-foreground)' }}>#{step.step_order}</span>
                      <span className="text-xs font-medium">{step.step_type.replace(/_/g, ' ')}</span>
                      <StatusBadge status={step.status} />
                      {step.assigned_role && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{ background: 'color-mix(in oklab, var(--muted) 60%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
                          {step.assigned_role.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    {step.message && (
                      <p className="text-xs mb-2 px-3 py-2 rounded-lg"
                        style={{ background: 'color-mix(in oklab, var(--primary) 8%, transparent)', border: '1px solid color-mix(in oklab, var(--primary) 15%, transparent)', color: 'color-mix(in oklab, var(--foreground) 85%, transparent)' }}>
                        {step.message}
                      </p>
                    )}
                    {(step.result as any)?.error_detail && (
                      <p className="text-xs mb-2 px-3 py-2 rounded-lg"
                        style={{ background: 'color-mix(in oklab, var(--severity-critical) 10%, transparent)', border: '1px solid color-mix(in oklab, var(--severity-critical) 20%, transparent)', color: 'var(--severity-critical)' }}>
                        {(step.result as any).error_detail}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
                      {step.started_at && <span>Started: {formatDate(step.started_at)}</span>}
                      {step.completed_at && <span>Completed: {formatDate(step.completed_at)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1/3 — Audit Log */}
        <div>
          <div className="rounded-xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Audit Log</h2>
              {auditLog.length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'color-mix(in oklab, var(--primary) 12%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in oklab, var(--primary) 25%, transparent)' }}>
                  {auditLog.length}
                </span>
              )}
            </div>
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg" style={{ background: 'var(--color-muted)' }} />)}
              </div>
            ) : auditLog.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No audit entries.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: 'color-mix(in oklab, var(--border) 50%, transparent)' }} />
                <div className="space-y-4">
                  {auditLog.map(log => (
                    <div key={log.id} className="relative pl-8">
                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2"
                        style={{ background: 'var(--color-card)', borderColor: 'var(--color-primary)' }} />
                      <div className="rounded-lg p-3"
                        style={{ background: 'color-mix(in oklab, var(--muted) 20%, transparent)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-[11px] font-semibold font-mono">{log.action}</span>
                          <StatusBadge status={log.status} />
                        </div>
                        <p className="text-[11px] truncate" style={{ color: 'var(--color-muted-foreground)' }}>
                          {log.actor ? `${log.actor.slice(0, 8)}…` : 'System'}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 60%, transparent)' }}>
                          {relativeTime(log.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
