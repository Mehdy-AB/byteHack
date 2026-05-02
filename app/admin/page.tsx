'use client'

import { useEffect, useState } from 'react'
import { Shield, Activity, AlertTriangle, Clock, CheckCircle2, XCircle, RefreshCw, Loader2, Send, Sliders, Trash2 } from 'lucide-react'
import { voidWorkflow, setIncidentPriority, resendStepNotification } from '@/lib/actions/incidents'

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface DashStats {
  activeWorkflows: number
  pendingSteps: number
  failedSteps24h: number
  criticalOpen: number
}

interface FailedStep {
  id: string
  incident_id: string
  step_type: string
  error_detail: string | null
  created_at: string
}

interface WaitingStep {
  id: string
  incident_id: string
  step_type: string
  assigned_role: string | null
  created_at: string
}

export default function AdminPage() {
  const [stats, setStats] = useState<DashStats | null>(null)
  const [failed, setFailed] = useState<FailedStep[]>([])
  const [waiting, setWaiting] = useState<WaitingStep[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Void workflow form
  const [voidId, setVoidId] = useState('')
  const [voidReason, setVoidReason] = useState('')

  // Priority form
  const [priorityId, setPriorityId] = useState('')
  const [priorityVal, setPriorityVal] = useState('5')

  // Resend form
  const [resendStepId, setResendStepId] = useState('')

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/monitor')
      const d = await res.json()
      setStats({
        activeWorkflows: d.activeWorkflows ?? 0,
        pendingSteps: d.pendingSteps ?? 0,
        failedSteps24h: d.failedSteps ?? 0,
        criticalOpen: d.criticalOpen ?? 0,
      })
      setFailed(d.recentFailed || [])
      setWaiting(d.waitingSteps || [])
    } catch {
      setStats({ activeWorkflows: 0, pendingSteps: 0, failedSteps24h: 0, criticalOpen: 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  async function handleVoid() {
    if (!voidId.trim() || !voidReason.trim()) { showToast('Incident ID and reason required', false); return }
    setActionLoading('void')
    try {
      await voidWorkflow(voidId.trim(), voidReason.trim())
      showToast('Workflow voided and incident closed')
      setVoidId(''); setVoidReason('')
      fetchData()
    } catch (e: any) {
      showToast(e.message || 'Failed to void workflow', false)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSetPriority() {
    if (!priorityId.trim()) { showToast('Incident ID required', false); return }
    setActionLoading('priority')
    try {
      await setIncidentPriority(priorityId.trim(), parseInt(priorityVal))
      showToast(`Priority set to ${priorityVal}`)
      setPriorityId('')
    } catch (e: any) {
      showToast(e.message || 'Failed to set priority', false)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleResend() {
    if (!resendStepId.trim()) { showToast('Step ID required', false); return }
    setActionLoading('resend')
    try {
      await resendStepNotification(resendStepId.trim())
      showToast('Notification resent')
      setResendStepId('')
    } catch (e: any) {
      showToast(e.message || 'Failed to resend', false)
    } finally {
      setActionLoading(null)
    }
  }

  const isDegraded = (stats?.failedSteps24h ?? 0) > 5

  return (
    <div className="space-y-6">
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          <div>
            <h1 className="text-xl font-semibold">System Monitor</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>Platform health and workflow controls</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-muted-foreground)' }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Health banner */}
      <div
        className="rounded-xl p-5 flex items-center gap-4"
        style={{
          background: isDegraded
            ? 'color-mix(in oklab, var(--severity-critical) 10%, var(--color-card))'
            : 'color-mix(in oklab, var(--status-done) 10%, var(--color-card))',
          border: `1px solid color-mix(in oklab, ${isDegraded ? 'var(--severity-critical)' : 'var(--status-done)'} 30%, transparent)`,
        }}
      >
        <div
          className="h-3 w-3 rounded-full shrink-0"
          style={{
            background: isDegraded ? 'var(--severity-critical)' : 'var(--status-done)',
            boxShadow: `0 0 8px ${isDegraded ? 'var(--severity-critical)' : 'var(--status-done)'}`,
          }}
        />
        <div>
          <p className="text-sm font-bold" style={{ color: isDegraded ? 'var(--severity-critical)' : 'var(--status-done)' }}>
            {isDegraded ? 'DEGRADED' : 'OPERATIONAL'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
            {isDegraded
              ? `${stats?.failedSteps24h} step failures in the last 24 hours — attention required`
              : 'All systems functioning normally'}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Workflows', value: stats?.activeWorkflows ?? 0, color: 'var(--color-primary)', icon: Activity, desc: 'OPEN or CONTAINED' },
          { label: 'Pending Steps', value: stats?.pendingSteps ?? 0, color: 'var(--severity-medium)', icon: Clock, desc: 'Awaiting action' },
          { label: 'Failed Steps (24h)', value: stats?.failedSteps24h ?? 0, color: isDegraded ? 'var(--severity-critical)' : 'var(--status-done)', icon: isDegraded ? XCircle : CheckCircle2, desc: 'Last 24 hours' },
          { label: 'Critical Open', value: stats?.criticalOpen ?? 0, color: 'var(--severity-critical)', icon: AlertTriangle, desc: 'CRITICAL severity' },
        ].map(card => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-xl p-5"
              style={{
                background: 'var(--color-card)',
                border: `1px solid color-mix(in oklab, ${card.color} 25%, var(--color-border))`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
                  {card.label}
                </p>
                <div className="h-7 w-7 rounded-lg grid place-items-center" style={{ background: `color-mix(in oklab, ${card.color} 15%, transparent)` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: card.color }} />
                </div>
              </div>
              {loading ? (
                <div className="h-8 w-12 rounded animate-pulse" style={{ background: 'var(--color-muted)' }} />
              ) : (
                <p className="text-3xl font-bold" style={{ color: card.color }}>{card.value}</p>
              )}
              <p className="text-[10px] mt-1" style={{ color: 'var(--color-muted-foreground)' }}>{card.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Workflow Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Void Workflow */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" style={{ color: 'var(--severity-critical)' }} />
            <h3 className="text-sm font-semibold">Void Workflow</h3>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>Cancel all pending steps and close the incident.</p>
          <input
            type="text"
            value={voidId}
            onChange={e => setVoidId(e.target.value)}
            placeholder="Incident UUID"
            className="w-full px-3 py-2 rounded-lg text-xs outline-none font-mono"
            style={{ background: 'color-mix(in oklab, var(--muted) 30%, transparent)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
          />
          <textarea
            rows={2}
            value={voidReason}
            onChange={e => setVoidReason(e.target.value)}
            placeholder="Reason for voiding…"
            className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
            style={{ background: 'color-mix(in oklab, var(--muted) 30%, transparent)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
          />
          <button
            onClick={handleVoid}
            disabled={actionLoading === 'void'}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold disabled:opacity-60"
            style={{ background: 'color-mix(in oklab, var(--severity-critical) 15%, transparent)', color: 'var(--severity-critical)', border: '1px solid color-mix(in oklab, var(--severity-critical) 30%, transparent)' }}
          >
            {actionLoading === 'void' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Void Workflow
          </button>
        </div>

        {/* Set Priority */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4" style={{ color: 'var(--severity-medium)' }} />
            <h3 className="text-sm font-semibold">Set Priority</h3>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>Change incident priority (1 = highest, 10 = lowest).</p>
          <input
            type="text"
            value={priorityId}
            onChange={e => setPriorityId(e.target.value)}
            placeholder="Incident UUID"
            className="w-full px-3 py-2 rounded-lg text-xs outline-none font-mono"
            style={{ background: 'color-mix(in oklab, var(--muted) 30%, transparent)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
          />
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>
              <span>1 (highest)</span>
              <span className="font-bold" style={{ color: 'var(--color-foreground)' }}>Priority: {priorityVal}</span>
              <span>10 (lowest)</span>
            </div>
            <input
              type="range" min="1" max="10" value={priorityVal}
              onChange={e => setPriorityVal(e.target.value)}
              className="w-full accent-primary"
            />
          </div>
          <button
            onClick={handleSetPriority}
            disabled={actionLoading === 'priority'}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold disabled:opacity-60"
            style={{ background: 'color-mix(in oklab, var(--severity-medium) 15%, transparent)', color: 'var(--severity-medium)', border: '1px solid color-mix(in oklab, var(--severity-medium) 30%, transparent)' }}
          >
            {actionLoading === 'priority' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sliders className="h-3 w-3" />}
            Update Priority
          </button>
        </div>

        {/* Resend Notification */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            <h3 className="text-sm font-semibold">Resend Notification</h3>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>Re-send the assignment notification for a step.</p>
          <input
            type="text"
            value={resendStepId}
            onChange={e => setResendStepId(e.target.value)}
            placeholder="Step UUID"
            className="w-full px-3 py-2 rounded-lg text-xs outline-none font-mono"
            style={{ background: 'color-mix(in oklab, var(--muted) 30%, transparent)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
          />
          <button
            onClick={handleResend}
            disabled={actionLoading === 'resend'}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold disabled:opacity-60 mt-auto"
            style={{ background: 'color-mix(in oklab, var(--primary) 15%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in oklab, var(--primary) 30%, transparent)' }}
          >
            {actionLoading === 'resend' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Resend
          </button>
        </div>
      </div>

      {/* Waiting for approval */}
      {waiting.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h2 className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
              Waiting for Approval ({waiting.length})
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {waiting.slice(0, 10).map(step => (
              <div key={step.id} className="flex items-center gap-4 px-5 py-3">
                <div className="h-2 w-2 rounded-full shrink-0 animate-pulse" style={{ background: 'var(--severity-medium)' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">{step.step_type}</span>
                    {step.assigned_role && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in oklab, var(--primary) 10%, transparent)', color: 'var(--color-primary)' }}>
                        {step.assigned_role.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--color-muted-foreground)' }}>
                    incident: {step.incident_id.slice(0, 12)}…
                  </div>
                </div>
                <span className="text-[10px] shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>
                  {relativeTime(step.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent failed steps */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>
            Recent Failed Steps (24h)
          </h2>
        </div>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--color-muted)' }} />
            ))}
          </div>
        ) : failed.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-6">
            <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: 'var(--status-done)' }} />
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No failed steps in the last 24 hours</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'color-mix(in oklab, var(--muted) 15%, transparent)' }}>
                  {['Incident ID', 'Step Type', 'Error', 'Time'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)', fontSize: '10px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failed.map(step => (
                  <tr key={step.id} style={{ borderBottom: '1px solid color-mix(in oklab, var(--border) 40%, transparent)' }}>
                    <td className="px-4 py-3 font-mono text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>
                      {step.incident_id.slice(0, 12)}…
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: 'color-mix(in oklab, var(--muted) 30%, transparent)', color: 'var(--color-foreground)' }}>
                        {step.step_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[280px]" style={{ color: 'var(--color-muted-foreground)' }}>
                      <span className="truncate block">{step.error_detail || '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--color-muted-foreground)' }}>
                      {relativeTime(step.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
