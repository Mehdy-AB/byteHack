import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { initializeIncidentWorkflow } from '@/lib/workflow/init'
import { WorkflowPayloadSchema } from '@/lib/workflow/schema'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await request.json()

    // Validate the workflow JSON matches our expected schema
    const parsed = WorkflowPayloadSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid workflow JSON', details: parsed.error.format() }, { status: 400 })
    }

    const incident = await initializeIncidentWorkflow(parsed.data)

    return NextResponse.json({ 
      success: true, 
      message: 'Workflow successfully initiated', 
      incidentId: incident.id 
    })

  } catch (error: any) {
    console.error('Error in /api/analyze/execute:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
