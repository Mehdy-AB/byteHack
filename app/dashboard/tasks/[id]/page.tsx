'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Clock, User, AlertCircle, MessageSquare, Loader2, ChevronRight, Flag } from 'lucide-react'
import { approveStep, rejectStep, reportStep } from '@/lib/actions/steps'

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

const ACTION_COLORS: Record<string, string> = {
  APPROVE: 'var(--status-done)',
  REJECT: 'var(--severity-critical)',
  REPORT: 'var(--severity-medium)',
  REQUEST_REDESIGN: 'var(--severity-high)',
  REASSIGN: 'var(--color-primary)',
  SKIP: 'var(--color-muted-foreground)',
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'var(--status-done)',
  FAILED: 'var(--severity-critical)',
  WAITING_APPROVAL: 'var(--severity-medium)',
  PENDING: 'var(--color-muted-foreground)',
  RUNNING: 'var(--color-primary)',
  SKIPPED: 'oklch(0.55 0.02 260)',
  SUSPENDED: 'var(--severity-high)',
}

interface TimelineEvent {
  type: 'STEP_CREATED' | 'USER_ACTION'
  id: string
  timestamp: string
  data: any
}

interface Step {
  id: string
  step_type: string
  status: string
  assigned_role: string | null
  result: any
  error_detail: string | null
  sla_deadline: string | null
  created_at: string
  incidents?: { id: string; raw_input: any; severity: string; source: string }
}

