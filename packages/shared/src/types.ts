export type UserRole = 'elderly' | 'caregiver' | 'doctor'
export type RelationshipRole = 'caregiver' | 'doctor'
export type RelationshipStatus = 'pending' | 'accepted'
export type DoseStatus = 'pending' | 'taken' | 'missed'

export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  role: UserRole
  created_at: string
}

export interface Relationship {
  id: string
  elderly_user_id: string
  connected_user_id: string
  role: RelationshipRole
  status: RelationshipStatus
  invite_token: string | null
  invite_expires_at: string | null
}

export interface Medication {
  id: string
  elderly_user_id: string
  name: string
  dosage: string
  frequency: string
  start_date: string
  end_date: string | null
  created_by: string
  created_at: string
}

export interface MedicationSchedule {
  id: string
  medication_id: string
  scheduled_time: string  // "HH:MM"
  days_of_week: number[]  // 0=Sun … 6=Sat
}

export interface DoseLog {
  id: string
  medication_schedule_id: string
  scheduled_at: string
  taken_at: string | null
  status: DoseStatus
  sms_sent: boolean
}

export interface SymptomLog {
  id: string
  elderly_user_id: string
  logged_at: string
  symptoms: string[]
  severity: number  // 1–5
  voice_note_url: string | null
  text_note: string | null
}
