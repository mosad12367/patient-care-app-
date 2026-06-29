import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const cookieStore = cookies() as unknown as Awaited<ReturnType<typeof cookies>>
  const cookieMethods: CookieMethodsServer = {
    getAll() { return (cookieStore as { getAll: () => { name: string; value: string }[] }).getAll() },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) =>
        (cookieStore as { set: (name: string, value: string, options?: object) => void }).set(name, value, options)
      )
    },
  }
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods }
  )
}

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
