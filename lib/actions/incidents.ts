'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { SeverityLevel, IncidentStatus } from '@/lib/types'
import { processWorkflowSteps } from '@/lib/workflow/engine'
import { waitUntil } from '@vercel/functions'

export async function reassignIncident(id: string, userId: string) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  await supabase.from('incidents').update({ assigned_to: userId }).eq('id', id)
  
  await supabase.from('audit_log').insert({
    incident_id: id,
    actor: authResult.user.id,
    action: 'REASSIGN_INCIDENT',
    status: 'SUCCESS',
    payload: { assigned_to: userId }
  })
}

export async function overrideSeverity(id: string, severity: SeverityLevel) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const scoreMap = { LOW: 10, MEDIUM: 40, HIGH: 70, CRITICAL: 90 }
  const severityScore = scoreMap[severity]

  const supabase = await createClient()
  await supabase.from('incidents').update({ severity, severity_score: severityScore }).eq('id', id)

  await supabase.from('audit_log').insert({
    incident_id: id,
    actor: authResult.user.id,
    action: 'OVERRIDE_SEVERITY',
    status: 'SUCCESS',
    payload: { severity }
  })
}

export async function closeIncident(id: string, notes: string) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  const { data: incident } = await supabase.from('incidents').select('*').eq('id', id).single()
  if (!incident) throw new Error('Incident not found')

  const resolvedAt = new Date()
  const createdAt = new Date(incident.created_at)
  const mttrMinutes = Math.floor((resolvedAt.getTime() - createdAt.getTime()) / 60000)

  await supabase.from('incidents').update({ status: 'CLOSED', resolved_at: resolvedAt.toISOString(), mttr_minutes: mttrMinutes }).eq('id', id)

  await supabase.from('audit_log').insert({
    incident_id: id,
    actor: authResult.user.id,
    action: 'CLOSE_INCIDENT',
    status: 'SUCCESS',
    payload: { notes, mttr_minutes: mttrMinutes }
  })
}

export async function suspendWorkflow(id: string) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  await supabase.from('incidents').update({ status: 'SUSPENDED' }).eq('id', id)

  await supabase.from('audit_log').insert({
    incident_id: id,
    actor: authResult.user.id,
    action: 'SUSPEND_WORKFLOW',
    status: 'SUCCESS',
    payload: {}
  })
}

export async function resumeWorkflow(id: string) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  await supabase.from('incidents').update({ status: 'OPEN' }).eq('id', id)

  await supabase.from('audit_log').insert({
    incident_id: id,
    actor: authResult.user.id,
    action: 'RESUME_WORKFLOW',
    status: 'SUCCESS',
    payload: {}
  })
  
  waitUntil(processWorkflowSteps(id))
}

export async function rollbackStep(stepId: string) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  const { data: step } = await supabase.from('incident_steps').select('incident_id').eq('id', stepId).single()
  if (!step) throw new Error('Step not found')

  await supabase.from('incident_steps').update({ 
    status: 'PENDING', 
    error_detail: null, 
    started_at: null, 
    completed_at: null 
  }).eq('id', stepId)

  await supabase.from('audit_log').insert({
    incident_id: step.incident_id,
    step_id: stepId,
    actor: authResult.user.id,
    action: 'ROLLBACK_STEP',
    status: 'SUCCESS',
    payload: {}
  })
  
  waitUntil(processWorkflowSteps(step.incident_id))
}

export async function forceUpdateStatus(id: string, status: IncidentStatus, reason: string) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  await supabase.from('incidents').update({ status }).eq('id', id)

  await supabase.from('audit_log').insert({
    incident_id: id,
    actor: authResult.user.id,
    action: 'FORCE_UPDATE_STATUS',
    status: 'SUCCESS',
    payload: { status, reason }
  })
}

export async function updateIncidentMetadata(id: string, payload: { title?: string; source?: string }) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  
  const { data: incident } = await supabase.from('incidents').select('raw_input, source').eq('id', id).single()
  if (!incident) throw new Error('Incident not found')
  
  const currentInput = incident.raw_input || {}
  const mergedInput = { ...currentInput, ...payload }
  
  const updateData: any = { raw_input: mergedInput }
  if (payload.source) updateData.source = payload.source

  await supabase.from('incidents').update(updateData).eq('id', id)

  await supabase.from('audit_log').insert({
    incident_id: id,
    actor: authResult.user.id,
    action: 'UPDATE_METADATA',
    status: 'SUCCESS',
    payload
  })
}

export async function archiveIncident(id: string) {
  const authResult = await requireAuth(['ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  await supabase.from('incidents').update({ status: 'ARCHIVED' }).eq('id', id)

  await supabase.from('audit_log').insert({
    incident_id: id,
    actor: authResult.user.id,
    action: 'ARCHIVE_INCIDENT',
    status: 'SUCCESS',
    payload: {}
  })
}
