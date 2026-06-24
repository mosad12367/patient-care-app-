import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { hasAccessToPatient } from '@/lib/relationships'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (user.role !== 'caregiver') {
    return NextResponse.json({ error: 'Only caregivers can delete schedules' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createSupabaseServerClient()

  const { data: schedule } = await supabase
    .from('medication_schedules')
    .select(`medication:medications(elderly_user_id)`)
    .eq('id', id)
    .single()

  if (!schedule) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const allowed = await hasAccessToPatient(user.id, user.role, schedule.medication?.elderly_user_id ?? '')
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: dbError } = await supabase
    .from('medication_schedules')
    .delete()
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
