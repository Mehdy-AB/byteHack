import { createClient } from '@/lib/supabase/server'
import { AuthResult, RoleType } from '@/lib/types'
import { headers } from 'next/headers'

const ROLE_HIERARCHY: Record<RoleType, number> = {
  ADMIN: 100,
  CISO: 90,
  SOC_LEAD: 80,
  SOC_ANALYST: 70,
  IT_ADMIN: 60,
  LEGAL: 50,
  EXEC: 40,
}

export async function requireAuth(allowedRoles?: RoleType[]): Promise<AuthResult> {
  const supabase = await createClient()
  
  const headersList = await headers()
  const authHeader = headersList.get('authorization')
  
  let user;
  let authError;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const { data, error } = await supabase.auth.getUser(token)
    user = data?.user
    authError = error
  } else {
    const { data, error } = await supabase.auth.getUser()
    user = data?.user
    authError = error
  }

  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'Profile not found', status: 404 }
  }

  if (!profile.is_active) {
    return { error: 'Account disabled', status: 403 }
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => 
      ROLE_HIERARCHY[profile.role as RoleType] >= ROLE_HIERARCHY[role]
    )

    if (!hasAllowedRole) {
      return { error: 'Forbidden: Insufficient privileges', status: 403 }
    }
  }

  return { user, profile }
}
