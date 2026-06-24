import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { hasAccessToPatient } from '@/lib/relationships'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const elderly_user_id = searchParams.get('elderly_user_id') ?? user.id

  const allowed = await hasAccessToPatient(user.id, user.role, elderly_user_id)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('dose_logs')
    .select(`
      *,
      medication_schedule:medication_schedules!inner(
        scheduled_time,
        medication:medications!inner(
          name, dosage, elderly_user_id
        )
      )
    `)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())
    .eq('medication_schedule.medication.elderly_user_id', elderly_user_id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ doses: data ?? [] })
}
