'use client'

import { useState, useEffect } from 'react'
import { SeverityBadge, StatusBadge } from '@/components/badges'
import { approveStep, rejectStep, reportStep } from '@/lib/actions/steps'

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function countdownText(expiresAt: string): string {
  const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
  if (diff <= 0) return 'Expired'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s remaining`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m remaining`
  return `${Math.floor(diff / 86400)}d remaining`
}

interface Task {
  id: string
  incident_id: string
  incident_title: string
  type: string
  status: string
  assigned_role: string | null
  message: string | null
  context: {
    severity: string
    source: string
    playbook_id?: string
    ai_confidence?: number
  }
  requested_at: string
  sla_expires_at: string | null
}

function TaskCard({ task, onAction }: { task: Task; onAction: () => void }) {
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | 'report' | 'redesign' | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showHistory, setShowHistory] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)

  async function handleApprove() {
    setActionLoading('approve')
    setError(null)
    try {
      await approveStep(task.id, notes)
      setSuccess('Step approved successfully.')
      onAction()
    } catch (e: any) {
      setError(e.message || 'Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject() {
    if (!notes.trim()) {
      setError('Notes/Feedback required for rejection.')
      return
    }
    setActionLoading('reject')
    setError(null)
    try {
      await rejectStep(task.id, notes)
      setSuccess('Step rejected.')
      onAction()
    } catch (e: any) {
      setError(e.message || 'Failed to reject')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReport() {
    if (!notes.trim()) {
      setError('Notes/Feedback required to report.')
      return
    }
    setActionLoading('report')
    setError(null)
    try {
      await reportStep(task.id, notes)
      setSuccess('Feedback submitted successfully.')
      onAction()
    } catch (e: any) {
      setError(e.message || 'Failed to submit feedback')
    } finally {
      setActionLoading(null)
    }
  }

  // Use dynamic import or direct call to action since requestRedesign is exported
  async function handleRedesign() {
    if (!notes.trim()) {
      setError('Reason required for redesign request.')
      return
    }
    setActionLoading('redesign')
    setError(null)
    try {
      const { requestRedesign } = await import('@/lib/actions/steps')
      await requestRedesign(task.id, notes)
      setSuccess('Redesign requested successfully.')
      onAction()
    } catch (e: any) {
      setError(e.message || 'Failed to request redesign')
    } finally {
      setActionLoading(null)
    }
  }

  async function toggleHistory() {
    if (!showHistory && historyData.length === 0) {
      setHistoryLoading(true)
      try {
        const res = await fetch(`/api/user/tasks/${task.id}/history`)
        if (!res.ok) throw new Error('Failed to load history')
        const data = await res.json()
        setHistoryData(data.timeline || [])
      } catch (e: any) {
        setHistoryError(e.message)
      } finally {
        setHistoryLoading(false)
      }
    }
    setShowHistory(!showHistory)
  }

  const isExpired = task.sla_expires_at && new Date(task.sla_expires_at).getTime() < Date.now()
  const canAct = !success

  return (
    <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">{task.incident_title}</h3>
          <p className="text-xs text-[#6b7280] mt-0.5">
            Requested {relativeTime(task.requested_at)}
            {task.assigned_role && <span className="ml-2">· {task.assigned_role.replace(/_/g, ' ')}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-[#1f2937] text-[#9ca3af] px-2 py-0.5 rounded font-mono">{task.type}</span>
          <StatusBadge status={task.status} />
        </div>
      </div>

      {/* Message */}
      {task.message && (
        <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg px-4 py-3">
          <p className="text-sm text-blue-200">{task.message}</p>
        </div>
      )}

      {/* Context */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0d1117] rounded-lg p-4">
        <div>
          <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">Severity</p>
          <SeverityBadge severity={task.context?.severity || 'MEDIUM'} />
        </div>
        <div>
          <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">Source</p>
          <p className="text-sm text-white">{task.context?.source || '—'}</p>
        </div>
        {task.context?.playbook_id && (
          <div>
            <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">Playbook</p>
            <p className="text-sm text-white font-mono text-xs">{task.context.playbook_id}</p>
          </div>
        )}
        {task.context?.ai_confidence != null && (
          <div>
            <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">AI Confidence</p>
            <p className="text-sm text-white">{(task.context.ai_confidence * 100).toFixed(1)}%</p>
          </div>
        )}
      </div>

      {/* SLA */}
      {task.sla_expires_at && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${isExpired ? 'bg-red-900/20 text-red-400 border border-red-900' : 'bg-amber-900/20 text-amber-400 border border-amber-900'}`}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {countdownText(task.sla_expires_at)}
        </div>
      )}

      {/* History Toggle */}
      <div>
        <button onClick={toggleHistory} className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
          <svg className={`w-4 h-4 transform transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showHistory ? 'Hide Incident History' : 'View Incident History'}
        </button>

        {showHistory && (
          <div className="mt-3 bg-[#0d1117] border border-[#1f2937] rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
            {historyLoading ? (
              <p className="text-xs text-[#6b7280]">Loading history...</p>
            ) : historyError ? (
              <p className="text-xs text-red-400">{historyError}</p>
            ) : historyData.length === 0 ? (
              <p className="text-xs text-[#6b7280]">No history found.</p>
            ) : (
              <div className="relative border-l border-[#1f2937] ml-2 space-y-4">
                {historyData.map((item, i) => (
                  <div key={i} className="relative pl-4">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-[#0d1117]" />
                    <p className="text-[10px] text-[#6b7280] font-mono mb-0.5">{new Date(item.timestamp).toLocaleString()}</p>
                    {item.type === 'STEP_CREATED' ? (
                      <div className="text-sm text-white">
                        <span className="font-semibold text-blue-400">{item.data.step_type}</span> step marked <span className="text-[#9ca3af]">{item.data.status}</span>
                      </div>
                    ) : (
                      <div className="text-sm text-white bg-[#111827] border border-[#1f2937] p-2 rounded mt-1">
                        <span className="font-semibold text-purple-400">{item.data.profiles?.name || 'System'}</span> performed <span className="font-mono text-xs text-[#9ca3af]">{item.data.action}</span>
                        {item.data.reason && (
                          <p className="text-[#9ca3af] text-xs italic mt-1 border-l-2 border-[#374151] pl-2">"{item.data.reason}"</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback */}
      {error && (
        <div className="px-4 py-2 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-2 bg-green-900/30 border border-green-800 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Actions */}
      {canAct && (
        <div className="space-y-3 pt-2 border-t border-[#1f2937]">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add optional notes, feedback, or a reason (Required for Reject/Redesign)..."
            rows={2}
            className="w-full bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleApprove}
              disabled={actionLoading !== null}
              className="flex-1 bg-green-700 hover:bg-green-600 disabled:bg-green-900 disabled:text-[#9ca3af] text-white py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              {actionLoading === 'approve' ? '...' : 'Approve'}
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading !== null}
              className="flex-1 bg-red-700 hover:bg-red-600 disabled:bg-red-900 disabled:text-[#9ca3af] text-white py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              {actionLoading === 'reject' ? '...' : 'Reject'}
            </button>
            <button
              onClick={handleReport}
              disabled={actionLoading !== null}
              className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-[#9ca3af] text-white py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              {actionLoading === 'report' ? '...' : 'Report'}
            </button>
            <button
              onClick={handleRedesign}
              disabled={actionLoading !== null}
              className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900 disabled:text-[#9ca3af] text-white py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
              title="Stop workflow and request AI redesign"
            >
              {actionLoading === 'redesign' ? '...' : 'Redesign'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const STATUS_OPTIONS = ['', 'PENDING', 'WAITING_APPROVAL', 'COMPLETED', 'FAILED']
const SEVERITY_OPTIONS = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [sortBy, setSortBy] = useState('requested_at')
  const [order, setOrder] = useState('desc')

  async function fetchTasks() {
    setLoading(true)
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
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [status, severity, sortBy, order])

  function resetFilters() {
    setStatus('')
    setSeverity('')
    setSortBy('requested_at')
    setOrder('desc')
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Tasks</h1>
          <p className="text-[#6b7280] text-sm mt-1">Approval requests and tasks assigned to you</p>
        </div>
        <button
          onClick={fetchTasks}
          className="bg-[#111827] border border-[#1f2937] hover:border-[#374151] text-[#9ca3af] hover:text-white px-3 py-2 rounded-lg text-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#6b7280] uppercase tracking-wider font-semibold">Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s || 'All Relevant'}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#6b7280] uppercase tracking-wider font-semibold">Severity</label>
          <select
            value={severity}
            onChange={e => setSeverity(e.target.value)}
            className="bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            {SEVERITY_OPTIONS.map(s => (
              <option key={s} value={s}>{s || 'All Severities'}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 border-l border-[#1f2937] pl-4">
          <label className="text-xs text-[#6b7280] uppercase tracking-wider font-semibold">Sort By</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="requested_at">Date Requested</option>
            <option value="severity">Severity</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#6b7280] uppercase tracking-wider font-semibold">Order</label>
          <select
            value={order}
            onChange={e => setOrder(e.target.value)}
            className="bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
        
        {(status || severity || sortBy !== 'requested_at' || order !== 'desc') && (
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm font-medium text-[#6b7280] hover:text-white border border-[#1f2937] bg-[#0d1117] rounded-lg hover:bg-[#1f2937] transition-colors ml-auto"
          >
            Reset
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 space-y-4 animate-pulse">
              <div className="h-5 bg-[#1f2937] rounded w-1/3" />
              <div className="h-12 bg-[#1f2937] rounded" />
              <div className="h-16 bg-[#1f2937] rounded" />
              <div className="flex gap-3">
                <div className="h-10 bg-[#1f2937] rounded flex-1" />
                <div className="h-10 bg-[#1f2937] rounded flex-1" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-red-400 text-sm">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-[#111827] border border-[#1f2937] rounded-xl">
          <svg className="w-16 h-16 text-[#374151] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[#6b7280] font-medium text-lg">No pending tasks</p>
          <p className="text-[#4b5563] text-sm mt-1">All caught up — no approval requests assigned to you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onAction={fetchTasks} />
          ))}
        </div>
      )}
    </div>
  )
}
