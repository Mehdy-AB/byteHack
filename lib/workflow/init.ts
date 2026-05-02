import { createClient } from '@/lib/supabase/server'
import { processWorkflowSteps } from '@/lib/workflow/engine'
import { WorkflowPayload } from '@/lib/workflow/schema'
import { waitUntil } from '@vercel/functions'

export async function initializeIncidentWorkflow(payload: WorkflowPayload) {
  const supabase = await createClient()

  // Auto-assign incident to the first step's user if available
  const firstAssignedUser = payload.steps?.find(s => s.assignedUser)?.assignedUser || null

  const { data: incident, error: incidentError } = await supabase
    .from('incidents')
    .insert({
      source: payload.source,
      severity: payload.severity,
      raw_input: payload,
      assigned_to: firstAssignedUser,
      playbook_id: payload.playbook_id || null,
      status: 'OPEN'
    })
    .select()
    .single()

  if (incidentError || !incident) {
    throw new Error(`Failed to create incident: ${incidentError?.message}`)
  }

  if (payload.steps && payload.steps.length > 0) {
    const stepsToInsert = payload.steps.map((step, index) => ({
      incident_id: incident.id,
      step_type: step.type,
      step_order: index + 1,
      status: 'PENDING',
      assigned_role: step.assignedRole || null,
      assigned_user: step.assignedUser || null,
      result: step
    }))

    const { error: stepsError } = await supabase
      .from('incident_steps')
      .insert(stepsToInsert)

    if (stepsError) {
      console.error('Failed to insert steps', stepsError)
      throw new Error(`Failed to insert steps: ${stepsError.message}`)
    }
  }

  // Start processing the first step
  waitUntil(processWorkflowSteps(incident.id))

  return incident
}
