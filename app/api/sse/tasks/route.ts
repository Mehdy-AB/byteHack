import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function chunk(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(req: Request) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { profile, user } = authResult
  const supabase = await createClient()
  const encoder = new TextEncoder()

  async function queryTasks() {
    const { data: steps } = await supabase
      .from('incident_steps')
      .select('id, step_type, status, assigned_role, result, incident_id, incidents(id, raw_input, severity, source)')
      .in('status', ['PENDING', 'WAITING_APPROVAL'])

    return (steps || []).filter((step: any) => {
      const assignedRole = step.result?.assignedRole || step.assigned_role
      const assignedUser  = step.result?.assignedUser
      if (assignedUser)  return assignedUser === user.id
      if (assignedRole)  return assignedRole === profile.role
      return true
    }).map((step: any) => {
      const payload  = step.result || {}
      const incident = step.incidents || {}
      return {
        id:             step.id,
        incident_title: incident.raw_input?.title || 'Unnamed Incident',
        type:           step.step_type,
        severity:       incident.severity || 'MEDIUM',
        message:        payload.catalogue || payload.message || null,
        status:         step.status,
        requested_at:   step.created_at ?? null,
      }
    })
  }

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false

      const send = (event: string, data: unknown) => {
        if (closed) return
        try { controller.enqueue(encoder.encode(chunk(event, data))) } catch {}
      }

      async function poll() {
        try {
          const tasks = await queryTasks()
          send('tasks', { tasks })
        } catch {}
      }

      // Immediate snapshot on connect so client hydrates right away
      await poll()

      // Poll every 3 s — fast enough to feel instant, no server-side WS needed
      const pollTimer      = setInterval(poll, 3_000)
      const heartbeatTimer = setInterval(() => send('heartbeat', null), 20_000)

      req.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(pollTimer)
        clearInterval(heartbeatTimer)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':    'text/event-stream',
      'Cache-Control':   'no-cache, no-transform',
      'Connection':      'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
