'use client'

import { useState } from 'react'
import { FileText, GitBranch, Clock, X } from 'lucide-react'
import { TopBar } from '@/components/dashboard/TopBar'
import { AlertSidebar } from '@/components/dashboard/AlertSidebar'
import { IncidentTable, type IncidentRow } from '@/components/dashboard/IncidentTable'
import { IncidentDetailPanel } from '@/components/dashboard/IncidentDetailPanel'
import { AuditTimeline } from '@/components/dashboard/AuditTimeline'
import { WorkflowViewer } from '@/components/dashboard/WorkflowViewer'

type Tab = 'overview' | 'workflow' | 'timeline'

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: 'overview', icon: <FileText className="h-3.5 w-3.5" />, label: 'Overview' },
  { id: 'workflow', icon: <GitBranch className="h-3.5 w-3.5" />, label: 'Workflow' },
  { id: 'timeline', icon: <Clock className="h-3.5 w-3.5" />, label: 'Timeline' },
]

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [selected, setSelected] = useState<IncidentRow | null>(null)

  function handleSelect(incident: IncidentRow) {
    setSelected(incident)
  }

  function handleClose() {
    setSelected(null)
  }

  return (
    <div
      className="-m-6 flex flex-col overflow-hidden"
      style={{ height: 'calc(100vh)', background: 'var(--color-background)' }}
    >
      <TopBar />

      <main className="flex-1 flex min-h-0 overflow-hidden">
        {selected ? (
          <>
            {/* Detail panel */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Tab bar */}
              <nav
                className="px-4 flex items-center shrink-0"
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  background: 'color-mix(in oklab, var(--card) 30%, transparent)',
                }}
              >
                <div className="flex items-center gap-0.5 flex-1">
                  {TABS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className="flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 -mb-px transition-all duration-150"
                      style={
                        tab === t.id
                          ? { borderBottomColor: 'var(--color-primary)', color: 'var(--color-foreground)' }
                          : { borderBottomColor: 'transparent', color: 'var(--color-muted-foreground)' }
                      }
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleClose}
                  title="Back to incident list"
                  className="ml-2 p-1.5 rounded-lg transition-colors hover:opacity-80"
                  style={{
                    color: 'var(--color-muted-foreground)',
                    border: '1px solid color-mix(in oklab, var(--border) 60%, transparent)',
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </nav>

              {/* Tab content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {tab === 'overview' && (
                  <div className="h-full overflow-y-auto p-6">
                    <IncidentDetailPanel incident={selected} />
                  </div>
                )}

                {tab === 'workflow' && (
                  <WorkflowViewer incidentId={selected.id} />
                )}

{tab === 'timeline' && (
                  <div className="h-full overflow-y-auto p-6">
                    <div className="max-w-3xl mx-auto">
                      <AuditTimeline incidentId={selected.id} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Alert feed — right side */}
            <div className="w-64 shrink-0 min-h-0 overflow-hidden" style={{ borderLeft: '1px solid var(--color-border)' }}>
              <AlertSidebar
                selectedId={selected.id}
                onSelect={handleSelect}
                hideBorder
              />
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden">
            <IncidentTable onSelect={handleSelect} />
          </div>
        )}
      </main>
    </div>
  )
}
