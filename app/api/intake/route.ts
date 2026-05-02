import { NextResponse } from 'next/server'
import crypto from 'crypto'

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

    // 4. Forward to n8n Webhook
    const n8nUrl = process.env.N8N_WEBHOOK_URL
    if (!n8nUrl) {
      console.error('N8N_WEBHOOK_URL is not configured.')
      // We still return 202 so Wazuh doesn't retry, but log the error
      return NextResponse.json({ error: 'n8n integration not configured' }, { status: 500 })
    }

    console.log(`Forwarding Wazuh alert to n8n: ${n8nUrl}`)
    
    // We don't await the fetch response directly to avoid holding up the Wazuh webhook,
    // but in serverless environments we should wait for it to finish.
    const n8nResponse = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: rawBody, // Forward the exact same JSON
    })

    if (!n8nResponse.ok) {
      console.error(`n8n webhook failed with status: ${n8nResponse.status}`)
      // Depending on requirements, we could return an error, but usually
      // webhook ingestion returns 202 Accepted regardless of downstream success.
    } else {
      console.log('Successfully forwarded to n8n.')
    }

    // 5. Return 202 Accepted back to Wazuh immediately
    return NextResponse.json({ message: 'Alert received and forwarded to n8n' }, { status: 202 })
    
  } catch (error) {
    console.error('Intake Route Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
