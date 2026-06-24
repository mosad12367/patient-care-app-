import { detectPatterns } from '../src/lib/patterns'

describe('detectPatterns — high_risk', () => {
  it('flags Chest Pain', () => {
    const now = new Date().toISOString()
    const result = detectPatterns([{ symptoms: ['Chest Pain'], severity: 3, logged_at: now }])
    expect(result.some((p) => p.type === 'high_risk')).toBe(true)
  })

  it('does not flag ordinary symptoms', () => {
    const now = new Date().toISOString()
    const result = detectPatterns([{ symptoms: ['Headache'], severity: 2, logged_at: now }])
    expect(result.some((p) => p.type === 'high_risk')).toBe(false)
  })
})

describe('detectPatterns — high_severity', () => {
  it('flags severity 5', () => {
    const now = new Date().toISOString()
    const result = detectPatterns([{ symptoms: ['Pain'], severity: 5, logged_at: now }])
    expect(result.some((p) => p.type === 'high_severity')).toBe(true)
  })

  it('does not flag severity 4', () => {
    const now = new Date().toISOString()
    const result = detectPatterns([{ symptoms: ['Pain'], severity: 4, logged_at: now }])
    expect(result.some((p) => p.type === 'high_severity')).toBe(false)
  })
})

describe('detectPatterns — recurring', () => {
  it('flags symptom appearing 3+ times in 7 days', () => {
    const now = new Date().toISOString()
    const logs = [
      { symptoms: ['Headache'], severity: 2, logged_at: now },
      { symptoms: ['Headache'], severity: 3, logged_at: now },
      { symptoms: ['Headache'], severity: 2, logged_at: now },
    ]
    const result = detectPatterns(logs)
    const recurring = result.filter((p) => p.type === 'recurring')
    expect(recurring).toHaveLength(1)
    expect(recurring[0].symptom).toBe('Headache')
  })

  it('does not flag symptom appearing only twice', () => {
    const now = new Date().toISOString()
    const logs = [
      { symptoms: ['Dizziness'], severity: 2, logged_at: now },
      { symptoms: ['Dizziness'], severity: 1, logged_at: now },
    ]
    const result = detectPatterns(logs)
    expect(result.some((p) => p.type === 'recurring')).toBe(false)
  })
})
