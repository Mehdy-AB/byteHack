import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { id } = await params
  const { profile, user } = authResult
  const supabase = await createClient()

  try {
    const { data: incident, error } = await supabase
      .from('incidents')
      .select('*, profiles(id, name, role)')
      .eq('id', id)
      .single()

    if (error || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }

    // SOC_ANALYST can only access their own assigned incidents
    if (profile.role === 'SOC_ANALYST' && incident.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Incident not assigned to you' }, { status: 403 })
    }

    const { data: steps } = await supabase
      .from('incident_steps')
      .select('*, profiles:assigned_user(id, name, email)')
      .eq('incident_id', id)
      .order('created_at', { ascending: true })

    const { data: auditLog, error: auditError } = await supabase
      .from('audit_log')
      .select('id, actor, action, status, row_hash, created_at')
      .eq('incident_id', id)
      .order('created_at', { ascending: true })

    if (auditError) {
      console.error('Audit Log Fetch Error:', auditError)
    }

    const assignedTo = incident.profiles || incident.assigned_to

    return NextResponse.json({
      incident: {
        ...incident,
        assigned_to: assignedTo,
        profiles: undefined,
      },
      steps: (steps || []).map((step: any) => ({
        id: step.id,
        step_id: step.step_id,
        step_type: step.step_type,
        step_order: step.step_order,
        status: step.status,
        assigned_role: step.assigned_role,
        assigned_user_name: step.profiles?.name || null,
        assigned_user_email: step.profiles?.email || null,
        message: step.result?.catalogue || step.result?.message || null,
        result: step.result,
        started_at: step.started_at,
        completed_at: step.completed_at,
        created_at: step.created_at,
      })),
      audit_log: auditLog || [],
    })
  } catch (error) {
    console.error('Incident Detail Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
