import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const offset = parseInt(searchParams.get('offset') || '0')
  const filterAction = searchParams.get('action') // APPROVE | REJECT | REPORT | SKIP

  const supabase = await createClient()

  let query = supabase
    .from('step_actions')
    .select('id, action, reason, notes, created_at, step_id, incident_id, incident_steps(step_type, status, incident_id, incidents(id, raw_input, severity, source))')
    .eq('actor_id', authResult.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filterAction) query = query.eq('action', filterAction)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const history = (data || []).map((item: any) => {
    const step = item.incident_steps
    const incident = step?.incidents
    return {
      id: item.id,
      action: item.action,
      reason: item.reason,
      notes: item.notes,
      created_at: item.created_at,
      step_id: item.step_id,
      step_type: step?.step_type || null,
      incident_id: item.incident_id || step?.incident_id || null,
      incident_title: incident?.raw_input?.title || 'Untitled',
      incident_severity: incident?.severity || null,
      incident_source: incident?.source || null,
    }
  })

  return NextResponse.json({ history })
}
