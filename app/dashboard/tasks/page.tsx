'use client'

import { useState, useEffect } from 'react'
import { SeverityBadge, StatusBadge } from '@/components/badges'
import { approveStep, rejectStep, reportStep } from '@/lib/actions/steps'
import { RotateCcw, CheckCircle2, XCircle, MessageSquare, ChevronDown, Clock, Sparkles } from 'lucide-react'
import { AIHelpPanel, type Task } from '@/components/dashboard/AIHelpPanel'

function relativeTime(s: string) {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function countdownText(expiresAt: string): string {
  const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
  if (diff <= 0) return 'SLA Expired'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s remaining`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m remaining`
  return `${Math.floor(diff / 86400)}d remaining`
}

function TaskCard({ task, onAction, onAIHelp }: { task: Task; onAction: () => void; onAIHelp: (task: Task) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const isExpired = task.sla_expires_at && new Date(task.sla_expires_at).getTime() < Date.now()
  const isDone = !!feedback

  async function act(fn: () => Promise<void>, key: string) {
    setBusy(key); setFeedback(null)
    try {
      await fn()
      setFeedback({ type: 'ok', msg: `${key} successful` })
      onAction()
      window.dispatchEvent(new CustomEvent('sf:task-resolved'))
    }
    catch (e: any) { setFeedback({ type: 'err', msg: e.message || 'Failed' }) }
    finally { setBusy(null) }
  }

  async function toggleHistory() {
    if (!showHistory && historyData.length === 0) {
      setHistoryLoading(true)
      try {
        const res = await fetch(`/api/user/tasks/${task.id}/history`)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setHistoryData(data.timeline || [])
      } catch (e: any) { setHistoryError(e.message) } finally { setHistoryLoading(false) }
    }
    setShowHistory(v => !v)
  }

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold leading-tight">{task.incident_title}</h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
            {relativeTime(task.requested_at)}
            {task.assigned_role && <span className="ml-2">· {task.assigned_role.replace(/_/g, ' ')}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
            {task.type}
          </span>
          <StatusBadge status={task.status} />
        </div>
      </div>

      {/* Message */}
      {task.message && (
        <div className="px-4 py-3 rounded-lg text-xs" style={{ background: 'color-mix(in oklab, var(--primary) 8%, transparent)', border: '1px solid color-mix(in oklab, var(--primary) 15%, transparent)', color: 'color-mix(in oklab, var(--foreground) 85%, transparent)' }}>
          {task.message}
        </div>
      )}

      {/* Context */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg p-4" style={{ background: 'color-mix(in oklab, var(--muted) 20%, transparent)' }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Severity</p>
          <SeverityBadge severity={task.context?.severity || 'MEDIUM'} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Source</p>
          <p className="text-xs">{task.context?.source || '—'}</p>
        </div>
        {task.context?.playbook_id && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Playbook</p>
            <p className="text-[11px] font-mono">{task.context.playbook_id}</p>
          </div>
        )}
        {task.context?.ai_confidence != null && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted-foreground)' }}>AI Confidence</p>
            <p className="text-xs font-semibold">{(task.context.ai_confidence * 100).toFixed(1)}%</p>
          </div>
        )}
      </div>

      {/* SLA */}
      {task.sla_expires_at && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{
          background: isExpired ? 'color-mix(in oklab, var(--severity-critical) 10%, transparent)' : 'color-mix(in oklab, var(--severity-medium) 10%, transparent)',
          color: isExpired ? 'var(--severity-critical)' : 'var(--severity-medium)',
          border: `1px solid ${isExpired ? 'color-mix(in oklab, var(--severity-critical) 25%, transparent)' : 'color-mix(in oklab, var(--severity-medium) 25%, transparent)'}`,
        }}>
          <Clock className="h-3.5 w-3.5" />
          {countdownText(task.sla_expires_at)}
        </div>
      )}

      {/* AI Help */}
      {!isDone && (
        <button
          onClick={() => onAIHelp(task)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold w-full transition-colors"
          style={{ background: 'color-mix(in oklab, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in oklab, var(--color-primary) 25%, transparent)' }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Assistance
        </button>
      )}

      {/* History toggle */}
      <button onClick={toggleHistory} className="flex items-center gap-1 text-xs transition-colors" style={{ color: 'var(--color-primary)' }}>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
        {showHistory ? 'Hide History' : 'View Incident History'}
      </button>

      {showHistory && (
        <div className="rounded-lg p-4 max-h-56 overflow-y-auto" style={{ background: 'color-mix(in oklab, var(--muted) 20%, transparent)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
          {historyLoading ? (
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Loading…</p>
          ) : historyError ? (
            <p className="text-xs" style={{ color: 'var(--severity-critical)' }}>{historyError}</p>
          ) : historyData.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>No history found.</p>
          ) : (
            <div className="relative ml-2 space-y-4" style={{ borderLeft: '1px solid color-mix(in oklab, var(--border) 50%, transparent)' }}>
              {historyData.map((item: any, i: number) => (
                <div key={i} className="relative pl-4">
                  <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)', outline: '3px solid var(--color-card)' }} />
                  <p className="text-[10px] font-mono mb-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{new Date(item.timestamp).toLocaleString()}</p>
                  <p className="text-xs">{item.data?.action || item.type}</p>
                  {item.data?.reason && <p className="text-[11px] italic mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>"{item.data.reason}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="px-4 py-2 rounded-lg text-sm" style={{
          background: feedback.type === 'ok' ? 'color-mix(in oklab, var(--status-done) 12%, transparent)' : 'color-mix(in oklab, var(--severity-critical) 12%, transparent)',
          color: feedback.type === 'ok' ? 'var(--status-done)' : 'var(--severity-critical)',
          border: `1px solid ${feedback.type === 'ok' ? 'color-mix(in oklab, var(--status-done) 25%, transparent)' : 'color-mix(in oklab, var(--severity-critical) 25%, transparent)'}`,
        }}>
          {feedback.msg}
        </div>
      )}

      {/* Actions */}
      {!isDone && (
        <div className="space-y-3 pt-3" style={{ borderTop: '1px solid color-mix(in oklab, var(--border) 50%, transparent)' }}>
          {showNotes && (
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Notes / reason (required for Reject/Report)…" rows={2}
              className="w-full text-xs rounded-lg px-3 py-2 resize-none focus:outline-none"
              style={{ background: 'color-mix(in oklab, var(--input) 60%, transparent)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }} />
          )}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => act(() => approveStep(task.id, notes), 'Approve')} disabled={busy !== null}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-semibold uppercase tracking-wider disabled:opacity-50 transition-colors"
              style={{ background: 'color-mix(in oklab, var(--status-done) 20%, transparent)', color: 'var(--status-done)', border: '1px solid color-mix(in oklab, var(--status-done) 35%, transparent)' }}>
              <CheckCircle2 className="h-3 w-3" />{busy === 'Approve' ? '…' : 'Approve'}
            </button>
            <button onClick={() => { if (!notes.trim()) { setShowNotes(true); return } act(() => rejectStep(task.id, notes), 'Reject') }} disabled={busy !== null}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-semibold uppercase tracking-wider disabled:opacity-50 transition-colors"
              style={{ background: 'color-mix(in oklab, var(--severity-critical) 15%, transparent)', color: 'var(--severity-critical)', border: '1px solid color-mix(in oklab, var(--severity-critical) 30%, transparent)' }}>
              <XCircle className="h-3 w-3" />{busy === 'Reject' ? '…' : 'Reject'}
            </button>
            <button onClick={() => { if (!notes.trim()) { setShowNotes(true); return } act(() => reportStep(task.id, notes), 'Report') }} disabled={busy !== null}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-semibold uppercase tracking-wider disabled:opacity-50 transition-colors"
              style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
              <MessageSquare className="h-3 w-3" />{busy === 'Report' ? '…' : 'Report'}
            </button>
            <button onClick={() => setShowNotes(v => !v)}
              className="w-9 grid place-items-center rounded-lg transition-colors"
              style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showNotes ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const STATUS_OPTIONS = ['', 'PENDING', 'WAITING_APPROVAL', 'COMPLETED', 'FAILED']
const SEVERITY_OPTIONS = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const sel: React.CSSProperties = { background: 'color-mix(in oklab, var(--muted) 40%, transparent)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)', borderRadius: '0.5rem', padding: '6px 10px', fontSize: '12px' }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [sortBy, setSortBy] = useState('requested_at')
  const [order, setOrder] = useState('desc')
  const [aiTask, setAiTask] = useState<Task | null>(null)

  async function fetchTasks() {
    setLoading(true); setError(null)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (severity) params.set('severity', severity)
    if (sortBy) params.set('sortBy', sortBy)
    if (order) params.set('order', order)
    try {
      const res = await fetch(`/api/user/tasks?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchTasks() }, [status, severity, sortBy, order])

  const taskList = (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">My Tasks</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>Approval requests assigned to you</p>
        </div>
        <button onClick={fetchTasks} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors"
          style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}>
          <RotateCcw className="h-3 w-3" /> Refresh
        </button>
      </div>

      <div className="rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-end" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        {[
          { label: 'Status', value: status, set: setStatus, opts: STATUS_OPTIONS.map(s => [s, s || 'All Relevant']) },
          { label: 'Severity', value: severity, set: setSeverity, opts: SEVERITY_OPTIONS.map(s => [s, s || 'All Severities']) },
          { label: 'Sort By', value: sortBy, set: setSortBy, opts: [['requested_at','Date Requested'],['severity','Severity']] },
          { label: 'Order', value: order, set: setOrder, opts: [['desc','Descending'],['asc','Ascending']] },
        ].map(({ label, value, set, opts }) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>{label}</label>
            <select value={value} onChange={e => set(e.target.value)} style={sel}>
              {opts.map(([v, l]) => <option key={v} value={v} style={{ background: 'oklch(0.18 0.025 260)' }}>{l}</option>)}
            </select>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl p-6 space-y-4 animate-pulse" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="h-5 rounded w-1/3" style={{ background: 'var(--color-muted)' }} />
              <div className="h-12 rounded" style={{ background: 'var(--color-muted)' }} />
              <div className="h-10 rounded" style={{ background: 'var(--color-muted)' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="px-4 py-6 rounded-xl text-sm" style={{ background: 'color-mix(in oklab, var(--severity-critical) 10%, transparent)', border: '1px solid color-mix(in oklab, var(--severity-critical) 25%, transparent)', color: 'var(--severity-critical)' }}>{error}</div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <CheckCircle2 className="h-12 w-12 mb-4" style={{ color: 'color-mix(in oklab, var(--status-done) 40%, transparent)' }} />
          <p className="text-sm font-medium">No pending tasks</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>All caught up — no approval requests.</p>
        </div>
      ) : (
        <div className={`gap-5 ${aiTask ? 'flex flex-col' : 'grid grid-cols-1 xl:grid-cols-2'}`}>
          {tasks.map(task => <TaskCard key={task.id} task={task} onAction={fetchTasks} onAIHelp={setAiTask} />)}
        </div>
      )}
    </>
  )

  if (aiTask) {
    return <AIHelpPanel task={aiTask} onClose={() => setAiTask(null)} />
  }

  return <div>{taskList}</div>
}
