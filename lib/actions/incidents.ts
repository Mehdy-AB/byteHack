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

export async function voidWorkflow(id: string, reason: string) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)
  if (!reason) throw new Error('Reason is required')

  const supabase = await createClient()

  // Cancel all active steps
  await supabase
    .from('incident_steps')
    .update({ status: 'SKIPPED', completed_at: new Date().toISOString() })
    .eq('incident_id', id)
    .in('status', ['PENDING', 'RUNNING', 'WAITING_APPROVAL'])

  const now = new Date()
  const { data: incident } = await supabase
    .from('incidents')
    .select('created_at')
    .eq('id', id)
    .single()

  const mttr = incident
    ? Math.floor((now.getTime() - new Date(incident.created_at).getTime()) / 60000)
    : null

  await supabase.from('incidents').update({
    status: 'CLOSED',
    resolved_at: now.toISOString(),
    ...(mttr !== null && { mttr_minutes: mttr }),
  }).eq('id', id)

  await supabase.from('audit_log').insert({
    incident_id: id,
    actor: authResult.user.id,
    action: 'VOID_WORKFLOW',
    status: 'SUCCESS',
    payload: { reason },
  })
}

export async function setIncidentPriority(id: string, priority: number) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const clamped = Math.min(10, Math.max(1, Math.floor(priority)))
  const supabase = await createClient()

  await supabase.from('incidents').update({ priority: clamped }).eq('id', id)

  await supabase.from('audit_log').insert({
    incident_id: id,
    actor: authResult.user.id,
    action: 'SET_PRIORITY',
    status: 'SUCCESS',
    payload: { priority: clamped },
  })
}

export async function resendStepNotification(stepId: string) {
  const authResult = await requireAuth(['SOC_LEAD', 'CISO', 'ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  const { data: step } = await supabase
    .from('incident_steps')
    .select('*, incidents(raw_input, severity)')
    .eq('id', stepId)
    .single()
  if (!step) throw new Error('Step not found')

  const { sendEmailNotification } = await import('@/lib/notifications')
  const incidentTitle = step.incidents?.raw_input?.title || 'Untitled'
  const assignedUser = step.result?.assignedUser || step.assigned_user
  const assignedRole = step.result?.assignedRole || step.assigned_role
  const subject = `[SF SOAR] Reminder: Task Assigned — ${step.step_type.replace(/_/g, ' ')}`
  const body = `Reminder: You have a pending ${step.step_type} task for incident "${incidentTitle}". ${step.result?.message || 'Please review in your SOAR dashboard.'}`

  if (assignedUser) {
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', assignedUser).single()
    if (profile?.email) await sendEmailNotification(profile.email, subject, body)
  } else if (assignedRole) {
    const { data: profiles } = await supabase.from('profiles').select('email')
      .eq('role', assignedRole).eq('notify_email', true).eq('is_active', true)
    if (profiles?.length) {
      await Promise.all(profiles.map((p: any) => sendEmailNotification(p.email, subject, body)))
    }
  }

  await supabase.from('audit_log').insert({
    incident_id: step.incident_id,
    step_id: stepId,
    actor: authResult.user.id,
    action: 'RESEND_NOTIFICATION',
    status: 'SUCCESS',
    payload: { assignedUser, assignedRole },
  })
}
