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

export const CreateScheduleSchema = z.object({
  medication_id: z.string().uuid(),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/),
  days_of_week: z.array(z.number().min(0).max(6)).min(1),
})

export const AcknowledgeDoseSchema = z.object({
  status: z.enum(['taken', 'missed']),
})

export type CreateScheduleInput = z.infer<typeof CreateScheduleSchema>
export type AcknowledgeDoseInput = z.infer<typeof AcknowledgeDoseSchema>

export const PREDEFINED_SYMPTOMS = [
  'Headache',
  'Dizziness',
  'Nausea',
  'Fatigue',
  'Chest Pain',
  'Shortness of Breath',
  'Pain',
  'Confusion',
  'Other',
] as const

export const CreateSymptomLogSchema = z.object({
  symptoms: z.array(z.string().min(1)).min(1),
  severity: z.number().int().min(1).max(5),
  voice_note_url: z.string().url().nullable().optional(),
  text_note: z.string().nullable().optional(),
})

export type CreateSymptomLogInput = z.infer<typeof CreateSymptomLogSchema>
