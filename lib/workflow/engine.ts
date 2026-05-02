import { createClient } from '@/lib/supabase/server'
import { sendEmailNotification } from '@/lib/notifications'
import { SeverityLevel } from '@/lib/types'

const SLA_MINUTES: Record<SeverityLevel, number> = {
  CRITICAL: 60,
  HIGH: 240,
  MEDIUM: 1440,
  LOW: 4320,
}

async function notifyStepAssignee(
  supabase: Awaited<ReturnType<typeof createClient>>,
  step: any,
  incidentId: string,
  incidentTitle: string,
) {
  const assignedUser = step.result?.assignedUser || step.assigned_user
  const assignedRole = step.result?.assignedRole || step.assigned_role
  const subject = `[SF SOAR] Task Assigned: ${step.step_type.replace(/_/g, ' ')}`
  const body = `You have a new ${step.step_type} task for incident "${incidentTitle}" (ID: ${incidentId}). ${step.result?.message || 'Please review in your SOAR dashboard.'}`

  if (assignedUser) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, notify_email')
      .eq('id', assignedUser)
      .single()
    if (profile?.notify_email && profile?.email) {
      await sendEmailNotification(profile.email, subject, body)
    }
    return
  }

  if (assignedRole) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', assignedRole)
      .eq('notify_email', true)
      .eq('is_active', true)
    if (profiles?.length) {
      await Promise.all(profiles.map((p: any) => sendEmailNotification(p.email, subject, body)))
    }
  }
}

export async function processWorkflowSteps(incidentId: string) {
  const supabase = await createClient()

  try {
    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .select('status, severity, raw_input')
      .eq('id', incidentId)
      .single()

    if (incError || !incident) throw new Error('Incident not found')

    if (incident.status === 'SUSPENDED' || incident.status === 'CLOSED' || incident.status === 'ARCHIVED') {
      console.log(`Incident ${incidentId} is ${incident.status}. Halting workflow engine.`)
      return
    }

    const incidentTitle: string = incident.raw_input?.title || 'Untitled'
    const severity = incident.severity as SeverityLevel

    const { data: steps, error } = await supabase
      .from('incident_steps')
      .select('*')
      .eq('incident_id', incidentId)
      .eq('status', 'PENDING')
      .order('step_order', { ascending: true })

    if (error || !steps) throw new Error('Failed to fetch pending steps')

    for (const step of steps) {
      const payload = step.result || {}

      if (payload.scheduledTime) {
        const scheduled = new Date(payload.scheduledTime).getTime()
        if (Date.now() < scheduled) {
          console.log(`Step ${step.id} scheduled for ${payload.scheduledTime}. Skipping.`)
          continue
        }
      }

      console.log(`Processing step ${step.step_order || '?'}: ${step.step_type} for incident ${incidentId}`)
      await supabase
        .from('incident_steps')
        .update({ status: 'RUNNING', started_at: new Date().toISOString() })
        .eq('id', step.id)

      let stepStatus = 'SUCCESS'

      try {
        switch (step.step_type) {
          case 'APPROVAL': {
            stepStatus = 'WAITING_APPROVAL'
            const slaMinutes = SLA_MINUTES[severity] ?? SLA_MINUTES.MEDIUM
            const slaDeadline = new Date(Date.now() + slaMinutes * 60 * 1000).toISOString()
            await supabase
              .from('incident_steps')
              .update({ status: 'WAITING_APPROVAL', sla_deadline: slaDeadline })
              .eq('id', step.id)
            await notifyStepAssignee(supabase, step, incidentId, incidentTitle)

            await supabase.from('audit_log').insert({
              incident_id: incidentId,
              step_id: step.id,
              actor: 'WORKFLOW_ENGINE',
              action: 'EXECUTE_APPROVAL',
              status: 'WAITING_APPROVAL',
              payload: { step_order: step.step_order },
            })

            // STOP — wait for human to Approve/Reject before continuing the chain
            console.log(`⏸  Chain paused at step ${step.step_order || '?'} (APPROVAL) — waiting for human action.`)
            return
          }

          case 'INTEGRATION':
            console.log(`Executing INTEGRATION: ${payload.integration} against target ${payload.target}`)
            await notifyStepAssignee(supabase, step, incidentId, incidentTitle)
            break

          case 'WEBHOOK':
            console.log(`Executing WEBHOOK to ${payload.target}`)
            await notifyStepAssignee(supabase, step, incidentId, incidentTitle)
            break

          case 'SCRIPT':
            console.log(`Executing SCRIPT for incident ${incidentId}`)
            await notifyStepAssignee(supabase, step, incidentId, incidentTitle)
            break

          default:
            console.log(`Unhandled step type: ${step.step_type}`)
        }
      } catch (err: any) {
        stepStatus = 'FAILED'
        console.error(`Step ${step.id} failed:`, err)
        await supabase.from('incident_steps').update({ error_detail: err.message }).eq('id', step.id)
      }

      // Finalize the step
      await supabase
        .from('incident_steps')
        .update({ status: stepStatus, completed_at: new Date().toISOString() })
        .eq('id', step.id)

      await supabase.from('audit_log').insert({
        incident_id: incidentId,
        step_id: step.id,
        actor: 'WORKFLOW_ENGINE',
        action: `EXECUTE_${step.step_type}`,
        status: stepStatus,
        payload: { step_order: step.step_order },
      })

      // If a step FAILED, stop the chain — don't process further steps
      if (stepStatus === 'FAILED') {
        console.log(`🛑 Chain halted at step ${step.step_order || '?'} (FAILED).`)
        return
      }
    }

    // Auto-resolve when no active steps remain
    const { data: remaining } = await supabase
      .from('incident_steps')
      .select('id')
      .eq('incident_id', incidentId)
      .in('status', ['PENDING', 'RUNNING', 'WAITING_APPROVAL'])

    if (!remaining || remaining.length === 0) {
      const now = new Date().toISOString()
      const { data: inc } = await supabase
        .from('incidents')
        .select('created_at')
        .eq('id', incidentId)
        .single()

      const mttr = inc
        ? Math.floor((Date.now() - new Date(inc.created_at).getTime()) / 60000)
        : null

      await supabase
        .from('incidents')
        .update({ status: 'RESOLVED', resolved_at: now, ...(mttr !== null && { mttr_minutes: mttr }) })
        .eq('id', incidentId)
        .in('status', ['OPEN', 'CONTAINED'])
    }
  } catch (error) {
    console.error('Workflow Engine Error:', error)
  }
}
