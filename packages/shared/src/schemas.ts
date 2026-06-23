import { z } from 'zod'

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  role: z.enum(['elderly', 'caregiver', 'doctor']),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const CreateInviteSchema = z.object({
  invitee_email: z.string().email(),
  invitee_role: z.enum(['caregiver', 'doctor']),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type CreateInviteInput = z.infer<typeof CreateInviteSchema>
