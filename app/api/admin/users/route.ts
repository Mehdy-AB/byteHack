import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')
  const active = searchParams.get('active')

  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select('id, email, name, role, is_active, experience_level, department, phone, total_approvals, total_rejections, total_tasks_completed, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (role) query = query.eq('role', role)
  if (active !== null) query = query.eq('is_active', active === 'true')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ users: data || [] })
}
