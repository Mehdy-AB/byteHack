import { requireAuth } from '@/lib/auth'
import { assistApiUrl } from '@/lib/assist-api'

export const dynamic = 'force-dynamic'

// Per-task session memory — keeps multi-turn context alive within the server process.
// Keyed by task.id so each workflow step gets its own conversation.
const taskSessions = new Map<string, string>()

export async function POST(req: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return Response.json({ error: auth.error }, { status: auth.status })

  let body: any
  try { body = await req.json() } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { messages, task } = body
  if (!task || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Missing task or messages' }, { status: 400 })
  }

  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')
  if (!lastUserMsg) return Response.json({ error: 'No user message found' }, { status: 400 })

  let base: string
  try { base = assistApiUrl() } catch (e: any) {
    return Response.json({ error: e.message }, { status: 503 })
  }

  const existingSession = taskSessions.get(task.id)
  const isFirstTurn = !existingSession

  const params = new URLSearchParams({
    message: lastUserMsg.content,
    user_id: auth.user!.id,
    user_role: task.assigned_role || 'SOC_ANALYST',
  })

  if (existingSession) {
    params.set('session_id', existingSession)
  } else {
    params.set('task_context', buildTaskContext(task))
    if (task.context?.severity) {
      params.set('suspected_attack', task.context.severity.toLowerCase())
    }
  }

  let assistRes: Response
  try {
    assistRes = await fetch(`${base}/assist/stream?${params}`)
  } catch (err: any) {
    return Response.json({ error: `AI backend unreachable: ${err.message}` }, { status: 502 })
  }

  if (!assistRes.ok) {
    const errText = await assistRes.text().catch(() => '')
    return Response.json(
      { error: `AI backend error ${assistRes.status}: ${errText}` },
      { status: 502 }
    )
  }

  // Consume the full SSE stream server-side and extract the plain text reply.
  // AIHelpPanel gets one complete chunk instead of token-by-token streaming.
  const reader = assistRes.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let currentEvent = ''
  let fullReply = ''

  try {
    outer: while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') break outer

          if (currentEvent === 'meta') {
            try {
              const parsed = JSON.parse(data)
              if (parsed.session_id && isFirstTurn) {
                taskSessions.set(task.id, parsed.session_id)
              }
            } catch {}
          } else if (currentEvent !== 'error') {
            fullReply += data.replace(/\\n/g, '\n')
          }
          currentEvent = ''
        } else if (line === '') {
          currentEvent = ''
        }
      }
    }
  } catch { /* client disconnected */ }

  const reply = fullReply ||
    '⚠ The AI returned an empty response. Security content may have triggered a safety filter — try rephrasing.'

  return new Response(reply, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}

function buildTaskContext(task: any): string {
  const lines = [
    `# SYSTEM INSTRUCTION`,
    `You are an expert Cybersecurity Analyst and SOAR Engineer. Your goal is to help the user resolve a specific workflow step.`,
    `When providing solutions, follow this format:`,
    `1. Briefly explain the security context of the detection.`,
    `2. Evaluate the severity and impact.`,
    `3. Provide an 'Improved Step Message' that is clear and actionable.`,
    `4. Suggest execution parameters or mitigation steps.`,
    `Use rich markdown: ### for headers, > [!IMPORTANT] for critical alerts, and code blocks for technical details.`,
    `If a refined solution is ready, include the text 'PROPOSED SOLUTION' in your response.`,
    ``,
    `# TASK PAYLOAD`,
    `Incident: ${task.incident_title}`,
    `Incident ID: ${task.incident_id}`,
    `Step Type: ${task.type?.replace(/_/g, ' ')}`,
    `Step Status: ${task.status}`,
    `Assigned Role: ${task.assigned_role?.replace(/_/g, ' ') || 'Unassigned'}`,
    `Severity: ${task.context?.severity || 'Unknown'}`,
    `Source: ${task.context?.source || 'Unknown'}`,
  ]
  if (task.context?.playbook_id) lines.push(`Playbook: ${task.context.playbook_id}`)
  if (task.context?.ai_confidence != null) {
    lines.push(`AI Confidence: ${(task.context.ai_confidence * 100).toFixed(1)}%`)
  }
  if (task.message) lines.push(`Step Message: ${task.message}`)
  if (task.sla_expires_at) {
    lines.push(`SLA Deadline: ${new Date(task.sla_expires_at).toLocaleString('en-GB')}`)
  }
  return lines.join('\n')
}
