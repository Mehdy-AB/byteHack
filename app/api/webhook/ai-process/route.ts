import { NextResponse } from 'next/server'
import { initializeIncidentWorkflow } from '@/lib/workflow/init'
import { WorkflowPayloadSchema } from '@/lib/workflow/schema'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Receives workflow JSON pushed by the Python RAG/AI backend (_send_to_friend).
 * Validates, creates an incident, and starts the SOAR engine.
 *
 * Python error payloads ({ error: true }) are logged to audit_log and
 * acknowledged with 200 — no incident is created for AI failures.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Empty payload' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>

  // Python sends { error: true, ... } when workflow generation fails
  if (payload.error === true) {
    try {
      const supabase = await createClient()
      await supabase.from('audit_log').insert({
        actor: 'PYTHON_AI_BACKEND',
        action: 'AI_WORKFLOW_GENERATION_FAILED',
        status: 'FAILED',
        payload: {
          incident_type: payload.incident_type ?? null,
          summary: payload.summary ?? null,
          retrieval: payload.retrieval ?? null,
        },
      })
    } catch (logErr) {
      console.error('[Webhook] Failed to log AI error to audit_log:', logErr)
    }
    console.error('[Webhook] Python AI backend reported failure:', payload.summary)
    return NextResponse.json({ received: true, status: 'error_logged' }, { status: 200 })
  }

  // Validate as a workflow payload
  const parsed = WorkflowPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    console.error('[Webhook] Invalid workflow schema:', parsed.error.flatten())
    return NextResponse.json(
      { error: 'Invalid workflow schema', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  try {
    const incident = await initializeIncidentWorkflow(parsed.data)
    console.log(`[Webhook] Incident ${incident.id} created — ${parsed.data.steps.length} steps queued.`)
    return NextResponse.json(
      {
        success: true,
        incidentId: incident.id,
        title: parsed.data.title,
        severity: parsed.data.severity,
        stepsCount: parsed.data.steps.length,
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('[Webhook] Workflow initialization failed:', err)
    return NextResponse.json(
      { error: err.message || 'Workflow initialization failed' },
      { status: 500 }
    )
  }
}
