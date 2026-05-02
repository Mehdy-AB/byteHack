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
  result: Record<string, any> | null
  assigned_user_name?: string | null
  assigned_user_email?: string | null
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
        setSteps(d.steps || incident.steps || [])
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
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
        <GitBranch className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
        <div>
          <h3 className="text-sm font-semibold">Workflow Orchestration</h3>
          {incidentTitle && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{incidentTitle}</div>
          )}
        </div>
        <span className="ml-auto text-[11px] tabular-nums font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
          {loading ? '…' : `${steps.length} steps`}
        </span>
      </div>

      {/* Canvas Area (n8n style) */}
      <div
        className="flex-1 overflow-auto relative p-16"
        style={{
          background: 'color-mix(in oklab, var(--background) 95%, var(--muted))',
          backgroundImage: 'radial-gradient(color-mix(in oklab, var(--border) 80%, transparent) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {loading ? (
          <div className="flex items-center gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 w-64 rounded-xl animate-pulse shrink-0" style={{ background: 'var(--color-muted)' }} />
            ))}
          </div>
        ) : steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="h-8 w-8 mx-auto mb-3" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 40%, transparent)' }} />
            <div className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>No workflow steps found</div>
            <div className="text-xs mt-1" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 60%, transparent)' }}>Run a workflow or select an incident</div>
          </div>
        ) : (
          <div className="flex items-center min-h-full w-max">
            {steps.sort((a, b) => a.step_order - b.step_order).map((step, idx) => {
              const meta = getStepMeta(step.status)
              const Icon = meta.icon
              const isLast = idx === steps.length - 1

              return (
                <div key={step.id} className="flex items-center shrink-0 fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                  {/* Node Card */}
                  <div
                    className="w-[280px] rounded-xl shadow-md relative flex flex-col transition-transform hover:-translate-y-1"
                    style={{
                      background: 'var(--color-card)',
                      border: `1px solid color-mix(in oklab, ${meta.color} 40%, var(--border))`,
                      boxShadow: `0 4px 20px color-mix(in oklab, ${meta.color} 10%, transparent)`
                    }}
                  >
                    {/* Left Port (Input) */}
                    {idx > 0 && (
                      <div
                        className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full z-10"
                        style={{ background: 'var(--color-card)', border: `2px solid var(--color-border)` }}
                      />
                    )}
                    {/* Right Port (Output) */}
                    {!isLast && (
                      <div
                        className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full z-10"
                        style={{ background: 'var(--color-card)', border: `2px solid color-mix(in oklab, ${meta.color} 80%, var(--border))` }}
                      />
                    )}

                    {/* Node Header */}
                    <div
                      className="px-4 py-3 flex items-center gap-3 rounded-t-xl"
                      style={{
                        background: `color-mix(in oklab, ${meta.color} 8%, transparent)`,
                        borderBottom: '1px solid color-mix(in oklab, var(--border) 50%, transparent)',
                      }}
                    >
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                        style={{ background: meta.color, color: 'var(--color-background)' }}
                      >
                        <Icon className={`h-4 w-4 ${step.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate tracking-tight text-foreground">
                          {step.step_type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                          {step.status}
                        </div>
                      </div>
                      <div className="shrink-0 text-[10px] font-mono" style={{ color: 'var(--color-muted-foreground)' }}>
                        #{step.step_order}
                      </div>
                    </div>

                    {/* Node Body */}
                    <div className="p-4">
                      {typeof step.result?.message === 'string' && (
                        <p className="text-[11px] leading-relaxed mb-3 line-clamp-3" style={{ color: 'color-mix(in oklab, var(--foreground) 90%, transparent)' }}>
                          {step.result.message}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px dashed color-mix(in oklab, var(--border) 80%, transparent)' }}>
                        <div className="flex flex-col">
                          <div className="text-[10px] font-bold" style={{ color: 'var(--color-foreground)' }}>
                            {step.assigned_user_name || (typeof step.result?.assignedRole === 'string' ? step.result.assignedRole.replace(/_/g, ' ') : 'System Auto')}
                          </div>
                          {step.assigned_user_email && (
                            <div className="text-[9px] opacity-70" style={{ color: 'var(--color-muted-foreground)' }}>
                              {step.assigned_user_email}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] font-mono self-end" style={{ color: 'var(--color-muted-foreground)' }}>
                          {relativeTime(step.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bezier Curve Connector */}
                  {!isLast && (
                    <svg className="w-16 h-16 shrink-0 overflow-visible" viewBox="0 0 64 64">
                      <path
                        d="M 0 32 C 32 32, 32 32, 64 32"
                        fill="none"
                        stroke={`color-mix(in oklab, ${meta.color} 50%, var(--border))`}
                        strokeWidth="2"
                        strokeDasharray={step.status === 'RUNNING' || step.status === 'PENDING' ? '4 4' : 'none'}
                        className={step.status === 'RUNNING' ? 'animate-pulse' : ''}
                      />
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
