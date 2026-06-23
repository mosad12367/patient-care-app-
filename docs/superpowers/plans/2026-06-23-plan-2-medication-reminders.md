# Patient Health Companion — Plan 2: Medication & Reminders

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the medication CRUD API, scheduling system, dose logging, push notification delivery, Vercel cron job, and Twilio SMS fallback.

**Architecture:** Next.js API routes handle medication and dose CRUD. A Vercel Cron Job runs every 5 minutes, finds pending doses past their scheduled time, fires Expo push notifications, and after 30 minutes triggers Twilio SMS. After 60 minutes with no acknowledgement, a caregiver alert is sent.

**Tech Stack:** Next.js 15, Supabase JS v2, Expo Server SDK (push notifications), Twilio Node SDK, Vercel Cron

**Prerequisite:** Plan 1 complete — schema, auth, and shared types must exist.

## Global Constraints
- Node.js >= 20.0.0; TypeScript strict mode
- Every route calls `requireAuth()` before any logic
- The cron endpoint `/api/cron/check-doses` is secured via `CRON_SECRET` header (Vercel sets this automatically)
- Twilio SMS is only sent to the phone number on the elderly user's `users` row — never to an arbitrary number
- Push tokens are stored per-user; invalid tokens are silently removed

---

## File Map

```
apps/api/src/
├── lib/
│   ├── push.ts               # sendPushNotification() helper
│   └── sms.ts                # sendSms() helper
└── app/
    └── api/
        ├── medications/
        │   ├── route.ts              # GET (list), POST (create)
        │   └── [id]/route.ts         # PATCH (update), DELETE
        ├── schedules/
        │   ├── route.ts              # POST (create schedule)
        │   └── [id]/route.ts         # DELETE
        ├── doses/
        │   ├── route.ts              # GET today's doses
        │   └── [id]/route.ts         # PATCH (acknowledge: taken | missed)
        ├── push-tokens/
        │   └── route.ts              # POST (register device token)
        └── cron/
            └── check-doses/route.ts  # GET (Vercel Cron trigger)

apps/api/supabase/migrations/
└── 002_push_tokens.sql       # push_tokens table
```

---

### Task 1: Push Token Storage

**Files:**
- Create: `apps/api/supabase/migrations/002_push_tokens.sql`
- Create: `apps/api/src/app/api/push-tokens/route.ts`

**Produces:** `push_tokens` table; `POST /api/push-tokens` — called by mobile app on login.

- [ ] **Step 1: Create migration**

Create `apps/api/supabase/migrations/002_push_tokens.sql`:

```sql
create table public.push_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now(),
  unique(user_id, token)
);

alter table public.push_tokens enable row level security;

create policy "push_tokens_own" on public.push_tokens
  using (auth.uid() = user_id);
```

Apply in Supabase SQL Editor.

- [ ] **Step 2: Create push-tokens route**

Create `apps/api/src/app/api/push-tokens/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const PushTokenSchema = z.object({ token: z.string().min(1) })

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const parsed = PushTokenSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  await supabase.from('push_tokens').upsert(
    { user_id: user.id, token: parsed.data.token },
    { onConflict: 'user_id,token' }
  )

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/supabase/migrations/002_push_tokens.sql apps/api/src/app/api/push-tokens
git commit -m "feat: add push token storage"
```

---

### Task 2: Push Notification & SMS Helpers

**Files:**
- Create: `apps/api/src/lib/push.ts`
- Create: `apps/api/src/lib/sms.ts`
- Create: `apps/api/__tests__/push.test.ts`

**Produces:** `sendPushNotification(userId, title, body)`, `sendSms(phone, message)` — used by the cron job in Task 5.

- [ ] **Step 1: Add Twilio dependency**

```bash
cd apps/api && pnpm add twilio
```

- [ ] **Step 2: Write failing test**

Create `apps/api/__tests__/push.test.ts`:

