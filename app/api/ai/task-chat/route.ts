import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return Response.json({ error: authResult.error }, { status: authResult.status })
  }

  const webhookUrl = process.env.AI_CHAT_WEBHOOK_URL
  if (!webhookUrl) {
    return Response.json({ error: 'AI_CHAT_WEBHOOK_URL is not configured' }, { status: 503 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { messages, task } = body
  if (!task || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Missing task or messages' }, { status: 400 })
  }

  const slaLine = task.sla_expires_at
    ? `- SLA Deadline: ${new Date(task.sla_expires_at).toLocaleString('en-GB')}`
    : ''
  const confidenceLine = task.context?.ai_confidence != null
    ? `- AI Triage Confidence: ${(task.context.ai_confidence * 100).toFixed(1)}%`
    : ''

  const systemPrompt = `You are an expert SOAR (Security Orchestration, Automation, and Response) analyst AI embedded in the Silent Fracture SOAR platform. You are assisting a security analyst with a specific pending workflow step.

CURRENT WORKFLOW STEP CONTEXT:
- Incident: ${task.incident_title}
- Incident ID: ${task.incident_id}
- Step Type: ${task.type.replace(/_/g, ' ')}
- Step Status: ${task.status}
- Assigned Role: ${task.assigned_role?.replace(/_/g, ' ') || 'Unassigned'}
- Severity: ${task.context?.severity || 'Unknown'}
- Source System: ${task.context?.source || 'Unknown'}
${task.context?.playbook_id ? `- Playbook: ${task.context.playbook_id}` : ''}
${confidenceLine}
${task.message ? `- Step Message: ${task.message}` : ''}
${slaLine}

INSTRUCTIONS:
- Provide concise, actionable, expert-level security guidance specific to this step and incident.
- Use markdown formatting: **bold** for key terms, bullet lists for steps, code blocks for commands.
- When you have a concrete solution or clear recommendation ready, include the marker "**PROPOSED SOLUTION:**" on its own line before presenting it — this lets the analyst accept and queue it.
- Be direct. Avoid generic advice. Reference the specific incident, step type, and context above.
- If the user asks to improve a previous solution, refine it and again use "**PROPOSED SOLUTION:**" to present the improved version.`

  const apiMessages = messages
    .filter((m: any) => m.role === 'user' || m.role === 'assistant')
    .map((m: any) => ({ role: m.role, content: m.content }))

  let webhookRes: Response
  try {
    webhookRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages, system: systemPrompt, task }),
    })
  } catch (err: any) {
    return Response.json({ error: `Webhook unreachable: ${err.message}` }, { status: 502 })
  }

  if (!webhookRes.ok) {
    const errText = await webhookRes.text().catch(() => '')
    return Response.json({ error: `Webhook error ${webhookRes.status}: ${errText}` }, { status: 502 })
  }

  const contentType = webhookRes.headers.get('content-type') || ''

  // Streaming response — pass through directly
  if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
    return new Response(webhookRes.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  // JSON response — extract message text and stream it as plain text
  const json = await webhookRes.json().catch(() => null)
  const text: string =
    json?.response ?? json?.message ?? json?.content ?? json?.text ?? json?.reply ??
    (typeof json?.choices?.[0]?.message?.content === 'string' ? json.choices[0].message.content : null) ??
    JSON.stringify(json)

  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  })
}
