import { NextResponse } from 'next/server'
import { initializeIncidentWorkflow } from '@/lib/workflow/init'
import { WorkflowPayloadSchema } from '@/lib/workflow/schema'

export const dynamic = 'force-dynamic'

/**
 * Generic AI Processing Webhook
 * 
 * Flow: JSON Input -> AI Analysis -> Workflow Engine -> Persistence
 * 
 * This endpoint accepts raw JSON, sends it to the AI backend for playbook generation,
 * and then automatically initializes and executes the resulting SOAR workflow.
 */
export async function POST(request: Request) {
  try {
    const inputJson = await request.json()

    if (!inputJson) {
      return NextResponse.json({ error: 'No JSON payload provided' }, { status: 400 })
    }

    // 1. Forward to AI Analysis Engine
    const backendUrl = process.env.BACKEND_API_URL
    if (!backendUrl) {
      console.error('BACKEND_API_URL is not configured.')
      return NextResponse.json({ error: 'AI Backend not configured' }, { status: 500 })
    }

    console.log(`[Webhook] Sending payload to AI: ${backendUrl}/analyze`)
    
    const aiResponse = await fetch(`${backendUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inputJson),
    })

    if (!aiResponse.ok) {
      console.error(`[Webhook] AI analysis failed with status: ${aiResponse.status}`)
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 502 })
    }

    const analysisData = await aiResponse.json()

    // 2. Process AI recommended workflow
    if (analysisData.workflow) {
      console.log('[Webhook] AI recommended a workflow. Initializing SOAR engine...')
      
      const parsedWorkflow = WorkflowPayloadSchema.safeParse(analysisData.workflow)
      
      if (parsedWorkflow.success) {
        const incident = await initializeIncidentWorkflow(parsedWorkflow.data)
        console.log(`[Webhook] Incident ${incident.id} created and workflow started.`)
        
        return NextResponse.json({ 
          success: true,
          message: 'AI analyzed payload and initiated SOAR workflow', 
          incidentId: incident.id,
          analysis: {
            summary: analysisData.summary,
            type: analysisData.incident_type
          }
        }, { status: 201 })
      } else {
        console.error('[Webhook] AI generated an invalid workflow structure:', parsedWorkflow.error)
        return NextResponse.json({ 
          error: 'AI generated invalid workflow', 
          details: parsedWorkflow.error.format() 
        }, { status: 422 })
      }
    }

    // 3. Fallback if AI didn't recommend a workflow
    return NextResponse.json({ 
      success: true,
      message: 'AI analyzed the data but no automated actions were recommended.',
      analysis: {
        summary: analysisData.summary,
        type: analysisData.incident_type
      }
    }, { status: 200 })
    
  } catch (error: any) {
    console.error('[Webhook] Processing Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
