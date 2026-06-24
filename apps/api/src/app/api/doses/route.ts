import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const elderly_user_id = searchParams.get('elderly_user_id') ?? user.id

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('dose_logs')
    .select(`
      *,
      medication_schedule:medication_schedules(
        scheduled_time,
        medication:medications(name, dosage, elderly_user_id)
      )
    `)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const filtered = (data ?? []).filter(
    (d) => d.medication_schedule?.medication?.elderly_user_id === elderly_user_id
  )

  return NextResponse.json({ doses: filtered })
}
