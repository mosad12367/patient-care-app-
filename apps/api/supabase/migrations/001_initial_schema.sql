-- Initial Schema for Patient Health Care Application
-- Supabase Migration: Sets up all core tables with Row Level Security policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: users
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('elderly', 'caregiver', 'doctor')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can select/update own row only
CREATE POLICY "Users can select own row" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own row" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Table 2: relationships
CREATE TABLE public.relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elderly_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  connected_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('caregiver', 'doctor')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
  invitee_email TEXT,
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(elderly_user_id, invitee_email)
);

-- Enable RLS for relationships table
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policy: select if elderly_user_id OR connected_user_id = auth.uid()
CREATE POLICY "Users can select relationships involving them" ON public.relationships
  FOR SELECT
  USING (elderly_user_id = auth.uid() OR connected_user_id = auth.uid());

-- RLS Policy: insert/delete only by elderly_user_id
CREATE POLICY "Only elderly user can insert relationships" ON public.relationships
  FOR INSERT
  WITH CHECK (elderly_user_id = auth.uid());

CREATE POLICY "Only elderly user can delete relationships" ON public.relationships
  FOR DELETE
  USING (elderly_user_id = auth.uid());

-- Table 3: medications
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elderly_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for medications table
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: select by elderly user OR connected caregiver/doctor with accepted relationship
CREATE POLICY "Elderly user and connected caregivers can select medications" ON public.medications
  FOR SELECT
  USING (
    elderly_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.relationships
      WHERE elderly_user_id = public.medications.elderly_user_id
        AND connected_user_id = auth.uid()
        AND status = 'accepted'
    )
  );

-- RLS Policy: insert/update only by caregiver with accepted relationship
CREATE POLICY "Only accepted caregivers can insert medications" ON public.medications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE elderly_user_id = public.medications.elderly_user_id
        AND connected_user_id = auth.uid()
        AND role = 'caregiver'
        AND status = 'accepted'
    )
  );

CREATE POLICY "Only accepted caregivers can update medications" ON public.medications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE elderly_user_id = public.medications.elderly_user_id
        AND connected_user_id = auth.uid()
        AND role = 'caregiver'
        AND status = 'accepted'
    )
  );

-- Table 4: medication_schedules
CREATE TABLE public.medication_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  scheduled_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL CHECK (array_length(days_of_week, 1) > 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for medication_schedules table
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Inherit from medications table (select by elderly user OR connected caregiver/doctor with accepted relationship)
CREATE POLICY "Elderly user and connected caregivers can select schedules" ON public.medication_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.medications
      WHERE medications.id = public.medication_schedules.medication_id
        AND (
          medications.elderly_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.relationships
            WHERE elderly_user_id = medications.elderly_user_id
              AND connected_user_id = auth.uid()
              AND status = 'accepted'
          )
        )
    )
  );

-- Table 5: dose_logs
CREATE TABLE public.dose_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_schedule_id UUID NOT NULL REFERENCES public.medication_schedules(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending', 'taken', 'missed')) DEFAULT 'pending',
  sms_sent BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for dose_logs table
ALTER TABLE public.dose_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: select by elderly user or connected caregiver
CREATE POLICY "Elderly user and connected caregivers can select dose logs" ON public.dose_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.medication_schedules
      JOIN public.medications ON medications.id = medication_schedules.medication_id
      WHERE medication_schedules.id = public.dose_logs.medication_schedule_id
        AND (
          medications.elderly_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.relationships
            WHERE elderly_user_id = medications.elderly_user_id
              AND connected_user_id = auth.uid()
              AND status = 'accepted'
          )
        )
    )
  );

-- RLS Policy: update only by elderly user
CREATE POLICY "Only elderly user can update dose logs" ON public.dose_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.medication_schedules
      JOIN public.medications ON medications.id = medication_schedules.medication_id
      WHERE medication_schedules.id = public.dose_logs.medication_schedule_id
        AND medications.elderly_user_id = auth.uid()
    )
  );

-- Table 6: symptom_logs
CREATE TABLE public.symptom_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elderly_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  symptoms TEXT[] NOT NULL CHECK (array_length(symptoms, 1) > 0),
  severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),
  voice_note_url TEXT,
  text_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for symptom_logs table
ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: select by elderly user or connected caregiver
CREATE POLICY "Elderly user and connected caregivers can select symptom logs" ON public.symptom_logs
  FOR SELECT
  USING (
    elderly_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.relationships
      WHERE elderly_user_id = public.symptom_logs.elderly_user_id
        AND connected_user_id = auth.uid()
        AND status = 'accepted'
    )
  );

-- RLS Policy: insert only by elderly user
CREATE POLICY "Only elderly user can insert symptom logs" ON public.symptom_logs
  FOR INSERT
  WITH CHECK (elderly_user_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX idx_relationships_elderly_user_id ON public.relationships(elderly_user_id);
CREATE INDEX idx_relationships_connected_user_id ON public.relationships(connected_user_id);
CREATE INDEX idx_medications_elderly_user_id ON public.medications(elderly_user_id);
CREATE INDEX idx_medication_schedules_medication_id ON public.medication_schedules(medication_id);
CREATE INDEX idx_dose_logs_medication_schedule_id ON public.dose_logs(medication_schedule_id);
CREATE INDEX idx_symptom_logs_elderly_user_id ON public.symptom_logs(elderly_user_id);
