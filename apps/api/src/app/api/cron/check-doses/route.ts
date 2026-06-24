import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendPushNotification } from '@/lib/push'
import { sendSms } from '@/lib/sms'

const THIRTY_MIN_MS = 30 * 60 * 1000
const SIXTY_MIN_MS = 60 * 60 * 1000

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()
  const now = new Date()

  const { data: pendingDoses, error } = await supabase
    .from('dose_logs')
    .select(`
      id, scheduled_at, sms_sent,
      medication_schedule:medication_schedules(
        medication:medications(
          name,
          elderly_user:users!medications_elderly_user_id_fkey(id, name, phone),
          caregiver_relationships:relationships(
            connected_user:users!relationships_connected_user_id_fkey(id),
            status
          )
        )
      )
    `)
    .eq('status', 'pending')
    .lt('scheduled_at', now.toISOString())

  if (error) {
    console.error('Cron error fetching pending doses:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  for (const dose of pendingDoses ?? []) {
    try {
      const med = dose.medication_schedule?.medication
      if (!med) continue

      const elderlyUser = med.elderly_user
      const msSinceScheduled = now.getTime() - new Date(dose.scheduled_at).getTime()
      const medicationName = med.name

      await sendPushNotification(
        elderlyUser.id,
        'Medication Reminder',
        `Time to take your ${medicationName}. Tap to confirm.`,
        { dose_id: dose.id, screen: 'medicines' }
      )

      if (msSinceScheduled > THIRTY_MIN_MS && !dose.sms_sent && elderlyUser.phone) {
        await sendSms(
          elderlyUser.phone,
          `Reminder: Please take your ${medicationName}. Open the Health Companion app to confirm.`
        )
        await supabase.from('dose_logs').update({ sms_sent: true }).eq('id', dose.id)
      }

      if (msSinceScheduled > SIXTY_MIN_MS) {
        const caregiverRelationships = med.caregiver_relationships ?? []
        for (const rel of caregiverRelationships) {
          if (!rel.connected_user || rel.status !== 'accepted') continue
          await sendPushNotification(
            rel.connected_user.id,
            'Missed Dose Alert',
            `${elderlyUser.name} has not taken their ${medicationName}.`,
            { elderly_user_id: elderlyUser.id, screen: 'dashboard' }
          )
        }
      }
    } catch (doseError) {
      console.error(`Failed to process dose ${dose.id}:`, doseError)
    }
  }

  return NextResponse.json({ processed: pendingDoses?.length ?? 0 })
}
