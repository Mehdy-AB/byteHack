import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SeverityBadge, StatusBadge } from '@/components/badges'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createClient()

  const { data: incident, error: incErr } = await supabase
    .from('incidents')
    .select('*, profiles(id, name, role)')
    .eq('id', id)
    .single()

  if (incErr || !incident) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-[#6b7280] text-lg">Incident not found.</p>
        <Link href="/dashboard/incidents" className="mt-4 text-blue-400 hover:text-blue-300 text-sm">
          ← Back to Incidents
        </Link>
      </div>
    )
  }

  const { data: steps } = await supabase
    .from('incident_steps')
    .select('*')
    .eq('incident_id', id)
    .order('created_at', { ascending: true })

  const { data: auditLog } = await supabase
    .from('audit_log')
    .select('id, actor, action, status, created_at, payload')
    .eq('incident_id', id)
    .order('id', { ascending: true })

  const title = incident.raw_input?.title || 'Untitled Incident'
  const assignedProfile = (incident as any).profiles

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/incidents"
          className="inline-flex items-center gap-1.5 text-[#6b7280] hover:text-white text-sm mb-3 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Incidents
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>
        <p className="text-[#6b7280] text-sm mt-1 font-mono">{incident.id}</p>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Details */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">Incident Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Incident ID', value: <span className="font-mono text-xs break-all">{incident.id}</span> },
                { label: 'Source', value: incident.source || '—' },
                { label: 'Playbook', value: incident.playbook_id || incident.raw_input?.playbook_id || '—' },
                { label: 'AI Confidence', value: incident.raw_input?.ai_confidence != null ? `${(incident.raw_input.ai_confidence * 100).toFixed(1)}%` : '—' },
                { label: 'Assigned To', value: assignedProfile?.name || (incident.assigned_to ? 'Assigned' : 'Unassigned') },
                { label: 'Notify 72h At', value: formatDate(incident.notify_72h_at) },
                { label: 'Created At', value: formatDate(incident.created_at) },
                { label: 'Resolved At', value: formatDate(incident.resolved_at) },
                { label: 'MTTR', value: incident.mttr_minutes != null ? `${incident.mttr_minutes} minutes` : '—' },
                { label: 'SLA Breached', value: incident.sla_breached ? <span className="text-red-400 font-semibold">Yes</span> : <span className="text-green-400">No</span> },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-[#6b7280] uppercase tracking-wider font-semibold mb-0.5">{label}</p>
                  <p className="text-sm text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              Workflow Steps
              {steps && steps.length > 0 && (
                <span className="ml-2 text-white bg-[#1f2937] px-2 py-0.5 rounded-full text-xs normal-case">
                  {steps.length}
                </span>
              )}
            </h2>
            {!steps || steps.length === 0 ? (
              <p className="text-[#4b5563] text-sm">No workflow steps recorded.</p>
            ) : (
              <div className="space-y-3">
                {steps.map((step: any) => (
                  <div key={step.id} className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-[#6b7280]">{step.step_type}</span>
                      <StatusBadge status={step.status} />
                      {step.assigned_role && (
                        <span className="text-xs bg-[#1f2937] text-[#9ca3af] px-2 py-0.5 rounded">
                          {step.assigned_role.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    {step.result?.message && (
                      <p className="text-sm text-[#d1d5db] bg-[#111827] rounded px-3 py-2 border border-[#1f2937] mb-2">
                        {step.result.message}
                      </p>
                    )}
                    {step.error_detail && (
                      <p className="text-xs text-red-400 bg-red-900/20 border border-red-900 rounded px-3 py-2 mb-2">
                        {step.error_detail}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-[#6b7280]">
                      {step.started_at && <span>Started: {formatDate(step.started_at)}</span>}
                      {step.completed_at && <span>Completed: {formatDate(step.completed_at)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right col (1/3) */}
        <div>
          {/* Audit Log */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
              Audit Log
              {auditLog && auditLog.length > 0 && (
                <span className="ml-2 text-white bg-[#1f2937] px-2 py-0.5 rounded-full text-xs normal-case">
                  {auditLog.length}
                </span>
              )}
            </h2>
            {!auditLog || auditLog.length === 0 ? (
              <p className="text-[#4b5563] text-sm">No audit entries.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-[#1f2937]" />
                <div className="space-y-4">
                  {auditLog.map((log: any) => (
                    <div key={log.id} className="relative pl-8">
                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-blue-500 bg-[#0d1117]" />
                      <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-white font-mono">{log.action}</span>
                          <StatusBadge status={log.status} />
                        </div>
                        <p className="text-xs text-[#6b7280] truncate">
                          {log.actor ? `by ${log.actor.slice(0, 8)}…` : 'System'}
                        </p>
                        <p className="text-xs text-[#4b5563] mt-1">{relativeTime(log.created_at)}</p>
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
