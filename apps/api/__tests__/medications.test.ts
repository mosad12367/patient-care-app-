import { CreateMedicationSchema } from '@phc/shared'

describe('CreateMedicationSchema', () => {
  it('accepts valid medication', () => {
    const result = CreateMedicationSchema.safeParse({
      elderly_user_id: '00000000-0000-0000-0000-000000000001',
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'twice daily',
      start_date: '2026-06-23',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = CreateMedicationSchema.safeParse({
      elderly_user_id: '00000000-0000-0000-0000-000000000001',
      name: '',
      dosage: '500mg',
      frequency: 'twice daily',
      start_date: '2026-06-23',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date format', () => {
    const result = CreateMedicationSchema.safeParse({
      elderly_user_id: '00000000-0000-0000-0000-000000000001',
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'twice daily',
      start_date: '23-06-2026',
    })
    expect(result.success).toBe(false)
  })
})
