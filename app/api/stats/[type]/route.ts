import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { type } = await params
  const supabase = await createClient()

  try {
    switch (type) {
      case 'summary': {
        const now = new Date()
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

        const [
          { count: totalIncidents },
          { count: openIncidents },
          { count: criticalOpen },
          { count: pendingApprovals },
          { count: law1807Overdue },
          { count: totalLast7 },
          { count: totalBreached },
        ] = await Promise.all([
          // Total Incidents (All time)
          supabase.from('incidents').select('*', { count: 'exact', head: true }),
          // Open Incidents
          supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
          // Critical Open (Strictly CRITICAL + OPEN)
          supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'CRITICAL').eq('status', 'OPEN'),
          // Pending Approvals
          supabase.from('incident_steps').select('*', { count: 'exact', head: true }).eq('status', 'WAITING_APPROVAL'),
          // Law 18-07 Overdue (72h notification missed)
          supabase.from('incidents').select('*', { count: 'exact', head: true })
            .eq('compliance_notified', false)
            .lt('notify_72h_at', now.toISOString())
            .not('notify_72h_at', 'is', null),
          // Total in last 7 days
          supabase.from('incidents').select('*', { count: 'exact', head: true })
            .gte('created_at', sevenDaysAgo),
          // SLA Breaches (Last 7 days)
          supabase.from('incidents').select('*', { count: 'exact', head: true })
            .eq('sla_breached', true)
            .gte('created_at', sevenDaysAgo),
        ])

        const slaBreachRate7d = totalLast7 && totalLast7 > 0 
          ? (Number(totalBreached || 0) / Number(totalLast7)) * 100 
          : 0

        return NextResponse.json({
          total_incidents: totalIncidents || 0,
          open_incidents: openIncidents || 0,
          critical_open: criticalOpen || 0,
          pending_approvals: pendingApprovals || 0,
          law_1807_overdue: law1807Overdue || 0,
          sla_breach_rate_7d: Number(slaBreachRate7d.toFixed(1)),
        })
      }

      case 'incidents': {
        const { searchParams } = new URL(request.url)
        const range = searchParams.get('range') || '7d'
        const days = parseInt(range.replace('d', '')) || 7
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

        const { data: incidents } = await supabase
          .from('incidents')
          .select('id, status, severity, source, created_at')
          .gte('created_at', from)
          .order('created_at', { ascending: false })
        return NextResponse.json({ incidents: incidents || [] })
      }

      case 'sources': {
        const { data } = await supabase.from('incidents').select('source')
        const sourceMap: Record<string, number> = {}
        for (const row of data || []) {
          sourceMap[row.source] = (sourceMap[row.source] || 0) + 1
        }
        return NextResponse.json({ sources: sourceMap })
      }

      case 'sla': {
        const { searchParams } = new URL(request.url)
        const range = searchParams.get('range') || '7d'
        const days = parseInt(range.replace('d', '')) || 7
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

        const { count: total } = await supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', from)
        const { count: breached } = await supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .eq('sla_breached', true)
          .gte('created_at', from)
        const slaRate = total ? Math.round(((total - (breached || 0)) / total) * 100) / 100 : 1
        return NextResponse.json({ sla_compliance_rate: slaRate, total, breached: breached || 0 })
      }

      case 'mttr': {
        const { searchParams } = new URL(request.url)
        const range = searchParams.get('range') || '30d'
        const days = parseInt(range.replace('d', '')) || 30
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

        const { data } = await supabase
          .from('incidents')
          .select('mttr_minutes')
          .not('mttr_minutes', 'is', null)
          .gte('resolved_at', from)
        const avg =
          data && data.length > 0
            ? Math.round(data.reduce((s, r: any) => s + r.mttr_minutes, 0) / data.length)
            : 0
        return NextResponse.json({ average_mttr_minutes: avg, sample_size: data?.length || 0 })
      }

      case 'playbooks': {
        const { data } = await supabase
          .from('incidents')
          .select('playbook_id')
          .not('playbook_id', 'is', null)
        const playbookMap: Record<string, number> = {}
        for (const row of data || []) {
          if (row.playbook_id) playbookMap[row.playbook_id] = (playbookMap[row.playbook_id] || 0) + 1
        }
        return NextResponse.json({ playbooks: playbookMap })
      }

      default:
        return NextResponse.json({ error: 'Invalid stats type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Stats Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
