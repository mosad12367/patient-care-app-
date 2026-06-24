import { NextRequest, NextResponse } from 'next/server'
import { CreateMedicationSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const elderly_user_id = searchParams.get('elderly_user_id') ?? user.id

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('medications')
    .select('*, medication_schedules(*)')
    .eq('elderly_user_id', elderly_user_id)
    .order('created_at', { ascending: false })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ medications: data })
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (user.role !== 'caregiver') {
    return NextResponse.json({ error: 'Only caregivers can add medications' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateMedicationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('medications')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ medication: data }, { status: 201 })
}
