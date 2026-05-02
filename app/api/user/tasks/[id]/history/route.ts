import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, context: any) {
  const { id: stepId } = await context.params
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const supabase = await createClient()

  try {
    // 1. Get the incident_id for this step
    const { data: currentStep, error: stepError } = await supabase
      .from('incident_steps')
      .select('incident_id')
      .eq('id', stepId)
      .single()

    if (stepError || !currentStep) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 })
    }

    const incidentId = currentStep.incident_id

    // 2. Fetch all steps for this incident
    const { data: steps, error: stepsError } = await supabase
      .from('incident_steps')
      .select('id, step_type, status, error_detail, started_at, completed_at, created_at, result')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true })

    if (stepsError) throw new Error(stepsError.message)

    // 3. Fetch all step_actions for this incident (we do this by getting actions for the incident's steps)
    const stepIds = steps.map((s: any) => s.id)
    const { data: actions, error: actionsError } = await supabase
      .from('step_actions')
      .select('id, step_id, action, reason, created_at, profiles(name, role, email)')
      .in('step_id', stepIds)
      .order('created_at', { ascending: true })

    if (actionsError) throw new Error(actionsError.message)

    // 4. Merge them into a single chronological timeline
    const timeline: any[] = []

    steps.forEach((step: any) => {
      timeline.push({
        type: 'STEP_CREATED',
        id: `step-${step.id}`,
        timestamp: step.created_at,
        data: step
      })
    })

    actions.forEach((action: any) => {
      timeline.push({
        type: 'USER_ACTION',
        id: `action-${action.id}`,
        timestamp: action.created_at,
        data: action
      })
    })

    // Sort combined timeline
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return NextResponse.json({ timeline, incident_id: incidentId })
  } catch (error: any) {
    console.error('History API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
