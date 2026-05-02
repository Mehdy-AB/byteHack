'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { RoleType } from '@/lib/types'

export async function createUser(data: { email: string; name: string; role: RoleType }) {
  const authResult = await requireAuth(['ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: userAuth, error } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: 'TemporaryPassword123!',
    email_confirm: true
  })

  if (error || !userAuth.user) throw new Error(error?.message || 'Failed to create user')

  const supabase = await createServerClient()
  await supabase.from('profiles').insert({
    id: userAuth.user.id,
    email: data.email,
    name: data.name,
    role: data.role
  })

  return userAuth.user
}

export async function updateUserRole(id: string, role: RoleType) {
  const authResult = await requireAuth(['ADMIN'])
  if ('error' in authResult) throw new Error(authResult.error)

  const supabase = await createServerClient()
  await supabase.from('profiles').update({ role }).eq('id', id)
}
