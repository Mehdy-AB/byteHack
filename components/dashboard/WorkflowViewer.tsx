'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { GitBranch, CheckCircle2, XCircle, Clock, Loader2, AlertCircle, ZoomIn, ZoomOut, Maximize2, Sparkles, Brain, Briefcase, User, Info, Terminal } from 'lucide-react'
import toast from 'react-hot-toast'

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
  const router = useRouter()
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(false)
  const [incidentTitle, setIncidentTitle] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, step: Step } | null>(null)
  const [explainingStep, setExplainingStep] = useState<Step | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 2))
  const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.4))
  const handleReset = () => setScale(1)

  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setScale(s => Math.min(Math.max(s + delta, 0.4), 2))
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const wheelHandler = (e: WheelEvent) => handleWheel(e)
    const clickHandler = () => setContextMenu(null)

    container.addEventListener('wheel', wheelHandler, { passive: false })
    window.addEventListener('click', clickHandler)
    return () => {
      container.removeEventListener('wheel', wheelHandler)
      window.removeEventListener('click', clickHandler)
    }
  }, [])

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
    <div className="h-full flex flex-col bg-background relative">
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
        ref={containerRef}
        className="flex-1 overflow-auto relative p-16 select-none"
        style={{
          background: 'color-mix(in oklab, var(--background) 95%, var(--muted))',
          backgroundImage: 'radial-gradient(color-mix(in oklab, var(--border) 80%, transparent) 1px, transparent 1px)',
          backgroundSize: `${24 * scale}px ${24 * scale}px`,
          backgroundPosition: 'center',
        }}
      >
        {loading ? (
          <div className="flex items-center gap-8" style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
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
          <div 
            className="flex items-center min-h-full w-max transition-transform duration-200 ease-out" 
            style={{ transform: `scale(${scale})`, transformOrigin: '0 50%' }}
          >
            {steps.sort((a, b) => a.step_order - b.step_order).map((step, idx) => {
              const meta = getStepMeta(step.status)
              const Icon = meta.icon
              const isLast = idx === steps.length - 1

              return (
                <div 
                  key={step.id} 
                  className="flex items-center shrink-0 fade-up" 
                  style={{ animationDelay: `${idx * 40}ms` }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY, step })
                  }}
                >
                  {/* Node Card */}
                  <div
                    className="w-[280px] rounded-xl shadow-md relative flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] cursor-context-menu"
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

      {/* Floating Zoom Controls */}
      <div className="absolute bottom-8 right-8 z-50 flex items-center gap-1 p-1.5 rounded-2xl shadow-2xl border border-border/50 bg-card/80 backdrop-blur-xl">
        <button
          onClick={handleZoomOut}
          className="p-2.5 rounded-xl hover:bg-primary/10 transition-colors text-foreground/70 hover:text-primary"
          title="Zoom Out"
        >
          <ZoomOut className="h-4.5 w-4.5" />
        </button>
        <div className="w-px h-4 bg-border/50 mx-1" />
        <button
          onClick={handleReset}
          className="px-3 py-2.5 rounded-xl hover:bg-primary/10 transition-colors text-foreground/70 hover:text-primary flex items-center gap-2"
          title="Reset Zoom"
        >
          <Maximize2 className="h-4 w-4" />
          <span className="text-[10px] font-bold tabular-nums">{Math.round(scale * 100)}%</span>
        </button>
        <div className="w-px h-4 bg-border/50 mx-1" />
        <button
          onClick={handleZoomIn}
          className="p-2.5 rounded-xl hover:bg-primary/10 transition-colors text-foreground/70 hover:text-primary"
          title="Zoom In"
        >
          <ZoomIn className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-[100] w-56 bg-card border border-border/50 rounded-xl shadow-2xl backdrop-blur-xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-border/50 mb-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action</div>
            <div className="text-xs font-semibold truncate">{contextMenu.step.step_type.replace(/_/g, ' ')}</div>
          </div>
          <button
            onClick={() => {
              const taskInfo = {
                task: contextMenu.step.step_type,
                order: contextMenu.step.step_order,
                status: contextMenu.step.status,
                details: contextMenu.step.result?.message || 'No details'
              }
              const query = encodeURIComponent(JSON.stringify(taskInfo))
              router.push(`/dashboard/analyze?explain=${query}`)
              setContextMenu(null)
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground/80 hover:text-primary hover:bg-primary/10 transition-all group"
          >
            <Sparkles className="h-4 w-4 text-primary transition-transform group-hover:rotate-12" />
            AI Task Analysis
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground/80 hover:bg-muted/50 transition-all"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(contextMenu.step, null, 2))
              toast.success('Task JSON copied')
              setContextMenu(null)
            }}
          >
            <Terminal className="h-4 w-4 text-muted-foreground" />
            Copy Payload
          </button>
        </div>
      )}

      {/* AI Explanation Modal */}
      {explainingStep && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setExplainingStep(null)} />
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
            {/* Modal Header */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">AI Task Interpretation</h3>
                  <p className="text-xs text-muted-foreground">{explainingStep.step_type.replace(/_/g, ' ')} • Step #{explainingStep.step_order}</p>
                </div>
              </div>
              <button 
                onClick={() => setExplainingStep(null)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Technical Analysis (Admin) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Terminal className="h-4 w-4" />
                  Admin / Technical Analysis
                </div>
                <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 text-sm leading-relaxed">
                  This task involves <span className="font-bold">{explainingStep.step_type.toLowerCase().replace(/_/g, ' ')}</span> operations. 
                  Technically, it is designed to {explainingStep.result?.message ? `address: "${explainingStep.result.message}"` : 'automate the response process by interacting with the underlying security infrastructure'}. 
                  The administrator should monitor for 
                  {explainingStep.status === 'FAILED' ? ' specific error codes in the logs to debug why the automated execution failed.' : ' successful completion signals to proceed with subsequent mitigation steps.'}
                </div>
              </div>

              {/* Skills & Human Capital (RH) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-orange-500">
                  <Briefcase className="h-4 w-4" />
                  RH / Skills Requirements
                </div>
                <div className="p-4 rounded-2xl border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900/30 text-sm leading-relaxed">
                  To execute or supervise this task, an employee needs expertise in <span className="font-bold">Cybersecurity Orchestration</span> and <span className="font-bold">Cloud Infrastructure Management</span>.
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/40 text-[10px] font-bold text-orange-700 dark:text-orange-400">Incident Response</span>
                    <span className="px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/40 text-[10px] font-bold text-orange-700 dark:text-orange-400">Network Security</span>
                    <span className="px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/40 text-[10px] font-bold text-orange-700 dark:text-orange-400">Automation Scripting</span>
                  </div>
                </div>
              </div>

              {/* Status Interpretation */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/50 border border-border">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: getStepMeta(explainingStep.status).color }}>
                  <Info className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: getStepMeta(explainingStep.status).color }}>Current Status: {explainingStep.status}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The task is currently {explainingStep.status.toLowerCase()}. {explainingStep.status === 'COMPLETED' ? 'No further manual intervention is required for this specific node.' : 'Immediate attention might be needed if this blocks the rest of the workflow.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-muted/20 border-t border-border flex justify-end">
              <button 
                onClick={() => setExplainingStep(null)}
                className="px-6 py-2 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Close Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
