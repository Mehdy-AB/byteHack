import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-side client using service role key — bypasses RLS.
// Authorization is enforced at the API/action layer via requireAuth().
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
