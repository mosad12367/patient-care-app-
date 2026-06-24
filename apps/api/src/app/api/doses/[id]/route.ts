import { NextRequest, NextResponse } from 'next/server'
import { AcknowledgeDoseSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { hasAccessToPatient } from '@/lib/relationships'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const parsed = AcknowledgeDoseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from('dose_logs')
    .select(`
      id,
      medication_schedule:medication_schedules(
        medication:medications(elderly_user_id)
      )
    `)
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const elderlyUserId = existing.medication_schedule?.medication?.elderly_user_id
  if (!elderlyUserId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const allowed = await hasAccessToPatient(user.id, user.role, elderlyUserId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error: dbError } = await supabase
    .from('dose_logs')
    .update({
      status: parsed.data.status,
      taken_at: parsed.data.status === 'taken' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ dose: data })
}
