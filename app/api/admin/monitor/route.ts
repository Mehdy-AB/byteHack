import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const supabase = await createClient()

  try {
    const ago24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [
      { count: activeWorkflows },
      { count: pendingSteps },
      { count: failedSteps },
      { count: criticalOpen },
      { data: recentFailed },
      { data: waitingSteps },
    ] = await Promise.all([
      supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['OPEN', 'CONTAINED']),
      supabase.from('incident_steps').select('*', { count: 'exact', head: true }).in('status', ['PENDING', 'WAITING_APPROVAL']),
      supabase.from('incident_steps').select('*', { count: 'exact', head: true }).eq('status', 'FAILED').gte('created_at', ago24h),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'CRITICAL').in('status', ['OPEN', 'CONTAINED']),
      supabase.from('incident_steps').select('id, incident_id, step_type, error_detail, created_at').eq('status', 'FAILED').gte('created_at', ago24h).order('created_at', { ascending: false }).limit(20),
      supabase.from('incident_steps').select('id, incident_id, step_type, assigned_role, created_at').eq('status', 'WAITING_APPROVAL').order('created_at', { ascending: false }).limit(20),
    ])

    return NextResponse.json({
      activeWorkflows: activeWorkflows ?? 0,
      pendingSteps: pendingSteps ?? 0,
      failedSteps: failedSteps ?? 0,
      criticalOpen: criticalOpen ?? 0,
      recentFailed: recentFailed || [],
      waitingSteps: waitingSteps || [],
    })
  } catch (error) {
    console.error('Admin Monitor Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
