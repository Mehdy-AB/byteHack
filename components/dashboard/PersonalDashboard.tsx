'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, XCircle, MessageSquare, Clock, ArrowRight,
  CheckSquare, Activity, Sparkles, Flag,
} from 'lucide-react'
import { SeverityBadge, StatusBadge } from '@/components/badges'

interface Task {
  id: string
  incident_id: string
  incident_title: string
  type: string
  status: string
  assigned_role: string | null
  message: string | null
  context: { severity: string; source: string }
  requested_at: string
  sla_expires_at: string | null
}

interface HistoryItem {
  id: string
  action: string
  reason: string | null
  notes: string | null
  created_at: string
  incident_id: string | null
  incident_title: string
  incident_severity: string | null
}

function relativeTime(s: string) {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function slaCountdown(expiresAt: string) {
  const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
  if (diff <= 0) return { text: 'SLA Expired', expired: true }
  if (diff < 3600) return { text: `${Math.floor(diff / 60)}m ${diff % 60}s`, expired: false }
  if (diff < 86400) return { text: `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`, expired: false }
  return { text: `${Math.floor(diff / 86400)}d remaining`, expired: false }
}

const ACTION_ICON: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  APPROVE: CheckCircle2,
  REJECT: XCircle,
  REPORT: MessageSquare,
  REQUEST_REDESIGN: Flag,
}
const ACTION_COLOR: Record<string, string> = {
  APPROVE: 'var(--status-done)',
  REJECT: 'var(--severity-critical)',
  REPORT: 'var(--severity-medium)',
  REQUEST_REDESIGN: 'var(--severity-high)',
}

export default function PersonalDashboard({ name }: { name: string | null }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    fetch('/api/user/tasks')
      .then(r => r.json())
      .then(d => setTasks(d.tasks || []))
      .catch(() => {})
      .finally(() => setLoadingTasks(false))

    fetch('/api/user/history?limit=8')
      .then(r => r.json())
      .then(d => setHistory(d.history || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [])

  const greeting = name ? `Welcome back, ${name.split(' ')[0]}` : 'Welcome back'

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
          Here's what needs your attention today.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'color-mix(in oklab, var(--severity-high) 12%, transparent)', border: '1px solid color-mix(in oklab, var(--severity-high) 25%, transparent)' }}>
            <CheckSquare className="h-5 w-5" style={{ color: 'var(--severity-high)' }} />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{loadingTasks ? '—' : tasks.length}</p>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Pending tasks</p>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'color-mix(in oklab, var(--color-primary) 12%, transparent)', border: '1px solid color-mix(in oklab, var(--color-primary) 25%, transparent)' }}>
            <Activity className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{loadingHistory ? '—' : history.length}</p>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Recent actions</p>
          </div>
        </div>
      </div>

      {/* Pending tasks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Pending Tasks</h2>
          <Link href="/dashboard/tasks" className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--color-primary)' }}>
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loadingTasks ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--color-card)' }} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl flex flex-col items-center justify-center py-12 gap-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <CheckCircle2 className="h-8 w-8" style={{ color: 'color-mix(in oklab, var(--status-done) 50%, transparent)' }} />
            <p className="text-sm font-medium">All caught up</p>
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>No pending approval requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 4).map(task => {
              const sla = task.sla_expires_at ? slaCountdown(task.sla_expires_at) : null
              return (
                <div key={task.id} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{task.incident_title}</p>
                      <p className="text-[11px] mt-0.5 font-mono" style={{ color: 'var(--color-muted-foreground)' }}>
                        {task.type.replace(/_/g, ' ')} · {relativeTime(task.requested_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <SeverityBadge severity={task.context?.severity || 'MEDIUM'} />
                      <StatusBadge status={task.status} />
                    </div>
                  </div>

                  {task.message && (
                    <p className="text-xs mt-3 line-clamp-2 px-3 py-2 rounded-lg" style={{ background: 'color-mix(in oklab, var(--color-primary) 8%, transparent)', border: '1px solid color-mix(in oklab, var(--color-primary) 15%, transparent)', color: 'color-mix(in oklab, var(--foreground) 80%, transparent)' }}>
                      {task.message}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    {sla ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: sla.expired ? 'var(--severity-critical)' : 'var(--severity-medium)' }}>
                        <Clock className="h-3 w-3" />
                        {sla.text}
                      </div>
                    ) : <span />}
                    <Link
                      href="/dashboard/tasks"
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'color-mix(in oklab, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)', border: '1px solid color-mix(in oklab, var(--color-primary) 25%, transparent)' }}
                    >
                      <Sparkles className="h-3 w-3" /> Review
                    </Link>
                  </div>
                </div>
              )
            })}
            {tasks.length > 4 && (
              <Link href="/dashboard/tasks" className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-70" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                +{tasks.length - 4} more tasks <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Recent Activity</h2>
          <Link href="/dashboard/history" className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--color-primary)' }}>
            Full history <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loadingHistory ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--color-card)' }} />)}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl flex flex-col items-center justify-center py-10 gap-2" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <Activity className="h-6 w-6" style={{ color: 'color-mix(in oklab, var(--color-muted-foreground) 40%, transparent)' }} />
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>No activity yet.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            {history.map((item, i) => {
              const Icon = ACTION_ICON[item.action] ?? Activity
              const color = ACTION_COLOR[item.action] ?? 'var(--color-muted-foreground)'
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-4 py-3"
                  style={i > 0 ? { borderTop: '1px solid color-mix(in oklab, var(--border) 50%, transparent)' } : {}}
                >
                  <div className="h-7 w-7 rounded-lg grid place-items-center shrink-0" style={{ background: `color-mix(in oklab, ${color} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${color} 25%, transparent)` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.incident_title}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                      {item.action} · {relativeTime(item.created_at)}
                    </p>
                  </div>
                  {item.incident_severity && (
                    <SeverityBadge severity={item.incident_severity} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}
