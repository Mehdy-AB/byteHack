import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: incident, error } = await supabase
    .from('incidents')
    .select('id, status, severity, source, created_at, resolved_at, mttr_minutes, raw_input')
    .eq('id', id)
    .single()

  if (error || !incident) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
  }

  const { data: steps } = await supabase
    .from('incident_steps')
    .select('step_order, step_type, status, assigned_role, started_at, completed_at, error_detail')
    .eq('incident_id', id)
    .order('step_order', { ascending: true })

  const total = steps?.length ?? 0
  const done = steps?.filter(s => ['SUCCESS', 'SKIPPED'].includes(s.status)).length ?? 0
  const failed = steps?.filter(s => s.status === 'FAILED').length ?? 0
  const waiting = steps?.filter(s => s.status === 'WAITING_APPROVAL').length ?? 0
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  return NextResponse.json({
    incidentId: incident.id,
    title: incident.raw_input?.title ?? null,
    status: incident.status,
    severity: incident.severity,
    source: incident.source,
    createdAt: incident.created_at,
    resolvedAt: incident.resolved_at ?? null,
    mttrMinutes: incident.mttr_minutes ?? null,
    progress: {
      total,
      completed: done,
      failed,
      waitingApproval: waiting,
      percentComplete: progress,
    },
    steps: (steps || []).map(s => ({
      order: s.step_order,
      type: s.step_type,
      status: s.status,
      assignedRole: s.assigned_role,
      startedAt: s.started_at,
      completedAt: s.completed_at,
      error: s.error_detail ?? null,
    })),
  })
}
