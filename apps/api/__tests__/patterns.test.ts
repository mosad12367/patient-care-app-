// Tests the pattern detection logic (pure functions, no DB)

interface SymptomEntry {
  symptoms: string[]
  severity: number
  logged_at: string
}

function detectRecurringSymptoms(logs: SymptomEntry[], windowDays: number, threshold: number) {
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  const recent = logs.filter((l) => new Date(l.logged_at) >= cutoff)
  const counts: Record<string, number> = {}
  recent.forEach((l) => l.symptoms.forEach((s) => { counts[s] = (counts[s] ?? 0) + 1 }))
  return Object.entries(counts)
    .filter(([, count]) => count >= threshold)
    .map(([symptom, count]) => ({ symptom, count }))
}

function detectHighRisk(logs: SymptomEntry[]) {
  const HIGH_RISK = ['Chest Pain', 'Shortness of Breath']
  return logs.some((l) => l.symptoms.some((s) => HIGH_RISK.includes(s)))
}

function detectHighSeverity(logs: SymptomEntry[]) {
  return logs.some((l) => l.severity === 5)
}

describe('detectRecurringSymptoms', () => {
  it('flags symptom appearing 3+ times in 7 days', () => {
    const now = new Date().toISOString()
    const logs: SymptomEntry[] = [
      { symptoms: ['Headache'], severity: 2, logged_at: now },
      { symptoms: ['Headache'], severity: 3, logged_at: now },
      { symptoms: ['Headache'], severity: 2, logged_at: now },
    ]
    const result = detectRecurringSymptoms(logs, 7, 3)
    expect(result).toHaveLength(1)
    expect(result[0].symptom).toBe('Headache')
  })

  it('does not flag symptom appearing only twice', () => {
    const now = new Date().toISOString()
    const logs: SymptomEntry[] = [
      { symptoms: ['Dizziness'], severity: 2, logged_at: now },
      { symptoms: ['Dizziness'], severity: 1, logged_at: now },
    ]
    const result = detectRecurringSymptoms(logs, 7, 3)
    expect(result).toHaveLength(0)
  })
})

describe('detectHighRisk', () => {
  it('flags chest pain', () => {
    const logs: SymptomEntry[] = [{ symptoms: ['Chest Pain'], severity: 4, logged_at: new Date().toISOString() }]
    expect(detectHighRisk(logs)).toBe(true)
  })

  it('does not flag ordinary symptoms', () => {
    const logs: SymptomEntry[] = [{ symptoms: ['Headache'], severity: 2, logged_at: new Date().toISOString() }]
    expect(detectHighRisk(logs)).toBe(false)
  })
})

describe('detectHighSeverity', () => {
  it('flags severity 5', () => {
    const logs: SymptomEntry[] = [{ symptoms: ['Pain'], severity: 5, logged_at: new Date().toISOString() }]
    expect(detectHighSeverity(logs)).toBe(true)
  })

  it('does not flag severity 4', () => {
    const logs: SymptomEntry[] = [{ symptoms: ['Pain'], severity: 4, logged_at: new Date().toISOString() }]
    expect(detectHighSeverity(logs)).toBe(false)
  })
})
