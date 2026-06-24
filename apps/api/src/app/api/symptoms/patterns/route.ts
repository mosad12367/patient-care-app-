import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { hasAccessToPatient } from '@/lib/relationships'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const HIGH_RISK_SYMPTOMS = ['Chest Pain', 'Shortness of Breath']
const RECURRING_WINDOW_DAYS = 7
const RECURRING_THRESHOLD = 3
const INACTIVITY_DAYS = 5

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
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: logs, error: dbError } = await supabase
    .from('symptom_logs')
    .select('symptoms, severity, logged_at')
    .eq('elderly_user_id', elderly_user_id)
    .gte('logged_at', thirtyDaysAgo)
    .order('logged_at', { ascending: false })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const patterns: Array<{ type: string; symptom?: string; count?: number; severity?: number; message: string }> = []

  // Pattern 1: high-risk symptoms
  const highRisk = (logs ?? []).filter((l) =>
    l.symptoms.some((s: string) => HIGH_RISK_SYMPTOMS.includes(s))
  )
  if (highRisk.length > 0) {
    patterns.push({
      type: 'high_risk',
      message: `High-risk symptom logged: ${highRisk[0].symptoms.join(', ')}`,
    })
  }

  // Pattern 2: severity 5
  const highSeverity = (logs ?? []).filter((l) => l.severity === 5)
  if (highSeverity.length > 0) {
    patterns.push({ type: 'high_severity', severity: 5, message: 'Maximum severity (5) symptom logged' })
  }

  // Pattern 3: recurring symptoms (3+ in 7 days)
  const cutoff = new Date(Date.now() - RECURRING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const recent = (logs ?? []).filter((l) => new Date(l.logged_at) >= cutoff)
  const counts: Record<string, number> = {}
  recent.forEach((l) => l.symptoms.forEach((s: string) => { counts[s] = (counts[s] ?? 0) + 1 }))
  Object.entries(counts)
    .filter(([, count]) => count >= RECURRING_THRESHOLD)
    .forEach(([symptom, count]) => {
      patterns.push({
        type: 'recurring',
        symptom,
        count,
        message: `${symptom} logged ${count} times in the last ${RECURRING_WINDOW_DAYS} days`,
      })
    })

  // Pattern 4: inactivity
  const lastLog = logs?.[0]
  const daysSinceLastLog = lastLog
    ? (Date.now() - new Date(lastLog.logged_at).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity
  if (daysSinceLastLog > INACTIVITY_DAYS) {
    patterns.push({
      type: 'inactivity',
      message: `No symptoms logged in ${Math.floor(daysSinceLastLog)} days`,
    })
  }

  return NextResponse.json({ patterns })
}
