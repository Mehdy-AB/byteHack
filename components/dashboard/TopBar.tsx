'use client'

import { useEffect, useState } from 'react'
import { Shield, Activity, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'

interface Stats {
  total_incidents: number
  open_incidents: number
  critical_open: number
  pending_approvals: number
  law_1807_overdue: number
  sla_breach_rate_7d: number
}

interface KpiBar {
  label: string
  value: number
  max: number
  color: string
  icon: React.ReactNode
}

export function TopBar() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats/summary')
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (mounted) {
          setStats(data.stats || data)
        }
      } catch (err) {
        console.error('Stats fetch failed:', err)
      }
    }

    fetchStats()
    const id = setInterval(fetchStats, 30_000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  const bars: KpiBar[] = stats
    ? [
      {
        label: 'Critical Open',
        value: stats.critical_open,
        max: Math.max(stats.open_incidents, 1),
        color: 'var(--severity-critical)',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
      },
      {
        label: 'Open Incidents',
        value: stats.open_incidents,
        max: Math.max(stats.total_incidents, 1),
        color: 'var(--severity-high)',
        icon: <Activity className="h-3.5 w-3.5" />,
      },
      {
        label: 'Pending Approvals',
        value: stats.pending_approvals,
        max: Math.max(stats.open_incidents, 1),
        color: 'var(--severity-medium)',
        icon: <Clock className="h-3.5 w-3.5" />,
      },
      {
        label: 'Law 18-07 Overdue',
        value: stats.law_1807_overdue,
        max: Math.max(stats.open_incidents, 1),
        color: 'var(--severity-info)',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      },
    ]
    : []

  return (
    <header
      className="border-b border-border bg-card/90 backdrop-blur-sm sticky top-0 z-30 shrink-0"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="px-5 py-2.5 flex items-center gap-4">


        <div className="h-7 w-px shrink-0" style={{ background: 'color-mix(in oklab, var(--border) 60%, transparent)' }} />

        {/* KPI Bars */}
        <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
          {bars.map((bar) => {
            const pct = bar.max === 0 ? 0 : Math.round((bar.value / bar.max) * 100)
            return (
              <div
                key={bar.label}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 min-w-[160px]"
                style={{
                  border: `1px solid color-mix(in oklab, ${bar.color} 25%, transparent)`,
                  background: `color-mix(in oklab, ${bar.color} 8%, transparent)`,
                }}
              >
                <div
                  className="h-6 w-6 rounded-md grid place-items-center shrink-0"
                  style={{ color: bar.color }}
                >
                  {bar.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{bar.label}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-px rounded text-white leading-none"
                      style={{ background: bar.color }}
                    >
                      {bar.value}
                    </span>
                  </div>
                  <div className="h-1 mt-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0 0 0 / 0.25)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${pct}%`, background: bar.color }}
                    />
                  </div>
                </div>
              </div>
            )
          })}

          {!stats && (
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 w-40 rounded-lg animate-pulse" style={{ background: 'var(--color-muted)' }} />
              ))}
            </div>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)', background: 'color-mix(in oklab, var(--muted) 20%, transparent)' }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-50 pulse-dot"
                style={{ background: 'var(--status-done)' }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--status-done)' }} />
            </span>
            <span style={{ color: 'var(--color-muted-foreground)' }}>SIEM</span>
            <span className="font-medium">Connected</span>
          </div>
          {stats && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{ border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)', background: 'color-mix(in oklab, var(--muted) 20%, transparent)' }}
            >
              <Activity className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
              <span className="font-semibold">{stats.total_incidents}</span>
              <span style={{ color: 'var(--color-muted-foreground)' }}>incidents</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
