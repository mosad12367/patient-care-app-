import { createSupabaseServerClient } from './supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@phc/shared'

export async function requireAuth(request: NextRequest): Promise<
  { user: User; error: null } | { user: null; error: NextResponse }
> {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return {
      user: null,
      error: NextResponse.json({ error: 'User profile not found' }, { status: 404 }),
    }
  }

  return { user: profile as User, error: null }
}
