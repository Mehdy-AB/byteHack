import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { sendEmailNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, context: any) {
  const { id: userId } = await context.params
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const body = await req.json()
  const { subject, message } = body
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, name, notify_email')
    .eq('id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (!profile.notify_email) {
    return NextResponse.json({ error: 'User has email notifications disabled' }, { status: 422 })
  }

  await sendEmailNotification(
    profile.email,
    subject || '[SF SOAR] Notification from your team',
    message,
  )

  await supabase.from('audit_log').insert({
    actor: authResult.user.id,
    action: 'MANUAL_NOTIFY_USER',
    status: 'SUCCESS',
    payload: { target_user: userId, subject, message },
  })

  return NextResponse.json({ ok: true })
}