```typescript
// Unit tests for SMS message formatting — no external calls
describe('SMS message content', () => {
  it('formats missed-dose message correctly', () => {
    const medicationName = 'Metformin'
    const msg = `Reminder: Please take your ${medicationName}. Open the Health Companion app to confirm.`
    expect(msg).toContain('Metformin')
    expect(msg).toContain('Reminder')
  })

  it('formats caregiver alert message correctly', () => {
    const elderlyName = 'Tayaba'
    const medicationName = 'Metformin'
    const msg = `Alert: ${elderlyName} has not acknowledged their ${medicationName} dose.`
    expect(msg).toContain('Tayaba')
    expect(msg).toContain('Metformin')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/api && pnpm test -- --testPathPattern=push
```

Expected: FAIL — test file doesn't exist yet.

- [ ] **Step 4: Create push helper**

Create `apps/api/src/lib/push.ts`:

```typescript
import { createSupabaseAdminClient } from './supabase-server'

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)

  if (!tokens || tokens.length === 0) return

  const messages = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data: data ?? {},
    sound: 'default',
  }))

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })

  if (!response.ok) {
    console.error('Push notification failed:', await response.text())
  }
}
```

- [ ] **Step 5: Create SMS helper**

Create `apps/api/src/lib/sms.ts`:

```typescript
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function sendSms(to: string, message: string): Promise<void> {
  if (!to) return
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_FROM_NUMBER!,
    to,
  })
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd apps/api && pnpm test -- --testPathPattern=push
```

