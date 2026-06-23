# Patient Health Companion — Design Spec
**Date:** 2026-06-23
**Status:** Approved

---

## 1. Overview

A mobile health companion app that helps elderly users manage medication schedules and log symptoms independently, while keeping trusted family caregivers informed and connected. Doctors are supported via a health summary export in MVP; a full doctor portal is planned for Phase 2.

**Unique Selling Point:** Connects elderly independence with family support — seniors stay in control while loved ones stay involved.

---

## 2. Personas

| Persona | Name | Role | Primary Need |
|---|---|---|---|
| Elderly User | Tayaba, 72 | Primary user | Simple reminders, easy symptom logging |
| Family Caregiver | Ahmed, 35 | Secondary user | Monitor health remotely, manage medications |
| Doctor (Phase 2) | Dr. Sara, 42 | Supporting user | Organized patient history at appointments |

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native + Expo |
| API | Next.js (serverless routes, deployed on Vercel) |
| Database & Auth | Supabase (PostgreSQL + Supabase Auth + Storage) |
| SMS reminders | Twilio |
| Monorepo structure | `apps/mobile`, `apps/api`, `packages/shared` |

---

## 4. Architecture

```
apps/mobile (React Native / Expo)
       ↕ HTTPS
apps/api (Next.js on Vercel)
       ↕
Supabase (PostgreSQL + Auth + Storage)
       ↕
Twilio (SMS fallback, triggered by Vercel Cron)
```

- The mobile app communicates exclusively with the Next.js API layer.
- The API handles all business logic, auth validation, and external service calls.
- Supabase Row Level Security (RLS) enforces data access at the database level as a second layer of protection.
- Shared TypeScript types in `packages/shared` keep mobile and API contracts in sync.

---

## 5. Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| email | text | Unique |
| name | text | |
| phone | text | For SMS reminders |
| role | enum | `elderly`, `caregiver`, `doctor` |
| created_at | timestamp | |

### `relationships`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| elderly_user_id | uuid → users | |
| connected_user_id | uuid → users | |
| role | enum | `caregiver`, `doctor` |
| status | enum | `pending`, `accepted` |

### `medications`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| elderly_user_id | uuid → users | |
| name | text | |
| dosage | text | e.g. "500mg" |
| frequency | text | Display label only, e.g. "twice daily" — actual times stored in `medication_schedules` |
| start_date | date | |
| end_date | date | Nullable |
| created_by | uuid → users | Caregiver or elderly user |

### `medication_schedules`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| medication_id | uuid → medications | |
| scheduled_time | time | |
| days_of_week | int[] | 0=Sun … 6=Sat |

### `dose_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| medication_schedule_id | uuid → medication_schedules | |
| scheduled_at | timestamp | |
| taken_at | timestamp | Nullable |
| status | enum | `pending`, `taken`, `missed` |
| sms_sent | boolean | Whether SMS fallback fired |

### `symptom_logs`
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| elderly_user_id | uuid → users | |
| logged_at | timestamp | |
| symptoms | text[] | Selected from predefined list |
| severity | int | 1–5 |
| voice_note_url | text | Signed URL to Supabase Storage |
| text_note | text | Nullable free-text |

### `doctor_notes` *(Phase 2)*
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| elderly_user_id | uuid → users | |
| doctor_id | uuid → users | |
| note | text | |
| created_at | timestamp | |

---

## 6. Roles & Permissions

| Action | Tayaba | Ahmed | Dr. Sara (Phase 2) |
|---|---|---|---|
| Take / miss doses | ✅ | — | — |
| Log symptoms | ✅ | — | — |
| View own health data | ✅ | — | — |
| Add / edit medications | — | ✅ | — |
| View elderly user's full history | — | ✅ | ✅ |
| Receive missed dose alerts | — | ✅ | — |
| Add clinical notes | — | — | ✅ |
| Invite caregivers / doctors | ✅ | — | — |
| Export health summary (PDF) | ✅ | ✅ | — |

**Tayaba initiates all connections.** No caregiver or doctor can attach to her account without her sending the invite.

---

## 7. Authentication & Invite Flow

- Auth provider: Supabase Auth (email + password)
- Tayaba registers on the mobile app
- To add a caregiver or doctor, Tayaba enters their email → they receive an invite link → they register/login → connection status becomes `accepted`
- Tayaba can remove any connected person at any time from the "Family" screen

---

## 8. Elderly User Interface

### Design Rules (non-negotiable)
- Minimum font size: 20px
- Minimum tap target size: 48×48px
- High-contrast colors (WCAG AA minimum)
- Maximum 2 actions per screen
- No hamburger menus
- No swipe gestures
- Every button has an icon AND a text label
- Confirmation step before any save action

### Screens (4 total)

**Home**
- Greeting: "Good morning, Tayaba"
- Large card: next due medication with "Mark as Taken" / "Skip" buttons
- Large button: "Log Symptom"
- Persistent bottom bar button: "Call Ahmed" (emergency contact, always visible)