export default function TaskDetailPage() {
  const { id: stepId } = useParams<{ id: string }>()
  const router = useRouter()
  const [step, setStep] = useState<Step | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!stepId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/user/tasks/${stepId}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/user/tasks/${stepId}/history`).then(r => r.json()).catch(() => ({ timeline: [] })),
    ]).then(([taskData, histData]) => {
      setStep(taskData.task || taskData)
      setTimeline(histData.timeline || [])
    }).finally(() => setLoading(false))
  }, [stepId])

  async function handleApprove() {
    setActionLoading('approve')
    try {
      await approveStep(stepId, reason || undefined)
      showToast('Step approved successfully')
      router.push('/dashboard/tasks')
    } catch (e: any) {
      showToast(e.message || 'Failed to approve', false)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject() {
    if (!reason.trim()) { showToast('Reason is required for rejection', false); return }
    setActionLoading('reject')
    try {
      await rejectStep(stepId, reason)
      showToast('Step rejected')
      router.push('/dashboard/tasks')
    } catch (e: any) {
      showToast(e.message || 'Failed to reject', false)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReport() {
    if (!reason.trim()) { showToast('Feedback is required', false); return }
    setActionLoading('report')
    try {
      await reportStep(stepId, reason)
      showToast('Step reported — flagged for review')
      router.push('/dashboard/tasks')
    } catch (e: any) {
      showToast(e.message || 'Failed to report', false)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  const severity = step?.incidents?.severity || step?.result?.context?.severity || 'MEDIUM'
  const sevColor = SEV_COLORS[severity] || SEV_COLORS.MEDIUM
  const statusColor = STATUS_COLORS[step?.status || 'PENDING'] || STATUS_COLORS.PENDING
  const isActionable = step?.status === 'WAITING_APPROVAL'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg"
          style={{
            background: toast.ok ? 'color-mix(in oklab, var(--status-done) 15%, var(--color-card))' : 'color-mix(in oklab, var(--severity-critical) 15%, var(--color-card))',
            border: `1px solid ${toast.ok ? 'color-mix(in oklab, var(--status-done) 35%, transparent)' : 'color-mix(in oklab, var(--severity-critical) 35%, transparent)'}`,
            color: toast.ok ? 'var(--status-done)' : 'var(--severity-critical)',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Back + Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard/tasks')}
          className="flex items-center gap-1.5 text-xs mb-4 transition-colors"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Tasks
        </button>

        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-start gap-4">
            <div
              className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
              style={{ background: `color-mix(in oklab, ${sevColor} 15%, transparent)`, border: `1px solid color-mix(in oklab, ${sevColor} 30%, transparent)` }}
            >
              <Flag className="h-5 w-5" style={{ color: sevColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-semibold">
                  {step?.result?.message || step?.step_type?.replace(/_/g, ' ') || 'Task'}
                </h1>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `color-mix(in oklab, ${statusColor} 12%, transparent)`, color: statusColor, border: `1px solid color-mix(in oklab, ${statusColor} 25%, transparent)` }}
                >
                  {step?.status}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `color-mix(in oklab, ${sevColor} 12%, transparent)`, color: sevColor, border: `1px solid color-mix(in oklab, ${sevColor} 25%, transparent)` }}
                >
                  {severity}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {step?.incidents?.raw_input?.title || step?.incidents?.source || 'Incident'}
                </span>
                {step?.assigned_role && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    <User className="h-3 w-3" />
                    {step.assigned_role.replace(/_/g, ' ')}
                  </span>
                )}
                {step?.sla_deadline && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: new Date(step.sla_deadline) < new Date() ? 'var(--severity-critical)' : 'var(--severity-medium)' }}>
                    <Clock className="h-3 w-3" />
                    SLA: {new Date(step.sla_deadline).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Panel */}
      {isActionable && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Your Decision</h2>

          {(showReject || showReport) && (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                {showReject ? 'Rejection Reason' : 'Report Details'}
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={showReject ? 'Explain why you are rejecting...' : 'Describe the issue...'}
                className="w-full rounded-lg text-sm resize-none p-3 outline-none"
                style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
              />
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {!showReject && !showReport && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
                  style={{ background: 'color-mix(in oklab, var(--status-done) 20%, transparent)', color: 'var(--status-done)', border: '1px solid color-mix(in oklab, var(--status-done) 35%, transparent)' }}
                >
                  {actionLoading === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Approve
                </button>
                <button
                  onClick={() => setShowReject(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: 'color-mix(in oklab, var(--severity-critical) 12%, transparent)', color: 'var(--severity-critical)', border: '1px solid color-mix(in oklab, var(--severity-critical) 25%, transparent)' }}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
                <button
                  onClick={() => setShowReport(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: 'color-mix(in oklab, var(--severity-medium) 12%, transparent)', color: 'var(--severity-medium)', border: '1px solid color-mix(in oklab, var(--severity-medium) 25%, transparent)' }}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Report Issue
                </button>
              </>
            )}

            {showReject && (
              <>
                <button
                  onClick={handleReject}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'color-mix(in oklab, var(--severity-critical) 20%, transparent)', color: 'var(--severity-critical)', border: '1px solid color-mix(in oklab, var(--severity-critical) 35%, transparent)' }}
                >
                  {actionLoading === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Confirm Rejection
                </button>
                <button onClick={() => { setShowReject(false); setReason('') }} className="text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }}>
                  Cancel
                </button>
              </>
            )}

            {showReport && (
              <>
                <button
                  onClick={handleReport}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                  style={{ background: 'color-mix(in oklab, var(--severity-medium) 20%, transparent)', color: 'var(--severity-medium)', border: '1px solid color-mix(in oklab, var(--severity-medium) 35%, transparent)' }}
                >
                  {actionLoading === 'report' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                  Submit Report
                </button>
                <button onClick={() => { setShowReport(false); setReason('') }} className="text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Incident Timeline */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>Incident Timeline</h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 60%, transparent)' }}>{timeline.length} events across all workflow steps</p>
        </div>

        <div className="p-5">
          {timeline.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-7 w-7 mx-auto mb-2" style={{ color: 'color-mix(in oklab, var(--muted-foreground) 30%, transparent)' }} />
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No history yet</p>
            </div>
          ) : (
            <ol className="relative space-y-1 before:absolute before:left-[15px] before:top-4 before:bottom-4 before:w-px" style={{ '--tw-border-opacity': '0.3' } as any}>
              {timeline.map((event, idx) => {
                const isAction = event.type === 'USER_ACTION'
                const actionColor = isAction ? (ACTION_COLORS[event.data?.action] || ACTION_COLORS.SKIP) : 'var(--color-primary)'
                const statusColor2 = !isAction ? (STATUS_COLORS[event.data?.status] || STATUS_COLORS.PENDING) : null

                return (
                  <li key={event.id} className="relative flex items-start gap-3 pl-10 py-2.5 rounded-lg fade-up" style={{ animationDelay: `${idx * 25}ms` }}>
                    <div
                      className="absolute left-0 h-7 w-7 rounded-full grid place-items-center z-10"
                      style={{
                        background: 'var(--color-card)',
                        border: `1px solid color-mix(in oklab, ${isAction ? actionColor : (statusColor2 || 'var(--color-border)')} 45%, transparent)`,
                        boxShadow: '0 0 0 3px var(--color-card)',
                      }}
                    >
                      {isAction
                        ? event.data?.action === 'APPROVE' ? <CheckCircle2 className="h-3 w-3" style={{ color: actionColor }} />
                          : event.data?.action === 'REJECT' ? <XCircle className="h-3 w-3" style={{ color: actionColor }} />
                          : <MessageSquare className="h-3 w-3" style={{ color: actionColor }} />
                        : <ChevronRight className="h-3 w-3" style={{ color: statusColor2 || 'var(--color-primary)' }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isAction ? actionColor : (statusColor2 || 'var(--color-primary)') }}>
                          {isAction ? event.data?.action?.replace(/_/g, ' ') : event.data?.step_type?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>{relativeTime(event.timestamp)}</span>
                      </div>
                      {isAction && event.data?.profiles && (
                        <div className="text-xs mt-0.5" style={{ color: 'color-mix(in oklab, var(--foreground) 80%, transparent)' }}>
                          by {event.data.profiles.name || event.data.profiles.email}
                          {event.data.profiles.role && (
                            <span className="ml-1.5 text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>({event.data.profiles.role.replace(/_/g, ' ')})</span>
                          )}
                        </div>
                      )}
                      {isAction && event.data?.reason && (
                        <div className="text-xs mt-1 p-2 rounded-lg" style={{ background: `color-mix(in oklab, ${actionColor} 8%, transparent)`, border: `1px solid color-mix(in oklab, ${actionColor} 15%, transparent)`, color: 'color-mix(in oklab, var(--foreground) 85%, transparent)' }}>
                          {event.data.reason}
                        </div>
                      )}
                      {!isAction && event.data?.status && (
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                          Status: <span className="font-medium" style={{ color: statusColor2 || 'inherit' }}>{event.data.status}</span>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
