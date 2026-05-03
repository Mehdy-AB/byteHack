import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { redirect } from 'next/navigation'
import FullDashboard from '@/components/dashboard/FullDashboard'
import PersonalDashboard from '@/components/dashboard/PersonalDashboard'

const PRIVILEGED = ['ADMIN', 'CISO', 'SOC_LEAD']

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const role = (session.user as any).role as string
  const name = (session.user as any).name as string | null ?? session.user.name ?? null

  if (PRIVILEGED.includes(role)) {
    return <FullDashboard />
  }

  return <PersonalDashboard name={name} />
}
