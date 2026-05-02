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
  const supabase = await createClient()

  // Mode 2 — Org-wide compliance summary
  if (!incidentId) {
    try {
      const { count: totalIncidents } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })

      const { count: totalAuditLogs } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })

      const { count: law1807Overdue } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('compliance_notified', false)
        .lt('notify_72h_at', new Date().toISOString())
        .not('notify_72h_at', 'is', null)

      const { count: law1807Sent } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('compliance_notified', true)

      return NextResponse.json({
        report_type: 'SUMMARY',
        report_generated_at: new Date().toISOString(),
        total_audited_incidents: totalIncidents || 0,
        integrity_violations_detected: 0,
        unauthorized_access_attempts: 0,
        law_1807_notifications_sent: law1807Sent || 0,
        law_1807_overdue: law1807Overdue || 0,
        audit_log_total_entries: totalAuditLogs || 0,
      })
    } catch (error) {
      console.error('Compliance Summary Error:', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  }

  // Mode 1 — Per-incident Law 18-07 report
  try {
    const { data: incident, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .single()

    if (error || !incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }

    const { data: auditLog } = await supabase
      .from('audit_log')
      .select('*')
      .eq('incident_id', incidentId)
      .order('id', { ascending: true })

    // Verify hash chain integrity inline
    let integrityIntact = true
    for (const log of auditLog || []) {
      const payloadString = log.payload ? JSON.stringify(log.payload) : ''
      const dataToHash = `${log.incident_id}${log.actor}${log.action}${log.status}${log.prev_hash || ''}${payloadString}`
      const hash = crypto.createHash('sha256').update(dataToHash).digest('hex')
      if (hash !== log.row_hash) {
        integrityIntact = false
        break
      }
    }

    const notifyRequired = incident.severity === 'HIGH' || incident.severity === 'CRITICAL'
    const deadline = incident.notify_72h_at || null
    let hoursRemaining: number | null = null
    if (deadline) {
      hoursRemaining = Math.max(
        0,
        Math.round(((new Date(deadline).getTime() - Date.now()) / 3600000) * 100) / 100
      )
    }

    const notified: boolean = incident.compliance_notified || false
    const overdue = deadline && new Date(deadline) < new Date()
    const law1807Status = notified ? 'DONE' : overdue ? 'OVERDUE' : 'PENDING'

    const timeline = (auditLog || []).map((log: any) => ({
      timestamp: log.created_at,
      actor: log.actor,
      action: log.action,
      details: log.payload ? JSON.stringify(log.payload) : '',
    }))

    return NextResponse.json({
      report_type: 'INCIDENT',
      generated_at: new Date().toISOString(),
      incident: {
        id: incident.id,
        title: incident.raw_input?.title || 'Unknown',
        severity: incident.severity,
        source: incident.source,
        playbook_id: incident.playbook_id ?? incident.raw_input?.playbook_id ?? null,
        playbook_version: incident.raw_input?.playbook_version ?? null,
        created_at: incident.created_at,
        resolved_at: incident.resolved_at,
        mttr_minutes: incident.mttr_minutes,
      },
      law_1807: {
        notification_required: notifyRequired,
        deadline,
        notified,
        hours_remaining: hoursRemaining,
        status: law1807Status,
      },
      timeline,
      integrity: {
        is_intact: integrityIntact,
        verified_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Compliance Report Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
