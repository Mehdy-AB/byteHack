'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

const STATUS_OPTIONS = ['', 'OPEN', 'CONTAINED', 'RESOLVED', 'CLOSED', 'SUSPENDED']
const SEVERITY_OPTIONS = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

function SkeletonRow() {
  return (
    <tr className="border-t border-[#1f2937]">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-[#1f2937] rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  )
}

export default function IncidentsPage() {
  const router = useRouter()
  const [incidents, setIncidents] = useState<any[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20 })
  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [source, setSource] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchIncidents = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (severity) params.set('severity', severity)
    if (source) params.set('source', source)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    params.set('sortBy', sortBy)
    params.set('order', order)
    params.set('page', String(page))
    params.set('limit', '20')

    try {
      const res = await fetch(`/api/admin/incidents?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setIncidents(data.incidents || [])
      setPagination(data.pagination || { total: 0, page: 1, limit: 20 })
    } catch {
      setIncidents([])
    } finally {
      setLoading(false)
    }
  }, [status, severity, source, dateFrom, dateTo, sortBy, order, page])

  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  function resetFilters() {
    setStatus('')
    setSeverity('')
    setSource('')
    setDateFrom('')
    setDateTo('')
    setSortBy('created_at')
    setOrder('desc')
    setPage(1)
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Incidents</h1>
          <p className="text-[#6b7280] text-sm mt-1">
            {pagination.total} total incident{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#6b7280] uppercase tracking-wider font-semibold">Status</label>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s || 'All Statuses'}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#6b7280] uppercase tracking-wider font-semibold">Severity</label>
            <select
              value={severity}
              onChange={e => { setSeverity(e.target.value); setPage(1) }}
              className="bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {SEVERITY_OPTIONS.map(s => (
                <option key={s} value={s}>{s || 'All Severities'}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#6b7280] uppercase tracking-wider font-semibold">Source</label>
            <input
              type="text"
              placeholder="e.g. SentinelOne"
              value={source}
              onChange={e => { setSource(e.target.value); setPage(1) }}
              className="bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-36"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#6b7280] uppercase tracking-wider font-semibold">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#6b7280] uppercase tracking-wider font-semibold">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-end border-t border-[#1f2937] pt-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#6b7280] uppercase tracking-wider font-semibold">Sort By</label>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPage(1) }}
              className="bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="created_at">Created At</option>
              <option value="severity_score">Severity Score</option>
              <option value="updated_at">Last Updated</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#6b7280] uppercase tracking-wider font-semibold">Order</label>
            <select
              value={order}
              onChange={e => { setOrder(e.target.value); setPage(1) }}
              className="bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          
          {(status || severity || source || dateFrom || dateTo || sortBy !== 'created_at' || order !== 'desc') && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm font-medium text-[#6b7280] hover:text-white border border-[#1f2937] bg-[#0d1117] rounded-lg hover:bg-[#1f2937] transition-colors ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0d1117] text-[#6b7280] text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold w-12">#</th>
                <th className="px-4 py-3 text-left font-semibold">Severity</th>
                <th className="px-4 py-3 text-left font-semibold">Title</th>
                <th className="px-4 py-3 text-left font-semibold">Source</th>
                <th className="px-4 py-3 text-left font-semibold">Assigned To</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">SLA</th>
                <th className="px-4 py-3 text-left font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-[#374151]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <p className="text-[#6b7280] font-medium">No incidents found</p>
                      <p className="text-[#4b5563] text-xs">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                incidents.map((incident: any, idx: number) => (
                  <tr
                    key={incident.id}
                    onClick={() => router.push(`/dashboard/incidents/${incident.id}`)}
                    className="border-t border-[#1f2937] hover:bg-[#1a2234] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-[#4b5563] text-xs font-mono">
                      {(page - 1) * pagination.limit + idx + 1}
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={incident.severity} /></td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-white font-medium truncate block">{incident.raw_input?.title || 'Untitled'}</span>
                    </td>
                    <td className="px-4 py-3 text-[#9ca3af]">{incident.source || '—'}</td>
                    <td className="px-4 py-3 text-[#9ca3af]">{incident.assigned_to ? incident.assigned_to.name || 'Assigned' : 'Unassigned'}</td>
                    <td className="px-4 py-3"><StatusBadge status={incident.status} /></td>
                    <td className="px-4 py-3">
                      {incident.sla_breached
                        ? <span className="text-red-400 text-xs font-semibold">Breached</span>
                        : <span className="text-[#4b5563] text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs">{relativeTime(incident.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && incidents.length > 0 && (
          <div className="px-4 py-3 border-t border-[#1f2937] flex items-center justify-between">
            <p className="text-xs text-[#6b7280]">
              Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs bg-[#0d1117] border border-[#1f2937] rounded-lg text-[#9ca3af] hover:text-white hover:border-[#374151] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <span className="px-3 py-1.5 text-xs text-[#6b7280]">
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs bg-[#0d1117] border border-[#1f2937] rounded-lg text-[#9ca3af] hover:text-white hover:border-[#374151] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
