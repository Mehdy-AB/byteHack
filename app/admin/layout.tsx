import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

import NotificationsProvider from '@/components/NotificationsProvider'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, name, role, is_active')
    .eq('id', session.user.id)
    .single()

  if (!profile || !profile.is_active) redirect('/login')
  if (!['ADMIN', 'CISO', 'SOC_LEAD'].includes(profile.role)) redirect('/unauthorized')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto p-6 ml-60" style={{ background: 'var(--color-background)' }}>
        <NotificationsProvider role={profile.role}>
          {children}
        </NotificationsProvider>
      </main>
    </div>
  )
}
