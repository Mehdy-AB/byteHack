import { requireAuth } from '@/lib/auth'
import { assistApiUrl } from '@/lib/assist-api'

export const dynamic = 'force-dynamic'

function getBase() {
  try { return { base: assistApiUrl(), err: null } }
  catch (e: any) { return { base: null, err: e.message as string } }
}

/** List all sessions for the authenticated user, newest first */
export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return Response.json({ error: auth.error }, { status: auth.status })

  const { base, err } = getBase()
  if (!base) return Response.json({ error: err }, { status: 503 })

  try {
    const res = await fetch(`${base}/assist/sessions?user_id=${auth.user!.id}`)
    return Response.json(await res.json(), { status: res.status })
  } catch (e: any) {
    return Response.json({ error: `AI backend unreachable: ${e.message}` }, { status: 502 })
  }
}

/** Create a session before the first message (optional — stream auto-creates too) */
export async function POST(req: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return Response.json({ error: auth.error }, { status: auth.status })

  const { base, err } = getBase()
  if (!base) return Response.json({ error: err }, { status: 503 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {}
  body.user_id = auth.user!.id

  try {
    const res = await fetch(`${base}/assist/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return Response.json(await res.json(), { status: res.status })
  } catch (e: any) {
    return Response.json({ error: `AI backend unreachable: ${e.message}` }, { status: 502 })
  }
}
