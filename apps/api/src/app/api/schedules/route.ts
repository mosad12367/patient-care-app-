import { NextRequest, NextResponse } from 'next/server'
import { CreateScheduleSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { hasAccessToPatient } from '@/lib/relationships'

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (user.role !== 'caregiver') {
    return NextResponse.json({ error: 'Only caregivers can create schedules' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateScheduleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  const { data: medication } = await supabase
    .from('medications')
    .select('elderly_user_id')
    .eq('id', parsed.data.medication_id)
    .single()

  if (!medication) {
    return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
  }

  const allowed = await hasAccessToPatient(user.id, user.role, medication.elderly_user_id)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error: dbError } = await supabase
    .from('medication_schedules')
    .insert(parsed.data)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ schedule: data }, { status: 201 })
}