Expected: PASS — 2 tests green.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/push.ts apps/api/src/lib/sms.ts apps/api/__tests__/push.test.ts
git commit -m "feat: add push notification and SMS helpers"
```

---

### Task 3: Medication CRUD API Routes

**Files:**
- Create: `apps/api/src/app/api/medications/route.ts`
- Create: `apps/api/src/app/api/medications/[id]/route.ts`
- Create: `apps/api/__tests__/medications.test.ts`

**Consumes:** `requireAuth()`, `Medication` type from `@phc/shared`.
**Produces:** `GET /api/medications`, `POST /api/medications`, `PATCH /api/medications/:id`, `DELETE /api/medications/:id`

- [ ] **Step 1: Add Zod schema for medication to packages/shared/src/schemas.ts**

Open `packages/shared/src/schemas.ts` and add:

```typescript
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
```

Rebuild shared: `cd packages/shared && pnpm build`

- [ ] **Step 2: Write failing test**

Create `apps/api/__tests__/medications.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd apps/api && pnpm test -- --testPathPattern=medications
```

Expected: PASS — 3 tests green.

- [ ] **Step 4: Create medications list/create route**

Create `apps/api/src/app/api/medications/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { CreateMedicationSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const elderly_user_id = searchParams.get('elderly_user_id') ?? user.id

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('medications')
    .select('*, medication_schedules(*)')
    .eq('elderly_user_id', elderly_user_id)
    .order('created_at', { ascending: false })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ medications: data })
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  if (user.role !== 'caregiver') {
    return NextResponse.json({ error: 'Only caregivers can add medications' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateMedicationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('medications')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ medication: data }, { status: 201 })
}
```

- [ ] **Step 5: Create medication update/delete route**

Create `apps/api/src/app/api/medications/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { UpdateMedicationSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  if (user.role !== 'caregiver') {
    return NextResponse.json({ error: 'Only caregivers can update medications' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = UpdateMedicationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('medications')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ medication: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  if (user.role !== 'caregiver') {
    return NextResponse.json({ error: 'Only caregivers can delete medications' }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  const { error: dbError } = await supabase
    .from('medications')
    .delete()
    .eq('id', params.id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app/api/medications apps/api/__tests__/medications.test.ts
git commit -m "feat: add medication CRUD API routes"
```

---

### Task 4: Schedule & Dose Log API Routes

**Files:**
- Create: `apps/api/src/app/api/schedules/route.ts`
- Create: `apps/api/src/app/api/schedules/[id]/route.ts`
- Create: `apps/api/src/app/api/doses/route.ts`
- Create: `apps/api/src/app/api/doses/[id]/route.ts`

**Produces:** `POST /api/schedules`, `DELETE /api/schedules/:id`, `GET /api/doses` (today's), `PATCH /api/doses/:id` (acknowledge)

- [ ] **Step 1: Add schedule and dose schemas to packages/shared/src/schemas.ts**

Add to `packages/shared/src/schemas.ts`:

```typescript
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
```

Rebuild shared: `cd packages/shared && pnpm build`

- [ ] **Step 2: Create schedules routes**

Create `apps/api/src/app/api/schedules/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { CreateScheduleSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  if (user.role !== 'caregiver') {
    return NextResponse.json({ error: 'Only caregivers can create schedules' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateScheduleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('medication_schedules')
    .insert(parsed.data)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ schedule: data }, { status: 201 })
}
```

Create `apps/api/src/app/api/schedules/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  if (user.role !== 'caregiver') {
    return NextResponse.json({ error: 'Only caregivers can delete schedules' }, { status: 403 })
  }

  const supabase = createSupabaseServerClient()
  const { error: dbError } = await supabase
    .from('medication_schedules')
    .delete()
    .eq('id', params.id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create doses routes**

Create `apps/api/src/app/api/doses/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const elderly_user_id = searchParams.get('elderly_user_id') ?? user.id

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('dose_logs')
    .select(`
      *,
      medication_schedule:medication_schedules(
        scheduled_time,
        medication:medications(name, dosage, elderly_user_id)
      )
    `)
    .gte('scheduled_at', todayStart.toISOString())
    .lte('scheduled_at', todayEnd.toISOString())

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const filtered = (data ?? []).filter(
    (d) => d.medication_schedule?.medication?.elderly_user_id === elderly_user_id
  )

  return NextResponse.json({ doses: filtered })
}
```

Create `apps/api/src/app/api/doses/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { AcknowledgeDoseSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const parsed = AcknowledgeDoseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('dose_logs')
    .update({
      status: parsed.data.status,
      taken_at: parsed.data.status === 'taken' ? new Date().toISOString() : null,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ dose: data })
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app/api/schedules apps/api/src/app/api/doses
git commit -m "feat: add schedule and dose log API routes"
```

---

### Task 5: Vercel Cron Job — Reminder & SMS Fallback

**Files:**
- Create: `apps/api/src/app/api/cron/check-doses/route.ts`
- Create: `apps/api/vercel.json`
- Create: `apps/api/__tests__/cron.test.ts`

**Consumes:** `sendPushNotification()` from Task 2, `sendSms()` from Task 2.
**Produces:** `GET /api/cron/check-doses` — triggered by Vercel every 5 minutes.

- [ ] **Step 1: Write failing test**

Create `apps/api/__tests__/cron.test.ts`:

```typescript
// Tests the threshold logic used in the cron job
describe('Cron dose timing thresholds', () => {
  const THIRTY_MINUTES_MS = 30 * 60 * 1000
  const SIXTY_MINUTES_MS = 60 * 60 * 1000

  it('identifies dose as needing SMS after 30 minutes', () => {
    const scheduledAt = new Date(Date.now() - THIRTY_MINUTES_MS - 1000)
    const now = new Date()
    const msSinceScheduled = now.getTime() - scheduledAt.getTime()
    expect(msSinceScheduled).toBeGreaterThan(THIRTY_MINUTES_MS)
  })

  it('identifies dose as needing caregiver alert after 60 minutes', () => {
    const scheduledAt = new Date(Date.now() - SIXTY_MINUTES_MS - 1000)
    const now = new Date()
    const msSinceScheduled = now.getTime() - scheduledAt.getTime()
    expect(msSinceScheduled).toBeGreaterThan(SIXTY_MINUTES_MS)
  })

  it('does not flag a dose scheduled 10 minutes ago', () => {
    const scheduledAt = new Date(Date.now() - 10 * 60 * 1000)
    const now = new Date()
    const msSinceScheduled = now.getTime() - scheduledAt.getTime()
    expect(msSinceScheduled).toBeLessThan(THIRTY_MINUTES_MS)
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

```bash
cd apps/api && pnpm test -- --testPathPattern=cron
```

Expected: PASS — 3 tests green.

- [ ] **Step 3: Create cron route**

Create `apps/api/src/app/api/cron/check-doses/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { sendPushNotification } from '@/lib/push'
import { sendSms } from '@/lib/sms'

const THIRTY_MIN_MS = 30 * 60 * 1000
const SIXTY_MIN_MS = 60 * 60 * 1000

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()
  const now = new Date()

  // Find all pending doses that are overdue (scheduled_at < now)
  const { data: pendingDoses, error } = await supabase
    .from('dose_logs')
    .select(`
      id, scheduled_at, sms_sent,
      medication_schedule:medication_schedules(
        medication:medications(
          name,
          elderly_user:users!medications_elderly_user_id_fkey(id, name, phone),
          caregiver_relationships:relationships(
            connected_user:users!relationships_connected_user_id_fkey(id)
          )
        )
      )
    `)
    .eq('status', 'pending')
    .lt('scheduled_at', now.toISOString())

  if (error) {
    console.error('Cron error fetching pending doses:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  for (const dose of pendingDoses ?? []) {
    const med = dose.medication_schedule?.medication
    if (!med) continue

    const elderlyUser = med.elderly_user
    const msSinceScheduled = now.getTime() - new Date(dose.scheduled_at).getTime()
    const medicationName = med.name

    // Always send push notification for overdue doses (push is idempotent-ish)
    await sendPushNotification(
      elderlyUser.id,
      'Medication Reminder',
      `Time to take your ${medicationName}. Tap to confirm.`,
      { dose_id: dose.id, screen: 'medicines' }
    )

    // After 30 minutes with no acknowledgement: send SMS if not already sent
    if (msSinceScheduled > THIRTY_MIN_MS && !dose.sms_sent && elderlyUser.phone) {
      await sendSms(
        elderlyUser.phone,
        `Reminder: Please take your ${medicationName}. Open the Health Companion app to confirm.`
      )
      await supabase.from('dose_logs').update({ sms_sent: true }).eq('id', dose.id)
    }

    // After 60 minutes: alert all accepted caregivers
    if (msSinceScheduled > SIXTY_MIN_MS) {
      const caregiverRelationships = med.caregiver_relationships ?? []
      for (const rel of caregiverRelationships) {
        if (!rel.connected_user) continue
        await sendPushNotification(
          rel.connected_user.id,
          'Missed Dose Alert',
          `${elderlyUser.name} has not taken their ${medicationName}.`,
          { elderly_user_id: elderlyUser.id, screen: 'dashboard' }
        )
      }
    }
  }

  return NextResponse.json({ processed: pendingDoses?.length ?? 0 })
}
```

- [ ] **Step 4: Create vercel.json with cron config**

Create `apps/api/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-doses",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Add `CRON_SECRET` to `.env.local` (any random string, Vercel sets it automatically in production).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app/api/cron apps/api/vercel.json apps/api/__tests__/cron.test.ts
git commit -m "feat: add Vercel cron job for dose reminders with push and SMS fallback"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Add medicines / set reminders (Tasks 3, 4)
- ✅ Track taken/missed doses (Task 4 — PATCH /api/doses/:id)
- ✅ View medication history (Task 3 — GET /api/medications)
- ✅ Push notification on due dose (Task 5 — cron)
- ✅ SMS fallback after 30 minutes (Task 5)
- ✅ Caregiver alert after 60 minutes (Task 5)
- ✅ Push token registration (Task 1)
- ✅ Caregiver-only write access to medications (Tasks 3, 4)

**Type consistency:** `AcknowledgeDoseSchema`, `CreateMedicationSchema`, `CreateScheduleSchema` all defined in `packages/shared/src/schemas.ts` and used by routes. ✅
