import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { AuthResult, RoleType } from '@/lib/types'

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
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const profile = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    role: (session.user as any).role as RoleType,
    is_active: true,
    phone: null,
    department: null,
    bio: null,
    avatar_url: null,
    experience_level: 'JUNIOR' as const,
    notify_email: true,
    notify_sms: false,
    timezone: 'UTC',
    language: 'en',
    total_approvals: 0,
    total_rejections: 0,
    total_tasks_completed: 0,
    created_at: '',
    updated_at: '',
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(
      role => ROLE_HIERARCHY[profile.role] >= ROLE_HIERARCHY[role]
    )
    if (!hasAllowedRole) {
      return { error: 'Forbidden: Insufficient privileges', status: 403 }
    }
  }

  return {
    user: { id: session.user.id, email: session.user.email },
    profile,
  }
}
