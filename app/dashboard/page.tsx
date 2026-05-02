import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SeverityBadge, StatusBadge } from '@/components/badges'

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface KpiCardProps {
  label: string
  value: string | number
  accent?: string
  sublabel?: string
}

function KpiCard({ label, value, accent, sublabel }: KpiCardProps) {
  return (
    <div className={`bg-[#111827] border border-[#1f2937] rounded-xl p-5 relative overflow-hidden ${accent ? `border-l-4 ${accent}` : ''}`}>
      <p className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
      {sublabel && <p className="text-xs text-[#6b7280] mt-1">{sublabel}</p>}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const now = new Date()
  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const ago7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // KPI queries in parallel
  const [
    { count: totalIncidents24h },
    { count: criticalOpen },
    { count: pendingApprovals },
    { data: mttrData },
    { count: law1807Overdue },
    { count: slaBreaches7d },
    { data: recentIncidents },
  ] = await Promise.all([
    supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', ago24h),
    supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'CRITICAL').in('status', ['OPEN', 'CONTAINED']),
    supabase.from('incident_steps').select('*', { count: 'exact', head: true }).eq('status', 'WAITING_APPROVAL'),
    supabase.from('incidents').select('mttr_minutes').not('mttr_minutes', 'is', null).gte('resolved_at', ago7d),
    supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('compliance_notified', false).lt('notify_72h_at', now.toISOString()).not('notify_72h_at', 'is', null),
    supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('sla_breached', true).gte('created_at', ago7d),
    supabase.from('incidents').select('id, severity, source, status, assigned_to, raw_input, created_at, profiles(name)').order('created_at', { ascending: false }).limit(10),
  ])

  const avgMttr = mttrData && mttrData.length > 0
    ? Math.round(mttrData.reduce((sum: number, r: any) => sum + (r.mttr_minutes || 0), 0) / mttrData.length)
    : null

  const kpis = [
    { label: 'Total Incidents (24h)', value: totalIncidents24h ?? 0, accent: 'border-blue-600', sublabel: 'Last 24 hours' },
    { label: 'Critical Open', value: criticalOpen ?? 0, accent: 'border-red-600', sublabel: 'OPEN or CONTAINED' },
    { label: 'Pending Approvals', value: pendingApprovals ?? 0, accent: 'border-amber-500', sublabel: 'Awaiting decision' },
    { label: 'MTTR (7d avg)', value: avgMttr !== null ? `${avgMttr}m` : '—', accent: 'border-blue-500', sublabel: 'Mean time to resolve' },
    { label: 'Law 18-07 Overdue', value: law1807Overdue ?? 0, accent: 'border-red-500', sublabel: 'Notification overdue' },
    { label: 'SLA Breaches (7d)', value: slaBreaches7d ?? 0, accent: 'border-orange-500', sublabel: 'Last 7 days' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Command Center</h1>
        <p className="text-[#6b7280] text-sm mt-1">Real-time security operations overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {kpis.map(kpi => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Recent Incidents */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1f2937] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">Recent Incidents</h2>
          <Link href="/dashboard/incidents" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d1117] text-[#6b7280] text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Severity</th>
                <th className="px-4 py-3 text-left font-semibold">Title</th>
                <th className="px-4 py-3 text-left font-semibold">Source</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Assigned To</th>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {!recentIncidents || recentIncidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#6b7280]">No incidents found</td>
                </tr>
              ) : (
                recentIncidents.map((incident: any) => (
                  <tr
                    key={incident.id}
                    className="border-t border-[#1f2937] hover:bg-[#1a2234] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/incidents/${incident.id}`} className="block">
                        <SeverityBadge severity={incident.severity} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <Link href={`/dashboard/incidents/${incident.id}`} className="block text-white font-medium truncate hover:text-blue-400 transition-colors">
                        {incident.raw_input?.title || 'Untitled Incident'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#9ca3af]">
                      <Link href={`/dashboard/incidents/${incident.id}`} className="block">
                        {incident.source || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/incidents/${incident.id}`} className="block">
                        <StatusBadge status={incident.status} />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#9ca3af]">
                      <Link href={`/dashboard/incidents/${incident.id}`} className="block">
                        {(incident as any).profiles?.name || 'Unassigned'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs">
                      <Link href={`/dashboard/incidents/${incident.id}`} className="block">
                        {relativeTime(incident.created_at)}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
