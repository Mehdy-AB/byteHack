import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldOff, ArrowLeft, Lock } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  ADMIN:       'Administrator',
  CISO:        'Chief Information Security Officer',
  SOC_LEAD:    'SOC Lead',
  SOC_ANALYST: 'SOC Analyst',
  IT_ADMIN:    'IT Administrator',
  LEGAL:       'Legal',
  EXEC:        'Executive',
}

const ROLE_HOME: Record<string, string> = {
  ADMIN:       '/dashboard',
  CISO:        '/dashboard',
  SOC_LEAD:    '/dashboard',
  SOC_ANALYST: '/dashboard/tasks',
  IT_ADMIN:    '/dashboard/tasks',
  LEGAL:       '/dashboard/compliance',
  EXEC:        '/dashboard',
}

export default async function UnauthorizedPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const role = (session.user as any).role as string | undefined
  const label = role ? (ROLE_LABELS[role] ?? role) : 'Unknown'
  const home  = role ? (ROLE_HOME[role]  ?? '/dashboard') : '/dashboard'

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="w-full max-w-md space-y-8 text-center">

        {/* Icon */}
        <div className="flex justify-center">
          <div
            className="h-20 w-20 rounded-2xl grid place-items-center"
            style={{
              background: 'color-mix(in oklab, var(--severity-critical) 10%, transparent)',
              border: '1px solid color-mix(in oklab, var(--severity-critical) 25%, transparent)',
            }}
          >
            <ShieldOff className="h-9 w-9" style={{ color: 'var(--severity-critical)' }} />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Your role does not have permission to view this page.
          </p>
        </div>

        {/* Role badge */}
        <div
          className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Lock className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} />
          <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Signed in as</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{
              background: 'color-mix(in oklab, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
              border: '1px solid color-mix(in oklab, var(--color-primary) 25%, transparent)',
            }}
          >
            {label}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--color-border)' }} />

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href={home}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-primary)', color: 'var(--color-background)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Go to your dashboard
          </Link>
          <p className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>
            Need access? Contact your system administrator.
          </p>
        </div>

      </div>
    </div>
  )
}
