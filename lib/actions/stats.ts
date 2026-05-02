'use server'

import { requireAuth } from '@/lib/auth'

export async function saveCustomWidget(config: any) {
  const authResult = await requireAuth()
  if ('error' in authResult) throw new Error(authResult.error)

  console.log('Saved widget for user:', authResult.user.id, config)
  return { success: true }
}
