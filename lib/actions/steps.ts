'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { processWorkflowSteps } from '@/lib/workflow/engine'
import { RoleType } from '@/lib/types'
import { waitUntil } from '@vercel/functions'

export async function approveStep(stepId: string, reason?: string) {
  const authResult = await requireAuth()
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  const { data: step } = await supabase.from('incident_steps').select('*').eq('id', stepId).single()
  if (!step) throw new Error('Step not found')

  if (step.assigned_role) {
    const roleAuth = await requireAuth([step.assigned_role])
    if ('error' in roleAuth) throw new Error('Insufficient privileges to approve this step')
  }

  const { error: updateError } = await supabase.from('incident_steps').update({ status: 'SUCCESS', completed_at: new Date().toISOString() }).eq('id', stepId)
  if (updateError) throw new Error('Failed to update step')

  await supabase.from('step_actions').insert({ step_id: stepId, actor_id: authResult.user.id, action: 'APPROVE', reason })
  
  await supabase.from('audit_log').insert({
    incident_id: step.incident_id,
    step_id: stepId,
    actor: authResult.user.id,
    action: 'STEP_APPROVE',
    status: 'SUCCESS',
    payload: { reason }
  })
  
  waitUntil(processWorkflowSteps(step.incident_id))
}

export async function rejectStep(stepId: string, reason: string) {
  const authResult = await requireAuth()
  if ('error' in authResult) throw new Error(authResult.error)
  if (!reason) throw new Error('Reason is required for rejection')

  const supabase = await createClient()
  const { data: step } = await supabase.from('incident_steps').select('*').eq('id', stepId).single()
  if (!step) throw new Error('Step not found')

  if (step.assigned_role) {
    const roleAuth = await requireAuth([step.assigned_role])
    if ('error' in roleAuth) throw new Error('Insufficient privileges to reject this step')
  }

  await supabase.from('incident_steps').update({ status: 'FAILED', completed_at: new Date().toISOString() }).eq('id', stepId)
  await supabase.from('step_actions').insert({ step_id: stepId, actor_id: authResult.user.id, action: 'REJECT', reason })
}

export async function retryStep(stepId: string) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  await supabase.from('incident_steps').update({ status: 'PENDING', error_detail: null, started_at: null, completed_at: null }).eq('id', stepId)
}

export async function reassignStep(stepId: string, newRole?: RoleType, newUser?: string) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  const { data: step } = await supabase.from('incident_steps').select('*, incident_id').eq('id', stepId).single()
  if (!step) throw new Error('Step not found')

  const newResult = { ...step.result }
  if (newRole) newResult.assignedRole = newRole
  if (newUser) newResult.assignedUser = newUser

  await supabase.from('incident_steps').update({ 
    assigned_role: newRole || null,
    result: newResult
  }).eq('id', stepId)

  await supabase.from('audit_log').insert({
    incident_id: step.incident_id,
    step_id: stepId,
    actor: authResult.user.id,
    action: 'REASSIGN_STEP',
    status: 'SUCCESS',
    payload: { newRole, newUser }
  })
}

export async function skipStep(stepId: string, reason: string) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  const { data: step } = await supabase.from('incident_steps').select('incident_id').eq('id', stepId).single()
  if (!step) throw new Error('Step not found')

  await supabase.from('incident_steps').update({ 
    status: 'SKIPPED',
    completed_at: new Date().toISOString()
  }).eq('id', stepId)

  await supabase.from('audit_log').insert({
    incident_id: step.incident_id,
    step_id: stepId,
    actor: authResult.user.id,
    action: 'SKIP_STEP',
    status: 'SUCCESS',
    payload: { reason }
  })
  
  waitUntil(processWorkflowSteps(step.incident_id))
}

export async function correctStepPayload(stepId: string, correctedPayload: any, reason: string) {
  const authResult = await requireAuth(['ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  const { data: step } = await supabase.from('incident_steps').select('incident_id, result, status').eq('id', stepId).single()
  if (!step) throw new Error('Step not found')

  await supabase.from('audit_log').insert({
    incident_id: step.incident_id,
    step_id: stepId,
    actor: authResult.user.id,
    action: 'STEP_PAYLOAD_CORRECTED',
    status: 'SUCCESS',
    payload: { original: step.result, corrected: correctedPayload, reason }
  })

  if (step.status === 'PENDING') {
    await supabase.from('incident_steps').update({ result: correctedPayload }).eq('id', stepId)
  }
}
