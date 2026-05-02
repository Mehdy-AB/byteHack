import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authResult = await requireAuth(['SOC_ANALYST'])
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { profile, user } = authResult
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const severity = searchParams.get('severity')
  const sortBy = searchParams.get('sortBy') || 'created_at'
  const order = searchParams.get('order') || 'desc'

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = (page - 1) * limit

  const source = searchParams.get('source')
  const assigned_to = searchParams.get('assigned_to')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  const supabase = await createClient()

  try {
    let query = supabase.from('incidents').select('*, profiles:assigned_to(name)', { count: 'exact' })

    // Role-aware: SOC_ANALYST sees only their assigned incidents
    if (profile.role === 'SOC_ANALYST') {
      query = query.eq('assigned_to', user.id)
    }

    if (status) query = query.eq('status', status)
    if (severity) query = query.eq('severity', severity)
    if (source) query = query.ilike('source', `%${source}%`)
    if (assigned_to) query = query.eq('assigned_to', assigned_to)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    query = query.order(sortBy, { ascending: order === 'asc' })
    query = query.range(offset, offset + limit - 1)

    const { data: incidents, count, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({
      incidents,
      pagination: { total: count || 0, page, limit },
    })
  } catch (error) {
    console.error('Admin Incidents API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
