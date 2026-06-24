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

export const CreateMedicationSchema = z.object({
  elderly_user_id: z.string().uuid(),
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export const UpdateMedicationSchema = CreateMedicationSchema.partial().omit({ elderly_user_id: true })

export type CreateMedicationInput = z.infer<typeof CreateMedicationSchema>
export type UpdateMedicationInput = z.infer<typeof UpdateMedicationSchema>
