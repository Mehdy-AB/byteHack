'use client'

import { useState } from 'react'
import { FileText, GitBranch, LayoutGrid, Clock } from 'lucide-react'
import { TopBar } from '@/components/dashboard/TopBar'
import { AlertSidebar } from '@/components/dashboard/AlertSidebar'
import { IncidentDetailPanel } from '@/components/dashboard/IncidentDetailPanel'
import { KanbanTaskBoard } from '@/components/dashboard/KanbanTaskBoard'
import { AuditTimeline } from '@/components/dashboard/AuditTimeline'
import { WorkflowViewer } from '@/components/dashboard/WorkflowViewer'

type Tab = 'overview' | 'workflow' | 'tasks' | 'timeline'

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: 'overview', icon: <FileText className="h-3.5 w-3.5" />, label: 'Overview' },
  { id: 'workflow', icon: <GitBranch className="h-3.5 w-3.5" />, label: 'Workflow' },
  { id: 'tasks', icon: <LayoutGrid className="h-3.5 w-3.5" />, label: 'Tasks' },
  { id: 'timeline', icon: <Clock className="h-3.5 w-3.5" />, label: 'Timeline' },
]

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)

  return (
    <div
      className="-m-6 flex flex-col overflow-hidden"
      style={{ height: 'calc(100vh)', background: 'var(--color-background)' }}
    >
      <TopBar />

      <main className="flex-1 flex min-h-0 overflow-hidden">
        {/* Alert sidebar */}
        <div className="w-64 shrink-0 min-h-0 overflow-hidden">
          <AlertSidebar
            selectedId={selectedIncidentId}
            onSelect={setSelectedIncidentId}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Tab bar */}
          <nav
            className="px-4 flex items-center gap-0.5 shrink-0"
            style={{
              borderBottom: '1px solid var(--color-border)',
              background: 'color-mix(in oklab, var(--card) 30%, transparent)',
            }}
          >
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 -mb-px transition-all duration-150"
                style={tab === t.id
                  ? { borderBottomColor: 'var(--color-primary)', color: 'var(--color-foreground)' }
                  : { borderBottomColor: 'transparent', color: 'var(--color-muted-foreground)' }
                }
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {tab === 'overview' && (
              <div className="h-full overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                  <IncidentDetailPanel incidentId={selectedIncidentId} />
                </div>
              </div>
            )}

            {tab === 'workflow' && (
              <WorkflowViewer incidentId={selectedIncidentId} />
            )}

            {tab === 'tasks' && <KanbanTaskBoard />}

            {tab === 'timeline' && (
              <div className="h-full overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                  <AuditTimeline incidentId={selectedIncidentId} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
