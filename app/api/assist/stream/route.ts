import { requireAuth } from '@/lib/auth'
import { assistApiUrl } from '@/lib/assist-api'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return Response.json({ error: auth.error }, { status: auth.status })

  let base: string
  try { base = assistApiUrl() } catch (e: any) {
    return Response.json({ error: e.message }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  searchParams.set('user_id', auth.user!.id)

  try {
    const res = await fetch(`${base}/assist/stream?${searchParams}`)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return Response.json(
        { error: `AI backend returned ${res.status}: ${text}` },
        { status: 502 }
      )
    }

    return new Response(res.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        Connection: 'keep-alive',
      },
    })
  } catch (err: any) {
    return Response.json(
      { error: `AI backend unreachable: ${err.message}` },
      { status: 502 }
    )
  }
}
