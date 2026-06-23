import { RegisterSchema, LoginSchema } from '@phc/shared'

describe('RegisterSchema', () => {
  it('accepts valid elderly registration', () => {
    const result = RegisterSchema.safeParse({
      email: 'tayaba@example.com',
      password: 'password123',
      name: 'Tayaba',
      role: 'elderly',
    })
    expect(result.success).toBe(true)
  })

  it('rejects registration with password under 8 chars', () => {
    const result = RegisterSchema.safeParse({
      email: 'test@example.com',
      password: 'short',
      name: 'Test',
      role: 'elderly',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = RegisterSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test',
      role: 'admin',
    })
    expect(result.success).toBe(false)
  })
})

describe('LoginSchema', () => {
  it('accepts valid login', () => {
    const result = LoginSchema.safeParse({
      email: 'test@example.com',
      password: 'anypassword',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = LoginSchema.safeParse({ email: 'notanemail', password: 'pass' })
    expect(result.success).toBe(false)
  })
})
