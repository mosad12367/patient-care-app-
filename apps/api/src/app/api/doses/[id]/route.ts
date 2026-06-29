import { NextRequest, NextResponse } from 'next/server'
import { AcknowledgeDoseSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth()
  if (error) return error

  if (user.role !== 'elderly') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const parsed = AcknowledgeDoseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  // Verify this dose belongs to the authenticated elderly user
  const { data: existing } = await supabase
    .from('dose_logs')
    .select(`
      id,
      medication_schedule:medication_schedules!inner(
        medication:medications!inner(elderly_user_id)
      )
    `)
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const medData = (existing.medication_schedule as any)?.medication
  const medUserId = Array.isArray(medData) ? medData[0]?.elderly_user_id : medData?.elderly_user_id
  if (medUserId !== user.id) {
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
