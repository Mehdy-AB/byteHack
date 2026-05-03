import { requireAuth } from '@/lib/auth'
import { assistApiUrl } from '@/lib/assist-api'

function getBase() {
  try { return { base: assistApiUrl(), err: null } }
  catch (e: any) { return { base: null, err: e.message as string } }
}

/** Load a session with its full message history */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth()
  if ('error' in auth) return Response.json({ error: auth.error }, { status: auth.status })

  const { base, err } = getBase()
  if (!base) return Response.json({ error: err }, { status: 503 })

  try {
    const res = await fetch(`${base}/assist/sessions/${id}`)
    return Response.json(await res.json(), { status: res.status })
  } catch (e: any) {
    return Response.json({ error: `AI backend unreachable: ${e.message}` }, { status: 502 })
  }
}

/** Rename a session */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth()
  if ('error' in auth) return Response.json({ error: auth.error }, { status: auth.status })

  const { base, err } = getBase()
  if (!base) return Response.json({ error: err }, { status: 503 })

  const body = await req.json().catch(() => ({}))

  try {
    const res = await fetch(`${base}/assist/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return Response.json(await res.json(), { status: res.status })
  } catch (e: any) {
    return Response.json({ error: `AI backend unreachable: ${e.message}` }, { status: 502 })
  }
}

/** Delete a session (backend removes from Supabase and clears in-memory history) */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth()
  if ('error' in auth) return Response.json({ error: auth.error }, { status: auth.status })

  const { base, err } = getBase()
  if (!base) return Response.json({ error: err }, { status: 503 })

  try {
    await fetch(`${base}/assist/sessions/${id}`, { method: 'DELETE' })
  } catch {
    // best-effort
  }

  return new Response(null, { status: 204 })
}
