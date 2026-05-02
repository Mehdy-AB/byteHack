import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
  const offset = parseInt(searchParams.get('offset') || '0')
  const filterActor = searchParams.get('actor')
  const filterAction = searchParams.get('action')
  const filterIncident = searchParams.get('incident_id')
  const since = searchParams.get('since') // ISO date string

  const supabase = await createClient()

  let query = supabase
    .from('audit_log')
    .select('id, incident_id, step_id, actor, action, status, payload, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filterActor) query = query.ilike('actor', `%${filterActor}%`)
  if (filterAction) query = query.ilike('action', `%${filterAction}%`)
  if (filterIncident) query = query.eq('incident_id', filterIncident)
  if (since) query = query.gte('created_at', since)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Summary stats for charts
  const ago7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentAll } = await supabase
    .from('audit_log')
    .select('action, status, created_at')
    .gte('created_at', ago7d)
    .order('created_at', { ascending: true })

  // Group by day for sparkline
  const byDay: Record<string, number> = {}
  for (const row of recentAll || []) {
    const day = row.created_at.slice(0, 10)
    byDay[day] = (byDay[day] || 0) + 1
  }

  // Action type breakdown
  const actionCounts: Record<string, number> = {}
  for (const row of recentAll || []) {
    actionCounts[row.action] = (actionCounts[row.action] || 0) + 1
  }

  return NextResponse.json({
    entries: data || [],
    total: count ?? 0,
    stats: {
      by_day: byDay,
      action_counts: actionCounts,
    },
  })
}