**Medicines**
- List of today's medications with taken/missed status
- Tap any medication to see details (name, dosage, time)
- No editing — editing is done by caregiver only

**Symptoms**
- Chronological list of past symptom logs
- Each entry shows date, symptom name, severity dots

**Family**
- Shows Ahmed's name and photo
- "Call Ahmed" button
- "Add Caregiver" / "Add Doctor" invite flow
- List of connected people with option to remove

### Bottom Navigation
4 tabs: **Home · Medicines · Symptoms · Family**

---

## 9. Caregiver Interface (Ahmed)

Accessed via mobile app (same app, different role screens).

**Screens:**
- **Dashboard** — Tayaba's medication status today, any missed doses, recent symptom logs
- **Medication Manager** — add, edit, or remove medications and schedules
- **Alerts Feed** — chronological list of missed doses and symptom pattern alerts
- **Health Summary** — generate and export PDF summary (last 30 days)

---

## 10. Doctor Interface — Phase 2

Full web portal (Next.js, Vercel-hosted). Dr. Sara logs in via browser.

**MVP substitute:** Ahmed or Tayaba can export a PDF health summary from the app and share it with Dr. Sara manually.

**Phase 2 screens (planned):**
- Patient list
- Patient detail (medication history + symptom timeline)
- Add clinical note

---

## 11. Notification & Reminder System

### Flow
1. Medication schedule saved in `medication_schedules`
2. Vercel Cron Job runs every 5 minutes
3. Checks for `dose_logs` with `status = pending` and `scheduled_at` in the past
4. Fires push notification to Tayaba's device
5. If no acknowledgement within 30 minutes → Twilio SMS sent to Tayaba, `sms_sent = true`
6. If no acknowledgement within 60 minutes → push notification sent to Ahmed

### Dose Acknowledgement
- Tayaba taps notification → opens "Take Medicine" screen directly
- Taps "Mark as Taken" → `dose_logs.status = taken`, `taken_at` recorded
- Taps "Skip" → `dose_logs.status = missed`
- Both actions trigger an update visible to Ahmed in real time

---

## 12. Symptom Logging Flow

1. Tayaba taps "Log Symptom" on Home screen
2. Selects from predefined list (large buttons):
   - Headache, Dizziness, Nausea, Fatigue, Chest Pain, Shortness of Breath, Pain, Confusion, Other
3. Rates severity: 1–5 (displayed as large filled dots)
4. Optional: taps voice button → speaks → transcribed via device native speech recognition → saved as `text_note`
5. Taps "Save" → confirmation screen → saved to `symptom_logs`

Total taps to complete: 2 minimum (symptom + save).

---

## 13. Rule-Based Pattern Detection

All patterns detected via SQL queries. No LLM required.

| Pattern | Condition | Alert sent to |
|---|---|---|
| Recurring symptom | Same symptom logged 3+ times in 7 days | Ahmed |
| High severity | Severity rated 5 | Ahmed (immediate) |
| High-risk symptom | Chest pain or shortness of breath logged | Ahmed (immediate) |
| Inactivity | No symptom log in 5+ days | Ahmed |
| Missed doses streak | 3+ consecutive missed doses | Ahmed |

### Health Summary (PDF export)
Generated as plain text from database queries. Example output:

> "In the past 30 days, Tayaba logged headache 6 times (average severity 3/5) and dizziness 2 times. She missed 4 doses of Metformin. No high-severity symptoms were recorded."

---

## 14. Security

- Passwords managed entirely by Supabase Auth — never stored in application code
- Supabase RLS policies block unauthorized data access at the database level
- Voice recordings stored in Supabase Storage (private bucket); accessed only via short-lived signed URLs
- Twilio SMS sent only to the verified phone number on the elderly user's account
- All API routes require a valid Supabase session JWT
- Invite links expire after 48 hours

---

## 15. Error Handling

| Failure | Fallback |
|---|---|
| Push notification fails | SMS fallback fires automatically |
| SMS (Twilio) fails | Error logged; Ahmed receives in-app alert |
| Voice transcription fails | "Voice not captured — try typing instead" shown to Tayaba |
| No internet connection | Last medication schedule shown from cache; symptoms queued locally and synced on reconnect |

---

## 16. Testing Strategy

- **Unit tests:** Rule-based pattern detection logic (most critical business logic)
- **Integration tests:** Cron job reminder flow (schedule → push → SMS fallback)
- **Manual accessibility tests:** Large text rendering, voice input, tap target size — tested on a real physical device
- **End-to-end test:** Full dose acknowledgement flow (reminder fires → Tayaba taps taken → Ahmed notified)

---

## 17. Phase Roadmap

### MVP (Phase 1)
- Elderly user: medication reminders, dose acknowledgement, symptom logging with voice, emergency call button
- Caregiver: dashboard, medication management, alerts, health summary PDF export
- Push + SMS reminder system
- Invite-based connections
- Rule-based pattern detection

### Phase 2
- Doctor portal (web, full login, clinical notes)
- AI-assisted summaries (Claude API)
- Medication refill reminders
- Multi-language support
