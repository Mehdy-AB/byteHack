import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = req.nextauth.token?.role as string | undefined

    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard/tasks', req.url))
    }

    if (pathname.startsWith('/dashboard/compliance')) {
      if (role !== 'CISO' && role !== 'LEGAL' && role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard/tasks', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
