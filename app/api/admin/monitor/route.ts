import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authResult = await requireAuth(['ADMIN'])
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const supabase = await createClient()

  try {
    const { count: activeCount } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .in('status', ['OPEN', 'CONTAINED'])

    const { count: pendingCount } = await supabase
      .from('incident_steps')
      .select('*', { count: 'exact', head: true })
      .in('status', ['PENDING', 'RUNNING', 'WAITING_APPROVAL'])

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: failedCount } = await supabase
      .from('incident_steps')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'FAILED')
      .gte('updated_at', oneDayAgo)

    return NextResponse.json({
      health: 'OPERATIONAL',
      active_workflows: activeCount || 0,
      pending_steps: pendingCount || 0,
      failed_steps_24h: failedCount || 0,
    })
  } catch (error) {
    console.error('Admin Monitor Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
