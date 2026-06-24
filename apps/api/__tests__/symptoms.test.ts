import { CreateSymptomLogSchema } from '@phc/shared'

describe('CreateSymptomLogSchema', () => {
  it('accepts valid symptom log', () => {
    const result = CreateSymptomLogSchema.safeParse({
      symptoms: ['Headache', 'Dizziness'],
      severity: 3,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty symptoms array', () => {
    const result = CreateSymptomLogSchema.safeParse({
      symptoms: [],
      severity: 3,
    })
    expect(result.success).toBe(false)
  })

  it('rejects severity out of range', () => {
    const result = CreateSymptomLogSchema.safeParse({
      symptoms: ['Headache'],
      severity: 6,
    })
    expect(result.success).toBe(false)
  })

  it('accepts log with voice note URL', () => {
    const result = CreateSymptomLogSchema.safeParse({
      symptoms: ['Fatigue'],
      severity: 2,
      voice_note_url: 'https://example.supabase.co/storage/v1/object/sign/voice/abc.m4a',
    })
    expect(result.success).toBe(true)
  })
})
