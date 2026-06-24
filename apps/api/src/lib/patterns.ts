const HIGH_RISK_SYMPTOMS = ['Chest Pain', 'Shortness of Breath']
const RECURRING_WINDOW_DAYS = 7
const RECURRING_THRESHOLD = 3
const INACTIVITY_DAYS = 5

interface SymptomEntry {
  symptoms: string[]
  severity: number
  logged_at: string
}

export interface Pattern {
  type: string
  symptom?: string
  count?: number
  severity?: number
  message: string
}

export function detectPatterns(logs: SymptomEntry[]): Pattern[] {
  const patterns: Pattern[] = []

  const highRisk = logs.filter((l) => l.symptoms.some((s) => HIGH_RISK_SYMPTOMS.includes(s)))
  if (highRisk.length > 0) {
    patterns.push({ type: 'high_risk', message: `High-risk symptom logged: ${highRisk[0].symptoms.join(', ')}` })
  }

  const highSeverity = logs.filter((l) => l.severity === 5)
  if (highSeverity.length > 0) {
    patterns.push({ type: 'high_severity', severity: 5, message: 'Maximum severity (5) symptom logged' })
  }

  const cutoff = new Date(Date.now() - RECURRING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const recent = logs.filter((l) => new Date(l.logged_at) >= cutoff)
  const counts: Record<string, number> = {}
  recent.forEach((l) => l.symptoms.forEach((s) => { counts[s] = (counts[s] ?? 0) + 1 }))
  Object.entries(counts)
    .filter(([, count]) => count >= RECURRING_THRESHOLD)
    .forEach(([symptom, count]) => {
      patterns.push({ type: 'recurring', symptom, count, message: `${symptom} logged ${count} times in the last ${RECURRING_WINDOW_DAYS} days` })
    })

  const lastLog = logs[0]
  const daysSinceLastLog = lastLog
    ? (Date.now() - new Date(lastLog.logged_at).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity
  if (daysSinceLastLog > INACTIVITY_DAYS) {
    const days = isFinite(daysSinceLastLog) ? Math.floor(daysSinceLastLog) : '5+'
    patterns.push({ type: 'inactivity', message: `No symptoms logged in ${days} days` })
  }

  return patterns
}
