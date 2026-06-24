import { NextRequest, NextResponse } from 'next/server'
import { CreateSymptomLogSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const elderly_user_id = searchParams.get('elderly_user_id') ?? user.id
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100)

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('symptom_logs')
    .select('*')
    .eq('elderly_user_id', elderly_user_id)
    .order('logged_at', { ascending: false })
    .limit(limit)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ symptoms: data })
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (user.role !== 'elderly') {
    return NextResponse.json({ error: 'Only elderly users can log symptoms' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateSymptomLogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('symptom_logs')
    .insert({
      elderly_user_id: user.id,
      symptoms: parsed.data.symptoms,
      severity: parsed.data.severity,
      voice_note_url: parsed.data.voice_note_url ?? null,
      text_note: parsed.data.text_note ?? null,
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ symptom: data }, { status: 201 })
}
