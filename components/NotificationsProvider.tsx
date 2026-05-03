'use client'

import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { Bell } from 'lucide-react'

interface TaskSnapshot {
  id: string
  incident_title: string
  type: string
  severity: string
  message: string | null
}

export default function NotificationsProvider({ children }: { children: React.ReactNode; role?: string }) {
  useEffect(() => {
    let es: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let prevIds = new Set<string>()
    let isFirstEvent = true

    function connect() {
      es = new EventSource('/api/sse/tasks')

      // Reset "first event" flag on every (re)connect so we never fire
      // stale toasts from tasks that already existed before this session.
      es.addEventListener('open', () => {
        isFirstEvent = true
      })

      es.addEventListener('tasks', (e: MessageEvent) => {
        const { tasks }: { tasks: TaskSnapshot[] } = JSON.parse(e.data)
        const currentIds = new Set(tasks.map(t => t.id))

        if (!isFirstEvent) {
          // Toast for every task ID that wasn't in the previous snapshot
          for (const task of tasks) {
            if (!prevIds.has(task.id)) {
              showToast(task)
            }
          }
        }

        isFirstEvent = false
        prevIds = currentIds

        // Broadcast authoritative count to Sidebar
        window.dispatchEvent(
          new CustomEvent('sf:task-count', { detail: { count: tasks.length } })
        )
      })

      es.addEventListener('heartbeat', () => {})

      es.onerror = () => {
        // EventSource auto-reconnects; we just close our side cleanly and
        // let the auto-retry handle it (prevents duplicate connections).
        es?.close()
        retryTimer = setTimeout(connect, 4_000)
      }
    }

    function showToast(task: TaskSnapshot) {
      toast.custom(
        (t) => (
          <div
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${t.visible ? 'opacity-100' : 'opacity-0'}`}
            style={{
              background: 'oklch(0.18 0.025 260)',
              border: '1px solid oklch(0.32 0.06 260)',
              color: 'oklch(0.92 0.01 260)',
              minWidth: '280px',
              maxWidth: '360px',
            }}
          >
            <div
              className="h-7 w-7 rounded-lg grid place-items-center shrink-0 mt-0.5"
              style={{
                background: 'color-mix(in oklab, var(--color-primary) 15%, transparent)',
                color: 'var(--color-primary)',
              }}
            >
              <Bell size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold mb-0.5">Approval Required</p>
              <p className="text-[11px] truncate" style={{ color: 'oklch(0.65 0.02 260)' }}>
                {task.incident_title}
              </p>
              {task.message && (
                <p
                  className="text-[11px] mt-1 line-clamp-2 leading-relaxed"
                  style={{ color: 'oklch(0.55 0.02 260)' }}
                >
                  {task.message}
                </p>
              )}
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              style={{ color: 'oklch(0.55 0.01 260)', fontSize: '16px', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        ),
        { duration: 7_000 }
      )
    }

    connect()

    return () => {
      es?.close()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [])

  return <>{children}</>
}
