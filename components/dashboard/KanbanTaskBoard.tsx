'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { GripVertical, Clock, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react'
import { approveStep, rejectStep } from '@/lib/actions/steps'

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

interface Task {
  id: string
  incident_id: string
  incident_title: string
  type: string
  status: string
  assigned_role: string | null
  message: string | null
  context: { severity: string; source: string; playbook_id?: string; ai_confidence?: number }
  requested_at: string
  sla_expires_at: string | null
}

type Column = 'pending' | 'in_progress' | 'done'

const COLUMNS: { id: Column; label: string; statusMatch: string[] }[] = [
  { id: 'pending', label: 'Pending', statusMatch: ['PENDING'] },
  { id: 'in_progress', label: 'Awaiting Approval', statusMatch: ['WAITING_APPROVAL'] },
  { id: 'done', label: 'Completed', statusMatch: ['COMPLETED', 'APPROVED', 'REJECTED'] },
]

const COL_COLORS: Record<Column, string> = {
  pending: 'var(--status-pending)',
  in_progress: 'var(--status-progress)',
  done: 'var(--status-done)',
}

function KanbanCard({ task, onRefresh }: { task: Task; onRefresh: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const sevColor = SEV_COLORS[task.context?.severity] || 'var(--color-muted-foreground)'
  const isExpired = task.sla_expires_at && new Date(task.sla_expires_at).getTime() < Date.now()
  const isDone = ['COMPLETED', 'APPROVED', 'REJECTED'].includes(task.status)

  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : {}

  async function handleApprove() {
    setApproving(true)
    setFeedback(null)
    try {
      await approveStep(task.id, notes)
      setFeedback({ type: 'ok', msg: 'Approved' })
      onRefresh()
    } catch (e: any) {
      setFeedback({ type: 'err', msg: e.message || 'Failed' })
    } finally {
      setApproving(false)
    }
  }

  async function handleReject() {
    if (!notes.trim()) { setShowNotes(true); return }
    setRejecting(true)
    setFeedback(null)
    try {
      await rejectStep(task.id, notes)
      setFeedback({ type: 'ok', msg: 'Rejected' })
      onRefresh()
    } catch (e: any) {
      setFeedback({ type: 'err', msg: e.message || 'Failed' })
    } finally {
      setRejecting(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-xl p-3.5 cursor-pointer active:cursor-grabbing transition-all duration-150"
      {...listeners}
      {...attributes}
      onClick={e => e.stopPropagation()}
    >
      <div
        className="rounded-xl p-3.5 space-y-2.5 transition-all"
        style={{
          background: isDragging ? 'color-mix(in oklab, var(--card) 95%, var(--primary) 5%)' : 'var(--color-card)',
          border: isDragging ? '1px solid color-mix(in oklab, var(--primary) 40%, transparent)' : `1px solid color-mix(in oklab, ${sevColor} 25%, transparent)`,
          boxShadow: isDragging ? '0 8px 32px oklch(0 0 0 / 0.5)' : 'var(--shadow-card)',
        }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{
                background: `color-mix(in oklab, ${sevColor} 15%, transparent)`,
                color: sevColor,
                border: `1px solid color-mix(in oklab, ${sevColor} 30%, transparent)`,
              }}
            >
              {task.context?.severity || 'N/A'}
            </span>
            {task.assigned_role && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{ background: 'color-mix(in oklab, var(--muted) 60%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}
              >
                {task.assigned_role.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <GripVertical
            className="h-4 w-4 shrink-0 mt-0.5 transition-colors"
            style={{ color: 'color-mix(in oklab, var(--muted-foreground) 25%, transparent)' }}
          />
        </div>

        {/* Title */}
        <div className="text-xs font-semibold leading-snug">{task.incident_title}</div>

        {/* Message */}
        {task.message && (
          <div className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--color-muted-foreground)' }}>
            {task.message}
          </div>
        )}

        {/* SLA */}
        {task.sla_expires_at && (
          <div
            className="flex items-center gap-1 text-[10px]"
            style={{ color: isExpired ? 'var(--severity-critical)' : 'var(--severity-medium)' }}
          >
            <Clock className="h-2.5 w-2.5" />
            {isExpired ? 'SLA Expired' : relativeTime(task.sla_expires_at) + ' remaining'}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: 'var(--color-muted-foreground)' }}>
            {relativeTime(task.requested_at)}
          </span>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className="text-[11px] px-2 py-1 rounded"
            style={{
              background: feedback.type === 'ok' ? 'color-mix(in oklab, var(--status-done) 15%, transparent)' : 'color-mix(in oklab, var(--severity-critical) 15%, transparent)',
              color: feedback.type === 'ok' ? 'var(--status-done)' : 'var(--severity-critical)',
            }}
          >
            {feedback.msg}
          </div>
        )}

        {/* Actions for pending tasks */}
        {!isDone && !feedback && (
          <div className="pt-2 space-y-2" style={{ borderTop: '1px solid color-mix(in oklab, var(--border) 40%, transparent)' }} onClick={e => e.stopPropagation()}>
            {showNotes && (
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes / reason (required for reject)…"
                rows={2}
                className="w-full text-xs rounded-lg px-2 py-1.5 resize-none focus:outline-none"
                style={{ background: 'color-mix(in oklab, var(--input) 60%, transparent)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors"
                style={{ background: 'color-mix(in oklab, var(--status-done) 20%, transparent)', color: 'var(--status-done)', border: '1px solid color-mix(in oklab, var(--status-done) 35%, transparent)' }}
              >
                <CheckCircle2 className="h-3 w-3" />
                {approving ? '…' : 'Approve'}
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors"
                style={{ background: 'color-mix(in oklab, var(--severity-critical) 15%, transparent)', color: 'var(--severity-critical)', border: '1px solid color-mix(in oklab, var(--severity-critical) 30%, transparent)' }}
              >
                <AlertCircle className="h-3 w-3" />
                {rejecting ? '…' : 'Reject'}
              </button>
              <button
                onClick={() => setShowNotes(v => !v)}
                className="w-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}
                title="Toggle notes"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({ col, tasks, onRefresh }: { col: typeof COLUMNS[0]; tasks: Task[]; onRefresh: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  const color = COL_COLORS[col.id]

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl"
        style={{
          border: `1px solid color-mix(in oklab, ${color} 25%, transparent)`,
          borderBottom: 'none',
          background: `color-mix(in oklab, ${color} 8%, transparent)`,
        }}
      >
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{col.label}</span>
        <span
          className="text-[10px] font-bold ml-auto tabular-nums px-1.5 py-0.5 rounded"
          style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color, border: `1px solid color-mix(in oklab, ${color} 25%, transparent)` }}
        >
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 min-h-0 overflow-y-auto rounded-b-xl p-2 space-y-0 transition-all duration-150"
        style={{
          border: `1px solid color-mix(in oklab, ${color} 25%, transparent)`,
          background: isOver ? 'color-mix(in oklab, var(--primary) 5%, transparent)' : 'color-mix(in oklab, var(--muted) 10%, transparent)',
          outline: isOver ? '2px solid color-mix(in oklab, var(--primary) 20%, transparent)' : 'none',
          outlineOffset: '-2px',
        }}
      >
        {tasks.map(t => (
          <KanbanCard key={t.id} task={t} onRefresh={onRefresh} />
        ))}
        {tasks.length === 0 && (
          <div
            className="flex items-center justify-center h-24 text-[11px] rounded-lg m-1"
            style={{
              color: 'color-mix(in oklab, var(--muted-foreground) 40%, transparent)',
              border: '2px dashed color-mix(in oklab, var(--border) 30%, transparent)',
            }}
          >
            {col.id === 'done' ? 'No completed tasks' : 'Drop tasks here'}
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanTaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [localStatus, setLocalStatus] = useState<Record<string, Column>>({})

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/user/tasks?status=PENDING,WAITING_APPROVAL,COMPLETED')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  function handleDragEnd(e: DragEndEvent) {
    const taskId = e.active.id as string
    const target = e.over?.id as Column | undefined
    if (!target || !['pending', 'in_progress', 'done'].includes(target)) return
    setLocalStatus(prev => ({ ...prev, [taskId]: target }))
  }

  function getColumn(task: Task): Column {
    if (localStatus[task.id]) return localStatus[task.id]
    const col = COLUMNS.find(c => c.statusMatch.includes(task.status))
    return col ? col.id : 'pending'
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className="px-6 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-muted-foreground)' }}>
          Task Board
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
            {tasks.length} tasks
          </span>
          <button
            onClick={fetchTasks}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors"
            style={{ background: 'color-mix(in oklab, var(--muted) 40%, transparent)', color: 'var(--color-muted-foreground)', border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)' }}
          >
            <RotateCcw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-5">
        {loading ? (
          <div className="grid grid-cols-3 gap-4 h-full">
            {COLUMNS.map(col => (
              <div key={col.id} className="rounded-xl animate-pulse" style={{ background: 'var(--color-muted)' }} />
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-3 gap-4 h-full">
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  tasks={tasks.filter(t => getColumn(t) === col.id)}
                  onRefresh={fetchTasks}
                />
              ))}
            </div>
          </DndContext>
        )}
      </div>
    </div>
  )
}
