import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, context: any) {
  const { id: stepId } = await context.params
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const supabase = await createClient()
  const { data: step, error } = await supabase
    .from('incident_steps')
    .select('*, incidents(id, raw_input, severity, source)')
    .eq('id', stepId)
    .single()

  if (error || !step) return NextResponse.json({ error: 'Step not found' }, { status: 404 })

  return NextResponse.json({ task: step })
}
