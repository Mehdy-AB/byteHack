'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { ExperienceLevel } from '@/lib/types'

export interface ProfileUpdatePayload {
  name?: string
  phone?: string
  department?: string
  bio?: string
  experience_level?: ExperienceLevel
  notify_email?: boolean
  notify_sms?: boolean
  timezone?: string
  language?: string
}

export async function updateProfile(payload: ProfileUpdatePayload) {
  const authResult = await requireAuth()
  if ('error' in authResult) throw new Error(authResult.error)

  const allowed: (keyof ProfileUpdatePayload)[] = [
    'name', 'phone', 'department', 'bio',
    'experience_level', 'notify_email', 'notify_sms',
    'timezone', 'language',
  ]

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (payload[key] !== undefined) update[key] = payload[key]
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', authResult.user.id)

  if (error) throw new Error(error.message)
}

export async function getMyProfile() {
  const authResult = await requireAuth()
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authResult.user.id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getMyStats() {
  const authResult = await requireAuth()
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createClient()
  const userId = authResult.user.id

  const [approvals, rejections, pending] = await Promise.all([
    supabase.from('step_actions').select('id', { count: 'exact', head: true })
      .eq('actor_id', userId).eq('action', 'APPROVE'),
    supabase.from('step_actions').select('id', { count: 'exact', head: true })
      .eq('actor_id', userId).eq('action', 'REJECT'),
    supabase.from('incident_steps').select('id', { count: 'exact', head: true })
      .eq('assigned_user', userId).in('status', ['PENDING', 'WAITING_APPROVAL']),
  ])

  return {
    total_approvals: approvals.count ?? 0,
    total_rejections: rejections.count ?? 0,
    pending_tasks: pending.count ?? 0,
  }
}
