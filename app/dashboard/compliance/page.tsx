'use client'

import { useState } from 'react'

type ToggleMode = 'org' | 'incident'

function VerifiedIcon() {
  return (
    <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

function CompromisedIcon() {
  return (
    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.25-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
    </svg>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function CompliancePage() {
  // Chain Verifier state
  const [chainId, setChainId] = useState('')
  const [chainLoading, setChainLoading] = useState(false)
  const [chainResult, setChainResult] = useState<any>(null)
  const [chainError, setChainError] = useState<string | null>(null)

  // Report state
  const [reportMode, setReportMode] = useState<ToggleMode>('org')
  const [reportId, setReportId] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportResult, setReportResult] = useState<any>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  async function verifyChain() {
    if (!chainId.trim()) return
    setChainLoading(true)
    setChainResult(null)
    setChainError(null)
    try {
      const res = await fetch(`/api/compliance/chain?incident=${encodeURIComponent(chainId.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      setChainResult(data)
    } catch (e: any) {
      setChainError(e.message)
    } finally {
      setChainLoading(false)
    }
  }

  async function generateReport() {
    setReportLoading(true)
    setReportResult(null)
    setReportError(null)
    const url = reportMode === 'org'
      ? '/api/compliance/report'
      : `/api/compliance/report?incident=${encodeURIComponent(reportId.trim())}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Report failed')
      setReportResult(data)
    } catch (e: any) {
      setReportError(e.message)
    } finally {
      setReportLoading(false)
    }
  }

  const isVerified = chainResult?.verification_status === 'VERIFIED'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Compliance & Audit</h1>
        <p className="text-[#6b7280] text-sm mt-1">Hash chain verification and Law 18-07 compliance reports</p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Hash Chain Verifier */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Hash Chain Verifier</h2>
          <p className="text-xs text-[#4b5563] mb-5">Verify the cryptographic integrity of an incident&apos;s audit log.</p>

          <div className="flex gap-3 mb-5">
            <input
              type="text"
              value={chainId}
              onChange={e => setChainId(e.target.value)}
              placeholder="Enter Incident UUID…"
              className="flex-1 bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono"
              onKeyDown={e => e.key === 'Enter' && verifyChain()}
            />
            <button
              onClick={verifyChain}
              disabled={chainLoading || !chainId.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {chainLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying…
                </>
              ) : (
                'Verify Integrity'
              )}
            </button>
          </div>

          {chainError && (
            <div className="px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
              {chainError}
            </div>
          )}

          {chainResult && (
            <div className={`rounded-xl p-5 border ${isVerified ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
              <div className="flex items-center gap-3 mb-4">
                {isVerified ? <VerifiedIcon /> : <CompromisedIcon />}
                <div>
                  <p className={`text-lg font-bold ${isVerified ? 'text-green-400' : 'text-red-400'}`}>
                    {isVerified ? 'VERIFIED' : 'COMPROMISED'}
                  </p>
                  <p className="text-xs text-[#6b7280]">
                    Incident: <span className="font-mono">{chainResult.incident_id}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-0.5">Hash Matches</p>
                  <p className="text-base font-bold text-white">{chainResult.hash_matches}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-0.5">Tampered Records</p>
                  <p className={`text-base font-bold ${chainResult.tampered_records > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {chainResult.tampered_records}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-0.5">Last Verified</p>
                  <p className="text-sm text-white">{formatDate(chainResult.last_verified_at)}</p>
                </div>
              </div>
              {chainResult.tampered_log_ids && chainResult.tampered_log_ids.length > 0 && (
                <div className="mt-4 px-3 py-2 bg-red-900/30 rounded-lg">
                  <p className="text-xs text-red-400 font-semibold mb-1">Tampered Log IDs:</p>
                  <p className="text-xs text-red-300 font-mono">{chainResult.tampered_log_ids.join(', ')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Compliance Report */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Compliance Report</h2>
          <p className="text-xs text-[#4b5563] mb-5">Generate Law 18-07 compliance reports for the organization or a specific incident.</p>

          {/* Toggle */}
          <div className="inline-flex bg-[#0d1117] border border-[#1f2937] rounded-lg p-1 mb-5">
            {(['org', 'incident'] as ToggleMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => { setReportMode(mode); setReportResult(null); setReportError(null) }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${reportMode === mode ? 'bg-blue-600 text-white' : 'text-[#6b7280] hover:text-white'}`}
              >
                {mode === 'org' ? 'Org Summary' : 'Per Incident'}
              </button>
            ))}
          </div>

          {/* Per incident input */}
          {reportMode === 'incident' && (
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={reportId}
                onChange={e => setReportId(e.target.value)}
                placeholder="Enter Incident UUID…"
                className="flex-1 bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono"
                onKeyDown={e => e.key === 'Enter' && generateReport()}
              />
            </div>
          )}

          <button
            onClick={generateReport}
            disabled={reportLoading || (reportMode === 'incident' && !reportId.trim())}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {reportLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : (
              'Generate Report'
            )}
          </button>

          {reportError && (
            <div className="mt-4 px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
              {reportError}
            </div>
          )}

          {/* Org Summary Result */}
          {reportResult && reportResult.report_type === 'SUMMARY' && (
            <div className="mt-5 bg-[#0d1117] border border-[#1f2937] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-white">Organization Summary</p>
                <p className="text-xs text-[#6b7280]">Generated: {formatDate(reportResult.report_generated_at)}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Total Audited Incidents', value: reportResult.total_audited_incidents },
                  { label: 'Law 18-07 Sent', value: reportResult.law_1807_notifications_sent },
                  { label: 'Law 18-07 Overdue', value: reportResult.law_1807_overdue, danger: reportResult.law_1807_overdue > 0 },
                  { label: 'Audit Log Entries', value: reportResult.audit_log_total_entries },
                  { label: 'Integrity Violations', value: reportResult.integrity_violations_detected, danger: reportResult.integrity_violations_detected > 0 },
                  { label: 'Unauthorized Attempts', value: reportResult.unauthorized_access_attempts, danger: reportResult.unauthorized_access_attempts > 0 },
                ].map(({ label, value, danger }) => (
                  <div key={label} className="bg-[#111827] rounded-lg p-3 border border-[#1f2937]">
                    <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${danger ? 'text-red-400' : 'text-white'}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-incident Result */}
          {reportResult && reportResult.report_type === 'INCIDENT' && (
            <div className="mt-5 bg-[#0d1117] border border-[#1f2937] rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Incident Report</p>
                <p className="text-xs text-[#6b7280]">Generated: {formatDate(reportResult.generated_at)}</p>
              </div>

              {/* Incident Info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Title', value: reportResult.incident?.title },
                  { label: 'Severity', value: reportResult.incident?.severity },
                  { label: 'Source', value: reportResult.incident?.source },
                  { label: 'Playbook', value: reportResult.incident?.playbook_id || '—' },
                  { label: 'Created', value: formatDate(reportResult.incident?.created_at) },
                  { label: 'Resolved', value: formatDate(reportResult.incident?.resolved_at) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-[#6b7280] uppercase tracking-wider">{label}</p>
                    <p className="text-sm text-white">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Law 18-07 */}
              {reportResult.law_1807 && (
                <div>
                  <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-2">Law 18-07 Status</p>
                  <div className={`rounded-lg p-4 border ${
                    reportResult.law_1807.status === 'DONE' ? 'bg-green-900/20 border-green-800' :
                    reportResult.law_1807.status === 'OVERDUE' ? 'bg-red-900/20 border-red-800' :
                    'bg-amber-900/20 border-amber-800'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-lg font-bold ${
                        reportResult.law_1807.status === 'DONE' ? 'text-green-400' :
                        reportResult.law_1807.status === 'OVERDUE' ? 'text-red-400' :
                        'text-amber-400'
                      }`}>
                        {reportResult.law_1807.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-[#6b7280]">Notification Required</p>
                        <p className="text-white">{reportResult.law_1807.notification_required ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6b7280]">Notified</p>
                        <p className="text-white">{reportResult.law_1807.notified ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6b7280]">Deadline</p>
                        <p className="text-white">{formatDate(reportResult.law_1807.deadline)}</p>
                      </div>
                      {reportResult.law_1807.hours_remaining != null && (
                        <div>
                          <p className="text-xs text-[#6b7280]">Hours Remaining</p>
                          <p className="text-white">{reportResult.law_1807.hours_remaining}h</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              {reportResult.timeline && reportResult.timeline.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Timeline</p>
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-[#1f2937]" />
                    <div className="space-y-3">
                      {reportResult.timeline.map((entry: any, i: number) => (
                        <div key={i} className="relative pl-8">
                          <div className="absolute left-1.5 top-2 w-3 h-3 rounded-full border-2 border-blue-500 bg-[#0d1117]" />
                          <div className="bg-[#111827] border border-[#1f2937] rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-semibold text-white">{entry.action}</span>
                              <span className="text-xs text-[#4b5563]">{formatDate(entry.timestamp)}</span>
                            </div>
                            {entry.actor && (
                              <p className="text-xs text-[#6b7280] mt-0.5 truncate">by {entry.actor}</p>
                            )}
                            {entry.details && entry.details !== '{}' && (
                              <p className="text-xs text-[#4b5563] mt-1 font-mono truncate">{entry.details}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
