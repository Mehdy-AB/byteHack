import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SeverityBadge, StatusBadge } from '@/components/badges'
import { ArrowLeft } from 'lucide-react'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface PageProps {
  params: Promise<{ id: string }>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  )
}

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: incident, error: incErr } = await supabase
    .from('incidents')
    .select('*, profiles(id, name, role)')
    .eq('id', id)
    .single()

  if (incErr || !incident) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-24">
        <p className="text-sm mb-4" style={{ color: 'var(--color-muted-foreground)' }}>Incident not found.</p>
        <Link href="/dashboard/incidents" className="text-sm transition-colors" style={{ color: 'var(--color-primary)' }}>
          ← Back to Incidents
        </Link>
      </div>
    )
  }

  const [{ data: steps }, { data: auditLog }] = await Promise.all([
    supabase.from('incident_steps').select('*').eq('incident_id', id).order('step_order', { ascending: true }),
    supabase.from('audit_log').select('id, actor, action, status, created_at, payload, profiles(name)').eq('incident_id', id).order('created_at', { ascending: true }),
  ])

  const title = incident.raw_input?.title || 'Untitled Incident'
  const assignedProfile = (incident as any).profiles

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/incidents"
        className="inline-flex items-center gap-1.5 text-sm mb-5 transition-colors"
        style={{ color: 'var(--color-muted-foreground)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Incidents
      </Link>

      {/* Page header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-xl font-bold">{title}</h1>
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>
        <p className="text-xs font-mono" style={{ color: 'var(--color-muted-foreground)' }}>{incident.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details card */}
          <div className="rounded-xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--color-muted-foreground)' }}>Incident Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Incident ID"><span className="font-mono text-xs break-all">{incident.id}</span></Field>
              <Field label="Source"><span>{incident.source || '—'}</span></Field>
              <Field label="Playbook"><span className="font-mono text-xs">{incident.playbook_id || incident.raw_input?.playbook_id || '—'}</span></Field>
              <Field label="AI Confidence">
                <span>{incident.raw_input?.ai_confidence != null ? `${(incident.raw_input.ai_confidence * 100).toFixed(1)}%` : '—'}</span>
              </Field>
              <Field label="Assigned To"><span>{assignedProfile?.name || (incident.assigned_to ? 'Assigned' : 'Unassigned')}</span></Field>
              <Field label="72h Notify At"><span>{formatDate(incident.notify_72h_at)}</span></Field>
              <Field label="Created At"><span>{formatDate(incident.created_at)}</span></Field>
              <Field label="Resolved At"><span>{formatDate(incident.resolved_at)}</span></Field>
              <Field label="MTTR">
                <span>{incident.mttr_minutes != null ? `${incident.mttr_minutes} min` : '—'}</span>
              </Field>
              <Field label="SLA Status">
                <span style={{ color: incident.sla_breached ? 'var(--severity-critical)' : 'var(--status-done)', fontWeight: 600 }}>
                  {incident.sla_breached ? 'Breached' : 'OK'}
                </span>
              </Field>
            </div>
          </div>

          {/* Workflow steps */}
          <div className="rounded-xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Workflow Steps</h2>
              {steps && steps.length > 0 && (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'color-mix(in oklab, var(--primary) 12%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in oklab, var(--primary) 25%, transparent)' }}
                >
                  {steps.length}
                </span>
              )}
            </div>
            {!steps || steps.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No workflow steps recorded.</p>
            ) : (
              <div className="space-y-3">
                {steps.map((step: any) => (
                  <div
                    key={step.id}
                    className="rounded-lg p-4"
                    style={{ background: 'color-mix(in oklab, var(--muted) 20%, transparent)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-mono" style={{ color: 'var(--color-muted-foreground)' }}>#{step.step_order}</span>
                      <span className="text-xs font-medium">{step.step_type.replace(/_/g, ' ')}</span>
                      <StatusBadge status={step.status} />
                      {step.assigned_role && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{ background: 'color-mix(in oklab, var(--muted) 60%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}
                        >
                          {step.assigned_role.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    {step.result?.message && (
                      <p
                        className="text-xs mb-2 px-3 py-2 rounded-lg"
                        style={{ background: 'color-mix(in oklab, var(--primary) 8%, transparent)', border: '1px solid color-mix(in oklab, var(--primary) 15%, transparent)', color: 'color-mix(in oklab, var(--foreground) 85%, transparent)' }}
                      >
                        {step.result.message}
                      </p>
                    )}
                    {step.error_detail && (
                      <p
                        className="text-xs mb-2 px-3 py-2 rounded-lg"
                        style={{ background: 'color-mix(in oklab, var(--severity-critical) 10%, transparent)', border: '1px solid color-mix(in oklab, var(--severity-critical) 20%, transparent)', color: 'var(--severity-critical)' }}
                      >
                        {step.error_detail}
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

        {/* Right col — Audit log */}
        <div>
          <div className="rounded-xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Audit Log</h2>
              {auditLog && auditLog.length > 0 && (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'color-mix(in oklab, var(--primary) 12%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in oklab, var(--primary) 25%, transparent)' }}
                >
                  {auditLog.length}
                </span>
              )}
            </div>
            {!auditLog || auditLog.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No audit entries.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: 'color-mix(in oklab, var(--border) 50%, transparent)' }} />
                <div className="space-y-4">
                  {auditLog.map((log: any) => (
                    <div key={log.id} className="relative pl-8">
                      <div
                        className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2"
                        style={{ background: 'var(--color-card)', borderColor: 'var(--color-primary)' }}
                      />
                      <div
                        className="rounded-lg p-3"
                        style={{ background: 'color-mix(in oklab, var(--muted) 20%, transparent)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-[11px] font-semibold font-mono">{log.action}</span>
                          <StatusBadge status={log.status} />
                        </div>
                        <p className="text-[11px] truncate" style={{ color: 'var(--color-muted-foreground)' }}>
                          {(log as any).profiles?.name || (log.actor ? `${log.actor.slice(0, 8)}…` : 'System')}
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
