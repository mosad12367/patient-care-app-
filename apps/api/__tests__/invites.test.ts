import { CreateInviteSchema } from '@phc/shared'

describe('CreateInviteSchema', () => {
  it('accepts valid caregiver invite', () => {
    const result = CreateInviteSchema.safeParse({
      invitee_email: 'ahmed@example.com',
      invitee_role: 'caregiver',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const result = CreateInviteSchema.safeParse({
      invitee_email: 'ahmed@example.com',
      invitee_role: 'admin',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = CreateInviteSchema.safeParse({
      invitee_email: 'notanemail',
      invitee_role: 'caregiver',
    })
    expect(result.success).toBe(false)
  })
})
