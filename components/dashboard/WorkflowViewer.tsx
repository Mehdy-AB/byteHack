'use client'

import { useEffect, useState } from 'react'
import { GitBranch, CheckCircle2, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react'

function relativeTime(s: string) {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface Step {
  id: string
  step_type: string
  step_order: number
  status: string
  result: Record<string, unknown> | null
  created_at: string
}

interface Props {
  incidentId: string | null
}

const STEP_META: Record<string, { color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  COMPLETED: { color: 'var(--status-done)', icon: CheckCircle2 },
  FAILED: { color: 'var(--severity-critical)', icon: XCircle },
  WAITING_APPROVAL: { color: 'var(--severity-medium)', icon: Clock },
  PENDING: { color: 'var(--color-muted-foreground)', icon: Loader2 },
  RUNNING: { color: 'var(--color-primary)', icon: Loader2 },
}

function getStepMeta(status: string) {
  return STEP_META[status] || STEP_META.PENDING
}

export function WorkflowViewer({ incidentId }: Props) {
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(false)
  const [incidentTitle, setIncidentTitle] = useState<string | null>(null)

  useEffect(() => {
    if (!incidentId) { setSteps([]); return }
    setLoading(true)
    fetch(`/api/admin/incidents/${incidentId}`)
      .then(r => r.json())
      .then(d => {
        const incident = d.incident || d
        setSteps(incident.steps || [])
        setIncidentTitle(incident.raw_input?.title || 'Untitled')
      })
      .catch(() => setSteps([]))
      .finally(() => setLoading(false))
  }, [incidentId])

  if (!incidentId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24">
        <GitBranch className="h-12 w-12 mb-4" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)' }} />
        <div className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>No incident selected</div>
        <div className="text-xs mt-1" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 60%, transparent)' }}>
          Select an alert from the sidebar to view its workflow
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <section
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-card)' }}
        >
          <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <GitBranch className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            <div>
              <h3 className="text-sm font-semibold">Workflow Steps</h3>
              {incidentTitle && (
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{incidentTitle}</div>
              )}
            </div>
            <span className="ml-auto text-[11px] tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
              {loading ? '…' : `${steps.length} steps`}
            </span>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'var(--color-muted)' }} />
                ))}
              </div>
            ) : steps.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-8 w-8 mx-auto mb-3" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)' }} />
                <div className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No workflow steps found</div>
              </div>
            ) : (
              <div className="relative">
                {/* Connector line */}
                <div
                  className="absolute left-5 top-8 bottom-8 w-px"
                  style={{ background: 'color-mix(in oklab, var(--border) 60%, transparent)' }}
                />
                <div className="space-y-3">
                  {steps.sort((a, b) => a.step_order - b.step_order).map((step, idx) => {
                    const meta = getStepMeta(step.status)
                    const Icon = meta.icon

                    return (
                      <div
                        key={step.id}
                        className="relative flex items-start gap-4 p-4 rounded-xl fade-up"
                        style={{
                          animationDelay: `${idx * 40}ms`,
                          border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)',
                          background: 'color-mix(in oklab, var(--muted) 20%, transparent)',
                        }}
                      >
                        {/* Step icon */}
                        <div
                          className="relative z-10 h-7 w-7 rounded-full grid place-items-center shrink-0"
                          style={{
                            background: `color-mix(in oklab, ${meta.color} 15%, transparent)`,
                            border: `1px solid color-mix(in oklab, ${meta.color} 35%, transparent)`,
                          }}
                        >
                          <Icon
                            className={`h-3.5 w-3.5 ${step.status === 'RUNNING' ? 'animate-spin' : ''}`}
                            style={{ color: meta.color }}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold">
                              {step.step_type.replace(/_/g, ' ')}
                            </span>
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                color: meta.color,
                                background: `color-mix(in oklab, ${meta.color} 12%, transparent)`,
                                border: `1px solid color-mix(in oklab, ${meta.color} 25%, transparent)`,
                              }}
                            >
                              {step.status}
                            </span>
                            <span className="text-[10px] ml-auto" style={{ color: 'var(--color-muted-foreground)' }}>
                              {relativeTime(step.created_at)}
                            </span>
                          </div>

                          {typeof step.result?.message === 'string' && (
                            <div
                              className="text-xs mt-2 leading-relaxed p-2 rounded-lg"
                              style={{
                                background: 'color-mix(in oklab, var(--primary) 8%, transparent)',
                                border: '1px solid color-mix(in oklab, var(--primary) 15%, transparent)',
                                color: 'color-mix(in oklab, var(--foreground) 85%, transparent)',
                              }}
                            >
                              {step.result.message}
                            </div>
                          )}

                          {typeof step.result?.assignedRole === 'string' && (
                            <div className="text-[11px] mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                              Assigned to: <span className="font-medium">{step.result.assignedRole.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Order badge */}
                        <span
                          className="text-[10px] font-mono shrink-0"
                          style={{ color: 'var(--color-muted-foreground)' }}
                        >
                          #{step.step_order}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
