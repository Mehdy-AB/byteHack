import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authResult = await requireAuth(['CISO', 'LEGAL', 'ADMIN'])
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(request.url)
  const incidentId = searchParams.get('incident')

  if (!incidentId) {
    return NextResponse.json({ error: "'incident' query parameter is required" }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    const { data: logs } = await supabase
      .from('audit_log')
      .select('*')
      .eq('incident_id', incidentId)
      .order('id', { ascending: true })

    if (!logs || logs.length === 0) {
      return NextResponse.json({ error: 'Incident not found or no audit records' }, { status: 404 })
    }

    let hashMatches = 0
    const tampered: number[] = []

    for (const log of logs) {
      const payloadString = log.payload ? JSON.stringify(log.payload) : ''
      const dataToHash = `${log.incident_id}${log.actor}${log.action}${log.status}${log.prev_hash || ''}${payloadString}`
      const hash = crypto.createHash('sha256').update(dataToHash).digest('hex')

      if (hash === log.row_hash) {
        hashMatches++
      } else {
        tampered.push(Number(log.id))
      }
    }

    const isIntact = tampered.length === 0
    const response: Record<string, unknown> = {
      incident_id: incidentId,
      verification_status: isIntact ? 'VERIFIED' : 'COMPROMISED',
      is_intact: isIntact,
      hash_matches: hashMatches,
      tampered_records: tampered.length,
      last_verified_at: new Date().toISOString(),
    }
    if (!isIntact) response.tampered_log_ids = tampered

    return NextResponse.json(response)
  } catch (error) {
    console.error('Audit Chain Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
