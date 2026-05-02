export function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    CRITICAL: 'bg-red-900/40 text-red-400 border border-red-800',
    HIGH: 'bg-orange-900/40 text-orange-400 border border-orange-800',
    MEDIUM: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800',
    LOW: 'bg-green-900/40 text-green-400 border border-green-800',
  }
  const cls = styles[severity] ?? 'bg-gray-800 text-gray-400 border border-gray-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${cls}`}>
      {severity}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: 'bg-blue-900/40 text-blue-400 border border-blue-800',
    CONTAINED: 'bg-purple-900/40 text-purple-400 border border-purple-800',
    RESOLVED: 'bg-green-900/40 text-green-400 border border-green-800',
    CLOSED: 'bg-gray-800 text-gray-400 border border-gray-700',
    SUSPENDED: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800',
    WAITING_APPROVAL: 'bg-amber-900/40 text-amber-400 border border-amber-800',
    FAILED: 'bg-red-900/40 text-red-400 border border-red-800',
    SUCCESS: 'bg-emerald-900/40 text-emerald-400 border border-emerald-800',
    PENDING: 'bg-slate-800 text-slate-400 border border-slate-700',
    ARCHIVED: 'bg-gray-800 text-gray-500 border border-gray-700',
    RUNNING: 'bg-cyan-900/40 text-cyan-400 border border-cyan-800',
    SKIPPED: 'bg-gray-800 text-gray-400 border border-gray-700',
  }
  const cls = styles[status] ?? 'bg-gray-800 text-gray-400 border border-gray-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
