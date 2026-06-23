# Supabase Migrations

This directory contains SQL migrations for the Patient Health Care application's Supabase database.

## Applying Migrations

**Important:** Supabase migrations must be applied manually through the Supabase dashboard. The implementer does not have credentials to apply migrations automatically.

### Manual Application Steps

1. Navigate to your Supabase project dashboard
2. Go to the **SQL Editor** section
3. Click **"New Query"**
4. Copy the contents of the migration file(s) from `migrations/` directory
5. Paste into the SQL editor
6. Click **"Run"** to execute

### Migration Files

- `001_initial_schema.sql` — Creates the initial schema with 6 core tables (users, relationships, medications, medication_schedules, dose_logs, symptom_logs) and Row Level Security (RLS) policies

## Schema Overview

The migration creates:
- **users** — User profiles with roles (elderly, caregiver, doctor)
- **relationships** — Connections between elderly users and caregivers/doctors with invitation flow
- **medications** — Medication records with dosage and frequency
- **medication_schedules** — Time-based schedules for medications with days of week
- **dose_logs** — Tracking of medication doses taken/missed
- **symptom_logs** — Elderly user symptom reports with severity and optional voice notes

All tables have RLS enabled to control access based on user roles and relationships.
