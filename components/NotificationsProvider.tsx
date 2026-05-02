'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
}

export default function NotificationsProvider({ children, role }: { children: React.ReactNode, role: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    // Only subscribe if we have a role
    if (!role) return

    const supabase = createClient()
    
    // Listen for new incident steps assigned to this role
    const channel = supabase
      .channel('tasks-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incident_steps', filter: `assigned_role=eq.${role}` },
        (payload) => {
          const newStep = payload.new
          // Check if status is PENDING or WAITING_APPROVAL
          if (newStep.status === 'PENDING' || newStep.status === 'WAITING_APPROVAL') {
            const notif = {
              id: newStep.id,
              title: 'New Task Assigned',
              message: `A new ${newStep.step_type} task has been assigned to your role.`,
              timestamp: new Date()
            }
            setNotifications(prev => [...prev, notif])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [role])

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Auto dismiss after 5 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(1))
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notifications])

  return (
    <>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {notifications.map((notif) => (
          <div key={notif.id} className="bg-[#1f2937] border border-[#374151] rounded-lg shadow-lg p-4 w-80 transform transition-all animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-bold text-white">{notif.title}</h4>
              <button onClick={() => dismiss(notif.id)} className="text-[#6b7280] hover:text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-[#9ca3af] mt-1">{notif.message}</p>
          </div>
        ))}
      </div>
    </>
  )
}
