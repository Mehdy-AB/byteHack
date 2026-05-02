import { createClient } from '@/lib/supabase/server'
import { sendEmailNotification, sendSmsNotification } from '@/lib/notifications'

export async function processWorkflowSteps(incidentId: string) {
  const supabase = await createClient()

  try {
    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .select('status')
      .eq('id', incidentId)
      .single()

    if (incError || !incident) throw new Error('Incident not found')
    if (incident.status === 'SUSPENDED') {
      console.log(`Incident ${incidentId} is SUSPENDED. Halting workflow engine.`)
      return
    }

    const { data: steps, error } = await supabase
      .from('incident_steps')
      .select('*')
      .eq('incident_id', incidentId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })

    if (error || !steps) throw new Error('Failed to fetch pending steps')

    for (const step of steps) {
      const payload = step.result

      if (payload.scheduledTime) {
        const scheduled = new Date(payload.scheduledTime).getTime()
        if (Date.now() < scheduled) {
          console.log(`Step ${step.id} is scheduled for ${payload.scheduledTime}. Skipping for now.`)
          continue
        }
      }

      console.log(`Processing step: ${step.step_type} for incident ${incidentId}`)
      await supabase.from('incident_steps').update({ status: 'RUNNING', started_at: new Date().toISOString() }).eq('id', step.id)

      let stepStatus = 'SUCCESS'

      try {
        switch (step.step_type) {
          case 'EMAIL':
            await sendEmailNotification(payload.to, payload.subject || 'SOAR Alert', payload.body)
            break
            
          case 'SMS':
            await sendSmsNotification(payload.to, payload.body)
            break
            
          case 'APPROVAL':
            stepStatus = 'WAITING_APPROVAL'
            
            if (payload.notifyOnAssign) {
              const role = payload.assignedRole || step.assigned_role
              const user = payload.assignedUser
              let emailTo = null

              if (user) {
                const { data: profile } = await supabase.from('profiles').select('email').eq('id', user).single()
                if (profile?.email) emailTo = profile.email
              } else if (role) {
                emailTo = `${role.toLowerCase()}@bytehack.com`
              }

              if (emailTo) {
                await sendEmailNotification(emailTo, 'Task Assigned', `You have a new task for incident ${incidentId}: ${payload.message || 'Please review.'}`)
              }
            }
            break

          case 'INTEGRATION':
            console.log(`Executing INTEGRATION: ${payload.integration} against target ${payload.target}`)
            // Python service integration mock
            break

          case 'WEBHOOK':
            console.log(`Executing WEBHOOK to ${payload.target}`)
            break

          case 'SCRIPT':
            console.log(`Executing SCRIPT for incident ${incidentId}`)
            break
            
          default:
            console.log(`Unhandled step type: ${step.step_type}`)
        }
      } catch (err: any) {
        stepStatus = 'FAILED'
        console.error(`Step ${step.id} failed:`, err)
        await supabase.from('incident_steps').update({ error_detail: err.message }).eq('id', step.id)
      }

      if (stepStatus !== 'WAITING_APPROVAL') {
        await supabase.from('incident_steps').update({ 
          status: stepStatus, 
          completed_at: new Date().toISOString() 
        }).eq('id', step.id)
        
        await supabase.from('audit_log').insert({
          incident_id: incidentId,
          step_id: step.id,
          actor: 'WORKFLOW_ENGINE',
          action: `EXECUTE_${step.step_type}`,
          status: stepStatus,
          payload: step.result
        })
      }
    }

  } catch (error) {
    console.error('Workflow Engine Error:', error)
  }
}
