import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const supabase = await createClient()
  const userId = authResult.user.id

  const [profileRes, approvalsRes, rejectionsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('step_actions')
      .select('id', { count: 'exact', head: true })
      .eq('actor_id', userId)
      .eq('action', 'APPROVE'),
    supabase
      .from('step_actions')
      .select('id', { count: 'exact', head: true })
      .eq('actor_id', userId)
      .eq('action', 'REJECT'),
  ])

  if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 500 })

  const total_approvals       = approvalsRes.count  ?? 0
  const total_rejections      = rejectionsRes.count ?? 0
  const total_tasks_completed = total_approvals + total_rejections

  return NextResponse.json({
    profile: {
      ...profileRes.data,
      total_approvals,
      total_rejections,
      total_tasks_completed,
    },
  })
}

export async function PUT(req: Request) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const body = await req.json()
  const allowed = ['name', 'phone', 'department', 'bio', 'experience_level', 'notify_email', 'notify_sms', 'timezone', 'language']
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key]
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', authResult.user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
