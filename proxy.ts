import { withAuth, NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

const ALLOWED: Record<string, string[]> = {
  USERS_MGMT:  ['ADMIN', 'CISO'],
  ADMIN_PANEL: ['ADMIN', 'CISO', 'SOC_LEAD'],
  COMPLIANCE:  ['ADMIN', 'CISO', 'LEGAL'],
  ANALYZE:     ['ADMIN', 'CISO', 'SOC_LEAD', 'SOC_ANALYST', 'IT_ADMIN'],
}

function deny(req: NextRequestWithAuth) {
  return NextResponse.redirect(new URL('/unauthorized', req.url))
}

const authMiddleware = withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = req.nextauth.token?.role as string | undefined

    if (!role) return deny(req)

    // Most-specific routes checked first
    if (pathname.startsWith('/admin/users')      && !ALLOWED.USERS_MGMT.includes(role))  return deny(req)
    if (pathname.startsWith('/admin')            && !ALLOWED.ADMIN_PANEL.includes(role))  return deny(req)
    if (pathname.startsWith('/dashboard/compliance') && !ALLOWED.COMPLIANCE.includes(role)) return deny(req)
    if (pathname.startsWith('/dashboard/analyze')    && !ALLOWED.ANALYZE.includes(role))   return deny(req)

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export function proxy(req: any, event: any) {
  return (authMiddleware as any)(req, event)
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
