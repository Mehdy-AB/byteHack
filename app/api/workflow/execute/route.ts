import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initializeIncidentWorkflow } from '@/lib/workflow/init'
import { WorkflowPayloadSchema } from '@/lib/workflow/schema'
import { waitUntil } from '@vercel/functions'

export const dynamic = 'force-dynamic'

function verifySecret(request: Request) {
  const secret = request.headers.get('x-workflow-secret')
  return secret === process.env.WORKFLOW_WEBHOOK_SECRET
}

export async function POST(request: Request) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const json = await request.json()

    const parsed = WorkflowPayloadSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid workflow payload', details: parsed.error.format() }, { status: 400 })
    }

    const payload = parsed.data
    const incident = await initializeIncidentWorkflow(payload)

    return NextResponse.json({ message: 'Workflow Accepted', incidentId: incident.id }, { status: 202 })
  } catch (error) {
    console.error('Workflow Execute Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
