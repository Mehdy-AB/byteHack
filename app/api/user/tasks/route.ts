import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(req.url)
  const filterStatus = searchParams.get('status')
  const filterSeverity = searchParams.get('severity')
  const sortBy = searchParams.get('sortBy') || 'requested_at'
  const order = searchParams.get('order') || 'desc'

  const { user, profile } = authResult
  const supabase = await createClient()

  try {
    let query = supabase
      .from('incident_steps')
      .select('*, incidents(id, raw_input, severity, source)')
      .eq('step_type', 'APPROVAL')

    if (filterStatus) {
      query = query.eq('status', filterStatus)
    } else {
      query = query.in('status', ['PENDING', 'WAITING_APPROVAL'])
    }

    const { data: steps, error } = await query

    if (error) throw new Error(error.message)

    let tasks = (steps || [])
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

    if (filterSeverity) {
      tasks = tasks.filter(t => t.context.severity === filterSeverity)
    }

    tasks.sort((a, b) => {
      let valA = a[sortBy as keyof typeof a]
      let valB = b[sortBy as keyof typeof b]
      
      // Handle nested context or fallback
      if (sortBy === 'severity') {
        valA = a.context.severity
        valB = b.context.severity
      }

      if (valA < valB) return order === 'asc' ? -1 : 1
      if (valA > valB) return order === 'asc' ? 1 : -1
      return 0
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('User Tasks Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
