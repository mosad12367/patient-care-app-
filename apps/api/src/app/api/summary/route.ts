import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { hasAccessToPatient } from '@/lib/relationships'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { renderToBuffer } from '@react-pdf/renderer'
import { HealthSummaryPdf } from '@/lib/pdf'
import { detectPatterns } from '@/lib/patterns'
import React from 'react'

const PERIOD_DAYS = 30

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const elderly_user_id = searchParams.get('elderly_user_id') ?? user.id

  const allowed = await hasAccessToPatient(user.id, user.role, elderly_user_id)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  const since = new Date(Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Fetch elderly user profile
  const { data: elderlyUser } = await supabase
    .from('users')
    .select('name')
    .eq('id', elderly_user_id)
    .single()

  // Fetch medications
  const { data: medications } = await supabase
    .from('medications')
    .select('name, dosage, frequency')
    .eq('elderly_user_id', elderly_user_id)

  // Fetch dose stats using !inner join to filter by elderly_user_id
  const { data: doses } = await supabase
    .from('dose_logs')
    .select(`
      status,
      medication_schedule:medication_schedules!inner(
        medication:medications!inner(elderly_user_id)
      )
    `)
    .eq('medication_schedule.medication.elderly_user_id', elderly_user_id)
    .gte('scheduled_at', since)

  const totalDoses = (doses ?? []).length
  const missedDoses = (doses ?? []).filter((d) => d.status === 'missed').length

  // Fetch symptom logs for stats and pattern detection
  const { data: symptoms } = await supabase
    .from('symptom_logs')
    .select('symptoms, severity, logged_at')
    .eq('elderly_user_id', elderly_user_id)
    .gte('logged_at', since)
    .order('logged_at', { ascending: false })

  const symptomCounts: Record<string, { count: number; totalSeverity: number }> = {}
  ;(symptoms ?? []).forEach((s) => {
    s.symptoms.forEach((sym: string) => {
      if (!symptomCounts[sym]) symptomCounts[sym] = { count: 0, totalSeverity: 0 }
      symptomCounts[sym].count += 1
      symptomCounts[sym].totalSeverity += s.severity
    })
  })

  // Detect patterns directly (no internal HTTP fetch)
  const patterns = detectPatterns(symptoms ?? [])

  const summaryData = {
    elderlyName: elderlyUser?.name ?? 'Patient',
    generatedAt: new Date().toLocaleDateString('en-GB'),
    periodDays: PERIOD_DAYS,
    totalDoses,
    missedDoses,
    medications: medications ?? [],
    symptomCounts: Object.entries(symptomCounts).map(([symptom, { count, totalSeverity }]) => ({
      symptom,
      count,
      avgSeverity: totalSeverity / count,
    })),
    patterns,
  }

  const pdfBuffer = await renderToBuffer(React.createElement(HealthSummaryPdf, { data: summaryData }))

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="health-summary-${elderly_user_id}.pdf"`,
    },
  })
}
