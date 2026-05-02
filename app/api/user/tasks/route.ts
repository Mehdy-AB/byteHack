import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { user, profile } = authResult
  const supabase = await createClient()

  try {
    const { data: steps, error } = await supabase
      .from('incident_steps')
      .select('*, incidents(id, raw_input, severity, source)')
      .in('status', ['PENDING', 'WAITING_APPROVAL'])
      .eq('step_type', 'APPROVAL')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    const tasks = (steps || [])
      .filter((step: any) => {
        const assignedRole = step.result?.assignedRole || step.assigned_role
        const assignedUser = step.result?.assignedUser
        if (assignedUser) return assignedUser === user.id
        if (assignedRole) return assignedRole === profile.role
        return true
      })
      .map((step: any) => {
        const payload = step.result || {}
        const incident = step.incidents || {}
        return {
          id: step.id,
          incident_id: step.incident_id,
          incident_title: incident.raw_input?.title || 'Unnamed Incident',
          type: step.step_type,
          status: step.status,
          assigned_role: step.assigned_role,
          message: payload.message || null,
          context: payload.context || {
            severity: incident.severity,
            source: incident.source,
            playbook_id: incident.raw_input?.playbook_id,
            ai_confidence: incident.raw_input?.ai_confidence,
          },
          requested_at: step.created_at,
          sla_expires_at: payload.sla_expires_at || null,
        }
      })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('User Tasks Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
