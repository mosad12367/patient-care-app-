import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { hasAccessToPatient } from '@/lib/relationships'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { detectPatterns } from '@/lib/patterns'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const elderly_user_id = searchParams.get('elderly_user_id') ?? user.id

  const allowed = await hasAccessToPatient(user.id, user.role, elderly_user_id)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: logs, error: dbError } = await supabase
    .from('symptom_logs')
    .select('symptoms, severity, logged_at')
    .eq('elderly_user_id', elderly_user_id)
    .gte('logged_at', thirtyDaysAgo)
    .order('logged_at', { ascending: false })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const patterns = detectPatterns(logs ?? [])

  return NextResponse.json({ patterns })
}
