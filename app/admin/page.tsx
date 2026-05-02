import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const ago24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: activeWorkflows },
    { count: pendingSteps },
    { count: failedSteps },
    { data: recentFailed },
  ] = await Promise.all([
    supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['OPEN', 'CONTAINED']),
    supabase.from('incident_steps').select('*', { count: 'exact', head: true }).in('status', ['PENDING', 'WAITING_APPROVAL']),
    supabase.from('incident_steps').select('*', { count: 'exact', head: true }).eq('status', 'FAILED').gte('created_at', ago24h),
    supabase.from('incident_steps').select('id, incident_id, step_type, error_detail, created_at').eq('status', 'FAILED').gte('created_at', ago24h).order('created_at', { ascending: false }).limit(20),
  ])

  const failed = failedSteps ?? 0
  const isDegraded = failed > 5

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">System Monitor</h1>
        <p className="text-[#6b7280] text-sm mt-1">Platform health and operational status</p>
      </div>

      {/* Health Banner */}
      <div className={`rounded-xl p-6 mb-6 border flex items-center gap-4 ${isDegraded ? 'bg-red-900/20 border-red-800' : 'bg-green-900/20 border-green-800'}`}>
        <div className={`w-4 h-4 rounded-full flex-shrink-0 ${isDegraded ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
        <div>
          <p className={`text-2xl font-bold ${isDegraded ? 'text-red-400' : 'text-green-400'}`}>
            {isDegraded ? 'DEGRADED' : 'OPERATIONAL'}
          </p>
          <p className={`text-sm ${isDegraded ? 'text-red-300' : 'text-green-300'}`}>
            {isDegraded
              ? `${failed} step failures in the last 24 hours — attention required`
              : 'All systems functioning normally'}
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#111827] border border-l-4 border-blue-600 border-[#1f2937] rounded-xl p-5">
          <p className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">Active Workflows</p>
          <p className="text-3xl font-bold text-white mt-2">{activeWorkflows ?? 0}</p>
          <p className="text-xs text-[#4b5563] mt-1">OPEN or CONTAINED incidents</p>
        </div>
        <div className="bg-[#111827] border border-l-4 border-amber-500 border-[#1f2937] rounded-xl p-5">
          <p className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">Pending Steps</p>
          <p className="text-3xl font-bold text-white mt-2">{pendingSteps ?? 0}</p>
          <p className="text-xs text-[#4b5563] mt-1">PENDING or WAITING_APPROVAL</p>
        </div>
        <div className={`bg-[#111827] border border-l-4 ${isDegraded ? 'border-red-500' : 'border-green-600'} border-[#1f2937] rounded-xl p-5`}>
          <p className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">Failed Steps (24h)</p>
          <p className={`text-3xl font-bold mt-2 ${isDegraded ? 'text-red-400' : 'text-white'}`}>{failed}</p>
          <p className="text-xs text-[#4b5563] mt-1">Last 24 hours</p>
        </div>
      </div>

      {/* Recent Failed Steps */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1f2937]">
          <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">Recent Failed Steps (24h)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d1117] text-[#6b7280] text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Incident ID</th>
                <th className="px-4 py-3 text-left font-semibold">Step Type</th>
                <th className="px-4 py-3 text-left font-semibold">Error Detail</th>
                <th className="px-4 py-3 text-left font-semibold">Failed</th>
              </tr>
            </thead>
            <tbody>
              {!recentFailed || recentFailed.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-[#4b5563]">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-[#1f2937]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-[#6b7280]">No failed steps in the last 24 hours</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentFailed.map((step: any) => (
                  <tr key={step.id} className="border-t border-[#1f2937] hover:bg-[#1a2234] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#9ca3af] max-w-[160px] truncate">
                      {step.incident_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono bg-[#1f2937] text-[#9ca3af] px-2 py-0.5 rounded">
                        {step.step_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs max-w-[280px]">
                      <span className="truncate block">{step.error_detail || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs whitespace-nowrap">
                      {relativeTime(step.created_at)}
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
