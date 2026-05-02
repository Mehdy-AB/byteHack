import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processWorkflowSteps } from '@/lib/workflow/engine'
import { WorkflowPayloadSchema } from '@/lib/workflow/schema'
import { waitUntil } from '@vercel/functions'

export const dynamic = 'force-dynamic'

function verifySecret(request: Request) {
  const secret = request.headers.get('x-workflow-secret')
  return secret === process.env.WORKFLOW_WEBHOOK_SECRET
}

export async function POST(request: Request) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const json = await request.json()

    const parsed = WorkflowPayloadSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid workflow payload', details: parsed.error.format() }, { status: 400 })
    }

    const payload = parsed.data
    const supabase = await createClient()

    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .insert({
        source: payload.source,
        severity: payload.severity,
        raw_input: payload
      })
      .select()
      .single()

    if (incidentError || !incident) {
      throw new Error(`Failed to create incident: ${incidentError?.message}`)
    }

    if (payload.steps && payload.steps.length > 0) {
      const stepsToInsert = payload.steps.map((step) => ({
        incident_id: incident.id,
        step_type: step.type,
        status: 'PENDING',
        assigned_role: step.assignedRole || null,
        result: step
      }))

      const { error: stepsError } = await supabase
        .from('incident_steps')
        .insert(stepsToInsert)

      if (stepsError) {
        console.error('Failed to insert steps', stepsError)
      }
    }

    waitUntil(processWorkflowSteps(incident.id))

    return NextResponse.json({ message: 'Workflow Accepted', incidentId: incident.id }, { status: 202 })
  } catch (error) {
    console.error('Workflow Execute Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
