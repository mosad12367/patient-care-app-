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
      id, scheduled_at, sms_sent, push_sent,
      medication_schedule:medication_schedules(
        medication:medications(
          name,
          elderly_user:users!medications_elderly_user_id_fkey(id, name, phone),
          caregiver_relationships:relationships(
            connected_user:users!relationships_connected_user_id_fkey(id),
            status,
            role
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const schedData = dose.medication_schedule as any
      const sched = Array.isArray(schedData) ? schedData[0] : schedData
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const medData = sched?.medication as any
      const med = Array.isArray(medData) ? medData[0] : medData
      if (!med) continue

      const elderlyUserRaw = med.elderly_user
      const elderlyUser = Array.isArray(elderlyUserRaw) ? elderlyUserRaw[0] : elderlyUserRaw
      const msSinceScheduled = now.getTime() - new Date(dose.scheduled_at).getTime()
      const medicationName = med.name

      // Only send initial push once
      if (!dose.push_sent) {
        await sendPushNotification(
          elderlyUser.id,
          'Medication Reminder',
          `Time to take your ${medicationName}. Tap to confirm.`,
          { dose_id: dose.id, screen: 'medicines' }
        )
        await supabase.from('dose_logs').update({ push_sent: true }).eq('id', dose.id)
      }

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
          const connectedUser = Array.isArray(rel.connected_user) ? rel.connected_user[0] : rel.connected_user
          if (!connectedUser || rel.status !== 'accepted' || rel.role !== 'caregiver') continue
          await sendPushNotification(
            connectedUser.id,
            'Missed Dose Alert',
            `${elderlyUser.name} has not taken their ${medicationName}.`,
            { elderly_user_id: elderlyUser.id, screen: 'dashboard' }
          )
        }
        await supabase.from('dose_logs').update({ status: 'missed' }).eq('id', dose.id)
      }
    } catch (doseError) {
      console.error(`Failed to process dose ${dose.id}:`, doseError)
    }
  }

  return NextResponse.json({ processed: pendingDoses?.length ?? 0 })
}
