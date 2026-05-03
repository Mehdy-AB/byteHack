import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { initializeIncidentWorkflow } from '@/lib/workflow/init'
import { WorkflowPayloadSchema } from '@/lib/workflow/schema'

export const dynamic = 'force-dynamic'

function verifySignature(payload: string, signature: string | null) {
  if (!signature) return false
  
  const secret = process.env.WAZUH_WEBHOOK_SECRET
  if (!secret) {
    console.warn('WAZUH_WEBHOOK_SECRET is not set, skipping signature verification.')
    return true // Fallback for development if secret is not configured
  }

  try {
    const hmac = crypto.createHmac('sha256', secret)
    const digest = 'sha256=' + hmac.update(payload).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

export async function POST(request: Request) {
  try {
    // 1. Read raw body for signature verification
    const rawBody = await request.text()
    
    // 2. Verify signature (e.g., X-Hub-Signature-256)
    const signature = request.headers.get('x-hub-signature-256')
    
    if (process.env.WAZUH_WEBHOOK_SECRET && !verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 })
    }

    // 3. Parse JSON
    let wazuhAlert
    try {
      wazuhAlert = JSON.parse(rawBody)
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    // 4. Send to AI for Analysis
    const backendUrl = process.env.BACKEND_API_URL
    if (!backendUrl) {
      console.error('BACKEND_API_URL is not configured.')
      return NextResponse.json({ error: 'AI Backend not configured' }, { status: 500 })
    }

    console.log(`Analyzing Wazuh alert via AI: ${backendUrl}/analyze`)
    
    const aiResponse = await fetch(`${backendUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wazuhAlert),
    })

    if (!aiResponse.ok) {
      console.error(`AI analysis failed with status: ${aiResponse.status}`)
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 502 })
    }

    const analysisData = await aiResponse.json()

    // 5. Initialize Workflow from AI Output
    // The AI backend returns an object containing a 'workflow' property
    if (analysisData.workflow) {
      console.log('AI generated a workflow. Initializing incident...')
      
      const parsedWorkflow = WorkflowPayloadSchema.safeParse(analysisData.workflow)
      if (parsedWorkflow.success) {
        const incident = await initializeIncidentWorkflow(parsedWorkflow.data)
        console.log(`Incident ${incident.id} successfully created and workflow started.`)
        
        return NextResponse.json({ 
          message: 'Alert processed and workflow initiated', 
          incidentId: incident.id 
        }, { status: 201 })
      } else {
        console.warn('AI generated an invalid workflow schema:', parsedWorkflow.error)
      }
    }

    // 6. Fallback or generic success if no workflow was generated
    return NextResponse.json({ message: 'Alert received but no automated workflow generated' }, { status: 202 })
    
  } catch (error: any) {
    console.error('Intake Route Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
