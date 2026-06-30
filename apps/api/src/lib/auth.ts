import { createSupabaseServerClient, createSupabaseAdminClient } from './supabase-server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import type { User } from '@phc/shared'

export async function requireAuth(): Promise<
  { user: User; error: null } | { user: null; error: NextResponse }
> {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  let userId: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const admin = createSupabaseAdminClient()
    const { data: { user } } = await admin.auth.getUser(token)
    if (user) userId = user.id
  }

  if (!userId) {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) userId = user.id
  }

  if (!userId) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const admin = createSupabaseAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) {
    return {
      user: null,
      error: NextResponse.json({ error: 'User profile not found' }, { status: 404 }),
    }
  }

  return { user: profile as User, error: null }
}
