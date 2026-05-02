import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { description, isAnonymous, department } = await request.json()

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    
    let reporterName = "Employee_Portal"
    let reporterEmail = "Unknown"

    if (isAnonymous) {
      reporterName = "Anonymous_Reporter"
      reporterEmail = "REDACTED"
    } else if (session?.user) {
      reporterName = session.user.name || "Logged_in_User"
      reporterEmail = session.user.email || "Unknown"
    }

    // 1. Wrap the human text in a mock Wazuh JSON structure
    const mockWazuhPayload = {
      rule: {
        level: 12, // High enough severity to trigger the triage workflow
        description: "HUMAN_REPORTED_INCIDENT",
        id: "999999",
      },
      agent: {
        name: reporterName,
      },
      data: {
        human_description: description,
        department: department || "Unknown",
        reporter_email: reporterEmail,
        is_anonymous: isAnonymous,
      }
    }

    // 2. Forward to n8n Webhook
    const n8nUrl = process.env.N8N_WEBHOOK_URL
    if (!n8nUrl) {
      console.error('N8N_WEBHOOK_URL is not configured.')
      return NextResponse.json({ error: 'n8n integration not configured' }, { status: 500 })
    }

    console.log(`Forwarding human report to n8n: ${n8nUrl}`)
    
    // We await this one so we can tell the user if it succeeded
    const n8nResponse = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockWazuhPayload),
    })

    if (!n8nResponse.ok) {
      console.error('n8n rejected the human report payload')
      return NextResponse.json({ error: 'Failed to process report via AI triage' }, { status: 502 })
    }

    return NextResponse.json({ success: true, message: 'Report submitted successfully' }, { status: 200 })

  } catch (error) {
    console.error('Error in /api/report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
