import { NextRequest, NextResponse } from 'next/server'
import { UpdateMedicationSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { hasAccessToPatient } from '@/lib/relationships'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (user.role !== 'caregiver') {
    return NextResponse.json({ error: 'Only caregivers can update medications' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createSupabaseServerClient()

  const { data: medication } = await supabase
    .from('medications')
    .select('elderly_user_id')
    .eq('id', id)
    .single()

  if (!medication) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const allowed = await hasAccessToPatient(user.id, user.role, medication.elderly_user_id)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = UpdateMedicationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error: dbError } = await supabase
    .from('medications')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ medication: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (user.role !== 'caregiver') {
    return NextResponse.json({ error: 'Only caregivers can delete medications' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createSupabaseServerClient()

  const { data: medication } = await supabase
    .from('medications')
    .select('elderly_user_id')
    .eq('id', id)
    .single()

  if (!medication) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const allowed = await hasAccessToPatient(user.id, user.role, medication.elderly_user_id)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: dbError } = await supabase
    .from('medications')
    .delete()
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
