import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const incidentId = searchParams.get('incident_id')
  
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  const supabase = await createClient()

  try {
    let query = supabase.from('incident_steps').select('*, incidents(id, severity, source)', { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (type) query = query.eq('step_type', type)
    if (incidentId) query = query.eq('incident_id', incidentId)
    
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data: steps, count, error } = await query

    if (error) throw new Error(error.message)

    return NextResponse.json({
      steps,
      pagination: {
        total: count || 0,
        page,
        limit,
      },
    })
  } catch (error) {
    console.error('Admin Steps API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
