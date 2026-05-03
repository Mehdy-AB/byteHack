import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function chunk(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const encoder = new TextEncoder()

  async function queryRecentEvents() {
    // Only fetch events from the last 1 minute to keep it lightweight
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
    
    const { data: events } = await supabase
      .from('audit_log')
      .select('id, action, status, created_at')
      .eq('action', 'WEBHOOK_RECEIVED')
      .gt('created_at', oneMinuteAgo)
      .order('created_at', { ascending: false })
      .limit(5)

    return events || []
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
          const events = await queryRecentEvents()
          send('events', { events })
        } catch {}
      }

      await poll()

      const pollTimer = setInterval(poll, 3000)
      const heartbeatTimer = setInterval(() => send('heartbeat', null), 20000)

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
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
