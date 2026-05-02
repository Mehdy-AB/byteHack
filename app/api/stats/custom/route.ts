import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const CustomStatsSchema = z.object({
  metric: z.enum(['count', 'resolution_time', 'avg_mttr', 'sla_rate', 'avg_confidence']),
  group_by: z.enum(['severity', 'source', 'playbook_id', 'day', 'week', 'month']),
  timeframe: z.enum(['last_24h', 'last_7_days', 'last_30_days', 'last_90_days']),
})

const TIMEFRAME_MS: Record<string, number> = {
  last_24h: 24 * 60 * 60 * 1000,
  last_7_days: 7 * 24 * 60 * 60 * 1000,
  last_30_days: 30 * 24 * 60 * 60 * 1000,
  last_90_days: 90 * 24 * 60 * 60 * 1000,
}

export async function POST(request: Request) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  try {
    const body = await request.json()
    const parsed = CustomStatsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.format() }, { status: 400 })
    }

    const { metric, group_by, timeframe } = parsed.data
    const supabase = await createClient()
    const fromDate = new Date(Date.now() - TIMEFRAME_MS[timeframe]).toISOString()

    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('severity, source, playbook_id, created_at, mttr_minutes, ai_confidence')
      .gte('created_at', fromDate)

    if (error) throw new Error(error.message)

    const groupMap: Record<string, { count: number; mttr_sum: number; confidence_sum: number }> = {}

    for (const inc of incidents || []) {
      let key: string
      if (group_by === 'day') {
        key = new Date(inc.created_at).toISOString().slice(0, 10)
      } else if (group_by === 'week') {
        const d = new Date(inc.created_at)
        d.setDate(d.getDate() - d.getDay())
        key = d.toISOString().slice(0, 10)
      } else if (group_by === 'month') {
        key = new Date(inc.created_at).toISOString().slice(0, 7)
      } else {
        key = (inc as any)[group_by] || 'unknown'
      }

      if (!groupMap[key]) groupMap[key] = { count: 0, mttr_sum: 0, confidence_sum: 0 }
      groupMap[key].count += 1
      if (inc.mttr_minutes) groupMap[key].mttr_sum += inc.mttr_minutes
      if ((inc as any).ai_confidence) groupMap[key].confidence_sum += (inc as any).ai_confidence
    }

    const results = Object.entries(groupMap).map(([group, stats]) => {
      const base: Record<string, unknown> = { group, incident_count: stats.count }
      if (metric === 'count') {
        base.value = stats.count
      } else if (metric === 'avg_mttr' || metric === 'resolution_time') {
        base.average_resolution_time_minutes =
          stats.count > 0 ? Math.round(stats.mttr_sum / stats.count) : 0
      } else if (metric === 'avg_confidence') {
        base.average_confidence =
          stats.count > 0 ? Math.round((stats.confidence_sum / stats.count) * 100) / 100 : 0
      }
      return base
    })

    results.sort((a, b) => String(a.group).localeCompare(String(b.group)))

    return NextResponse.json({ metric, group_by, timeframe, results })
  } catch (error) {
    console.error('Custom Stats Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
