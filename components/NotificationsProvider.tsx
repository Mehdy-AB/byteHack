'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Bell } from 'lucide-react'

export default function NotificationsProvider({ children, role }: { children: React.ReactNode; role: string }) {
  useEffect(() => {
    if (!role) return

    const supabase = createClient()

    const channel = supabase
      .channel('tasks-notifications')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incident_steps', filter: `assigned_role=eq.${role}` },
        (payload) => {
          const step = payload.new as any
          if (step.status === 'WAITING_APPROVAL') {
            toast.custom(
              (t) => (
                <div
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg transition-all ${t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                  style={{
                    background: 'oklch(0.18 0.025 260)',
                    border: '1px solid oklch(0.35 0.08 260)',
                    color: 'oklch(0.92 0.01 260)',
                    minWidth: '280px',
                    maxWidth: '360px',
                  }}
                >
                  <div className="h-7 w-7 rounded-lg grid place-items-center shrink-0" style={{ background: 'color-mix(in oklab, oklch(0.65 0.2 260) 15%, transparent)', color: 'oklch(0.65 0.2 260)' }}>
                    <Bell size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold mb-0.5">New Task Assigned</p>
                    <p className="text-[11px]" style={{ color: 'oklch(0.65 0.02 260)' }}>
                      {step.step_type.replace(/_/g, ' ')} — approval required from your role
                    </p>
                  </div>
                  <button onClick={() => toast.dismiss(t.id)} style={{ color: 'oklch(0.55 0.01 260)', fontSize: '16px', lineHeight: 1 }}>×</button>
                </div>
              ),
              { duration: 7000 }
            )
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incident_steps', filter: `assigned_role=eq.${role}` },
        (payload) => {
          const step = payload.new as any
          if (step.status === 'WAITING_APPROVAL') {
            toast.custom(
              (t) => (
                <div
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg transition-all ${t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                  style={{
                    background: 'oklch(0.18 0.025 260)',
                    border: '1px solid oklch(0.35 0.08 260)',
                    color: 'oklch(0.92 0.01 260)',
                    minWidth: '280px',
                    maxWidth: '360px',
                  }}
                >
                  <div className="h-7 w-7 rounded-lg grid place-items-center shrink-0" style={{ background: 'color-mix(in oklab, oklch(0.65 0.2 260) 15%, transparent)', color: 'oklch(0.65 0.2 260)' }}>
                    <Bell size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold mb-0.5">New Task Assigned</p>
                    <p className="text-[11px]" style={{ color: 'oklch(0.65 0.02 260)' }}>
                      {step.step_type.replace(/_/g, ' ')} — approval required from your role
                    </p>
                  </div>
                  <button onClick={() => toast.dismiss(t.id)} style={{ color: 'oklch(0.55 0.01 260)', fontSize: '16px', lineHeight: 1 }}>×</button>
                </div>
              ),
              { duration: 7000 }
            )
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [role])

  return <>{children}</>
}
