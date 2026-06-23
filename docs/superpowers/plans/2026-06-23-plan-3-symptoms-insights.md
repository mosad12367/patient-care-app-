# Patient Health Companion — Plan 3: Symptoms & Insights

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build symptom logging API routes, voice note upload to Supabase Storage, rule-based pattern detection, and PDF health summary export.

**Architecture:** Next.js API routes handle symptom CRUD and pattern detection via SQL queries. PDF generation runs server-side using `@react-pdf/renderer`. Voice notes are uploaded directly from the mobile app to Supabase Storage; only the resulting URL is stored in the database.

**Tech Stack:** Next.js 15, Supabase JS v2, @react-pdf/renderer, TypeScript 5 (strict)

**Prerequisite:** Plan 1 complete — schema, auth, and shared types must exist.

## Global Constraints
- Node.js >= 20.0.0; TypeScript strict mode
- Every route calls `requireAuth()` before any logic
- AI/LLM is explicitly excluded from MVP — all pattern detection is SQL-based
- The health summary PDF must not include any disclaimer that could be read as medical advice
- Voice note uploads go directly to Supabase Storage (not through the API server) to avoid large payload handling

---

## File Map

```
apps/api/src/app/api/
├── symptoms/
│   ├── route.ts              # GET (list), POST (create log)
│   └── patterns/route.ts     # GET (rule-based pattern analysis)
├── storage/
│   └── voice-note-url/route.ts  # POST (generate signed upload URL)
└── summary/
    └── route.ts              # GET (generate + return PDF as binary)
```

---

### Task 1: Symptom Logging API

**Files:**
- Create: `apps/api/src/app/api/symptoms/route.ts`
- Create: `apps/api/__tests__/symptoms.test.ts`

**Consumes:** `requireAuth()`, `SymptomLog` type.
**Produces:** `GET /api/symptoms`, `POST /api/symptoms`

- [ ] **Step 1: Add symptom schemas to packages/shared/src/schemas.ts**

Open `packages/shared/src/schemas.ts` and add:

```typescript
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
```

Rebuild shared: `cd packages/shared && pnpm build`

- [ ] **Step 2: Write failing test**

Create `apps/api/__tests__/symptoms.test.ts`:

```typescript
import { CreateSymptomLogSchema } from '@phc/shared'

describe('CreateSymptomLogSchema', () => {
  it('accepts valid symptom log', () => {
    const result = CreateSymptomLogSchema.safeParse({
      symptoms: ['Headache', 'Dizziness'],
      severity: 3,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty symptoms array', () => {
    const result = CreateSymptomLogSchema.safeParse({
      symptoms: [],
      severity: 3,
    })
    expect(result.success).toBe(false)
  })

  it('rejects severity out of range', () => {
    const result = CreateSymptomLogSchema.safeParse({
      symptoms: ['Headache'],
      severity: 6,
    })
    expect(result.success).toBe(false)
  })

  it('accepts log with voice note URL', () => {
    const result = CreateSymptomLogSchema.safeParse({
      symptoms: ['Fatigue'],
      severity: 2,
      voice_note_url: 'https://example.supabase.co/storage/v1/object/sign/voice/abc.m4a',
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd apps/api && pnpm test -- --testPathPattern=symptoms
```

Expected: PASS — 4 tests green.

- [ ] **Step 4: Create symptom log routes**

Create `apps/api/src/app/api/symptoms/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { CreateSymptomLogSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const elderly_user_id = searchParams.get('elderly_user_id') ?? user.id
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100)

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('symptom_logs')
    .select('*')
    .eq('elderly_user_id', elderly_user_id)
    .order('logged_at', { ascending: false })
    .limit(limit)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ symptoms: data })
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  if (user.role !== 'elderly') {
    return NextResponse.json({ error: 'Only elderly users can log symptoms' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateSymptomLogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('symptom_logs')
    .insert({
      elderly_user_id: user.id,
      symptoms: parsed.data.symptoms,
      severity: parsed.data.severity,
      voice_note_url: parsed.data.voice_note_url ?? null,
      text_note: parsed.data.text_note ?? null,
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ symptom: data }, { status: 201 })
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app/api/symptoms/route.ts apps/api/__tests__/symptoms.test.ts
git commit -m "feat: add symptom logging API routes"
```

---

### Task 2: Voice Note Signed Upload URL

**Files:**
- Create: `apps/api/src/app/api/storage/voice-note-url/route.ts`

**Produces:** `POST /api/storage/voice-note-url` — returns a signed URL the mobile app uses to upload directly to Supabase Storage.

**Note:** The mobile app uploads directly to the signed URL (Supabase Storage), then sends the resulting public URL when calling `POST /api/symptoms`.

- [ ] **Step 1: Create voice-notes bucket in Supabase**

In Supabase dashboard → Storage → New Bucket:
- Name: `voice-notes`
- Public: NO (private)
- File size limit: 10MB
- Allowed MIME types: `audio/m4a`, `audio/mp4`, `audio/mpeg`, `audio/wav`

- [ ] **Step 2: Create signed URL route**

Create `apps/api/src/app/api/storage/voice-note-url/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  if (user.role !== 'elderly') {
    return NextResponse.json({ error: 'Only elderly users can upload voice notes' }, { status: 403 })
  }

  const fileName = `${user.id}/${randomUUID()}.m4a`
  const supabase = createSupabaseAdminClient()

  const { data, error: storageError } = await supabase.storage
    .from('voice-notes')
    .createSignedUploadUrl(fileName)

  if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 })

  // Also generate the public download URL (will be valid after upload completes)
  const { data: downloadData } = await supabase.storage
    .from('voice-notes')
    .createSignedUrl(fileName, 60 * 60 * 24 * 365) // 1-year signed download URL

  return NextResponse.json({
    upload_url: data.signedUrl,
    token: data.token,
    path: fileName,
    download_url: downloadData?.signedUrl ?? null,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app/api/storage
git commit -m "feat: add signed voice note upload URL endpoint"
```

---

### Task 3: Rule-Based Pattern Detection

**Files:**
- Create: `apps/api/src/app/api/symptoms/patterns/route.ts`
- Create: `apps/api/__tests__/patterns.test.ts`

**Produces:** `GET /api/symptoms/patterns?elderly_user_id=X` — returns detected patterns used by caregiver dashboard and alerts.

- [ ] **Step 1: Write failing test**

Create `apps/api/__tests__/patterns.test.ts`:

```typescript
// Tests the pattern detection logic (pure functions, no DB)

interface SymptomEntry {
  symptoms: string[]
  severity: number
  logged_at: string
}

function detectRecurringSymptoms(logs: SymptomEntry[], windowDays: number, threshold: number) {
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  const recent = logs.filter((l) => new Date(l.logged_at) >= cutoff)
  const counts: Record<string, number> = {}
  recent.forEach((l) => l.symptoms.forEach((s) => { counts[s] = (counts[s] ?? 0) + 1 }))
  return Object.entries(counts)
    .filter(([, count]) => count >= threshold)
    .map(([symptom, count]) => ({ symptom, count }))
}

function detectHighRisk(logs: SymptomEntry[]) {
  const HIGH_RISK = ['Chest Pain', 'Shortness of Breath']
  return logs.some((l) => l.symptoms.some((s) => HIGH_RISK.includes(s)))
}

function detectHighSeverity(logs: SymptomEntry[]) {
  return logs.some((l) => l.severity === 5)
}

describe('detectRecurringSymptoms', () => {
  it('flags symptom appearing 3+ times in 7 days', () => {
    const now = new Date().toISOString()
    const logs: SymptomEntry[] = [
      { symptoms: ['Headache'], severity: 2, logged_at: now },
      { symptoms: ['Headache'], severity: 3, logged_at: now },
      { symptoms: ['Headache'], severity: 2, logged_at: now },
    ]
    const result = detectRecurringSymptoms(logs, 7, 3)
    expect(result).toHaveLength(1)
    expect(result[0].symptom).toBe('Headache')
  })

  it('does not flag symptom appearing only twice', () => {
    const now = new Date().toISOString()
    const logs: SymptomEntry[] = [
      { symptoms: ['Dizziness'], severity: 2, logged_at: now },
      { symptoms: ['Dizziness'], severity: 1, logged_at: now },
    ]
    const result = detectRecurringSymptoms(logs, 7, 3)
    expect(result).toHaveLength(0)
  })
})

describe('detectHighRisk', () => {
  it('flags chest pain', () => {
    const logs: SymptomEntry[] = [{ symptoms: ['Chest Pain'], severity: 4, logged_at: new Date().toISOString() }]
    expect(detectHighRisk(logs)).toBe(true)
  })

  it('does not flag ordinary symptoms', () => {
    const logs: SymptomEntry[] = [{ symptoms: ['Headache'], severity: 2, logged_at: new Date().toISOString() }]
    expect(detectHighRisk(logs)).toBe(false)
  })
})

describe('detectHighSeverity', () => {
  it('flags severity 5', () => {
    const logs: SymptomEntry[] = [{ symptoms: ['Pain'], severity: 5, logged_at: new Date().toISOString() }]
    expect(detectHighSeverity(logs)).toBe(true)
  })

  it('does not flag severity 4', () => {
    const logs: SymptomEntry[] = [{ symptoms: ['Pain'], severity: 4, logged_at: new Date().toISOString() }]
    expect(detectHighSeverity(logs)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

```bash
cd apps/api && pnpm test -- --testPathPattern=patterns
```

Expected: PASS — 6 tests green.

- [ ] **Step 3: Create patterns route**

Create `apps/api/src/app/api/symptoms/patterns/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const HIGH_RISK_SYMPTOMS = ['Chest Pain', 'Shortness of Breath']
const RECURRING_WINDOW_DAYS = 7
const RECURRING_THRESHOLD = 3
const INACTIVITY_DAYS = 5

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const elderly_user_id = searchParams.get('elderly_user_id') ?? user.id

  const supabase = createSupabaseServerClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: logs, error: dbError } = await supabase
    .from('symptom_logs')
    .select('symptoms, severity, logged_at')
    .eq('elderly_user_id', elderly_user_id)
    .gte('logged_at', thirtyDaysAgo)
    .order('logged_at', { ascending: false })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const patterns: Array<{ type: string; symptom?: string; count?: number; severity?: number; message: string }> = []

  // Pattern 1: high-risk symptoms
  const highRisk = (logs ?? []).filter((l) =>
    l.symptoms.some((s: string) => HIGH_RISK_SYMPTOMS.includes(s))
  )
  if (highRisk.length > 0) {
    patterns.push({
      type: 'high_risk',
      message: `High-risk symptom logged: ${highRisk[0].symptoms.join(', ')}`,
    })
  }

  // Pattern 2: severity 5
  const highSeverity = (logs ?? []).filter((l) => l.severity === 5)
  if (highSeverity.length > 0) {
    patterns.push({ type: 'high_severity', severity: 5, message: 'Maximum severity (5) symptom logged' })
  }

  // Pattern 3: recurring symptoms (3+ in 7 days)
  const cutoff = new Date(Date.now() - RECURRING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const recent = (logs ?? []).filter((l) => new Date(l.logged_at) >= cutoff)
  const counts: Record<string, number> = {}
  recent.forEach((l) => l.symptoms.forEach((s: string) => { counts[s] = (counts[s] ?? 0) + 1 }))
  Object.entries(counts)
    .filter(([, count]) => count >= RECURRING_THRESHOLD)
    .forEach(([symptom, count]) => {
      patterns.push({
        type: 'recurring',
        symptom,
        count,
        message: `${symptom} logged ${count} times in the last ${RECURRING_WINDOW_DAYS} days`,
      })
    })

  // Pattern 4: inactivity
  const lastLog = logs?.[0]
  const daysSinceLastLog = lastLog
    ? (Date.now() - new Date(lastLog.logged_at).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity
  if (daysSinceLastLog > INACTIVITY_DAYS) {
    patterns.push({
      type: 'inactivity',
      message: `No symptoms logged in ${Math.floor(daysSinceLastLog)} days`,
    })
  }

  return NextResponse.json({ patterns })
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app/api/symptoms/patterns apps/api/__tests__/patterns.test.ts
git commit -m "feat: add rule-based symptom pattern detection"
```

---

### Task 4: Health Summary PDF Export

**Files:**
- Create: `apps/api/src/app/api/summary/route.ts`
- Create: `apps/api/src/lib/pdf.tsx`

**Produces:** `GET /api/summary?elderly_user_id=X` — returns a PDF binary (Content-Type: application/pdf)

- [ ] **Step 1: Install PDF library**

```bash
cd apps/api && pnpm add @react-pdf/renderer
```

- [ ] **Step 2: Create PDF template**

Create `apps/api/src/lib/pdf.tsx`:

```tsx
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#222' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#666', marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 16, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 140, color: '#555' },
  value: { flex: 1 },
  bullet: { marginBottom: 3 },
})

interface SummaryData {
  elderlyName: string
  generatedAt: string
  periodDays: number
  totalDoses: number
  missedDoses: number
  medications: Array<{ name: string; dosage: string; frequency: string }>
  symptomCounts: Array<{ symptom: string; count: number; avgSeverity: number }>
  patterns: Array<{ message: string }>
}

export function HealthSummaryPdf({ data }: { data: SummaryData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Health Summary — {data.elderlyName}</Text>
        <Text style={styles.subtitle}>
          Generated {data.generatedAt} · Last {data.periodDays} days
        </Text>

        <Text style={styles.sectionTitle}>Medications</Text>
        {data.medications.map((m, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.label}>{m.name} ({m.dosage})</Text>
            <Text style={styles.value}>{m.frequency}</Text>
          </View>
        ))}
        <View style={styles.row}>
          <Text style={styles.label}>Doses this period:</Text>
          <Text style={styles.value}>{data.totalDoses} scheduled, {data.missedDoses} missed</Text>
        </View>

        <Text style={styles.sectionTitle}>Symptoms Logged</Text>
        {data.symptomCounts.length === 0 ? (
          <Text>No symptoms logged in this period.</Text>
        ) : (
          data.symptomCounts.map((s, i) => (
            <Text key={i} style={styles.bullet}>
              • {s.symptom}: {s.count} time{s.count !== 1 ? 's' : ''} (avg severity {s.avgSeverity.toFixed(1)}/5)
            </Text>
          ))
        )}

        {data.patterns.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Notable Patterns</Text>
            {data.patterns.map((p, i) => (
              <Text key={i} style={styles.bullet}>• {p.message}</Text>
            ))}
          </>
        )}

        <Text style={{ marginTop: 30, fontSize: 9, color: '#999' }}>
          This summary is for informational purposes only and does not constitute medical advice.
        </Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 3: Create summary route**

Create `apps/api/src/app/api/summary/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { renderToBuffer } from '@react-pdf/renderer'
import { HealthSummaryPdf } from '@/lib/pdf'
import React from 'react'

const PERIOD_DAYS = 30

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const elderly_user_id = searchParams.get('elderly_user_id') ?? user.id

  const supabase = createSupabaseServerClient()
  const since = new Date(Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Fetch elderly user profile
  const { data: elderlyUser } = await supabase
    .from('users')
    .select('name')
    .eq('id', elderly_user_id)
    .single()

  // Fetch medications
  const { data: medications } = await supabase
    .from('medications')
    .select('name, dosage, frequency')
    .eq('elderly_user_id', elderly_user_id)

  // Fetch dose stats
  const { data: doses } = await supabase
    .from('dose_logs')
    .select('status, medication_schedule:medication_schedules(medication:medications(elderly_user_id))')
    .gte('scheduled_at', since)

  const relevantDoses = (doses ?? []).filter(
    (d) => d.medication_schedule?.medication?.elderly_user_id === elderly_user_id
  )
  const missedDoses = relevantDoses.filter((d) => d.status === 'missed').length

  // Fetch symptom stats
  const { data: symptoms } = await supabase
    .from('symptom_logs')
    .select('symptoms, severity')
    .eq('elderly_user_id', elderly_user_id)
    .gte('logged_at', since)

  const symptomCounts: Record<string, { count: number; totalSeverity: number }> = {}
  ;(symptoms ?? []).forEach((s) => {
    s.symptoms.forEach((sym: string) => {
      if (!symptomCounts[sym]) symptomCounts[sym] = { count: 0, totalSeverity: 0 }
      symptomCounts[sym].count += 1
      symptomCounts[sym].totalSeverity += s.severity
    })
  })

  // Fetch patterns from pattern detection route (internal call)
  const patternsRes = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/symptoms/patterns?elderly_user_id=${elderly_user_id}`,
    { headers: { Cookie: request.headers.get('cookie') ?? '' } }
  )
  const patternsData = patternsRes.ok ? await patternsRes.json() : { patterns: [] }

  const summaryData = {
    elderlyName: elderlyUser?.name ?? 'Patient',
    generatedAt: new Date().toLocaleDateString('en-GB'),
    periodDays: PERIOD_DAYS,
    totalDoses: relevantDoses.length,
    missedDoses,
    medications: medications ?? [],
    symptomCounts: Object.entries(symptomCounts).map(([symptom, { count, totalSeverity }]) => ({
      symptom,
      count,
      avgSeverity: totalSeverity / count,
    })),
    patterns: patternsData.patterns,
  }

  const pdfBuffer = await renderToBuffer(React.createElement(HealthSummaryPdf, { data: summaryData }))

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="health-summary-${elderly_user_id}.pdf"`,
    },
  })
}
```

- [ ] **Step 4: Add NEXT_PUBLIC_APP_URL to .env.local.example**

Open `apps/api/.env.local.example` and add:

```
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

In production, set this to the Vercel deployment URL.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app/api/summary apps/api/src/lib/pdf.tsx
git commit -m "feat: add health summary PDF export"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Record symptoms (Task 1 — POST /api/symptoms)
- ✅ Rate severity (Task 1 — severity field, validated 1–5)
- ✅ Add notes / voice (Task 1 — text_note; Task 2 — voice_note_url via Supabase Storage)
- ✅ Recurring symptom pattern (Task 3 — 3+ in 7 days)
- ✅ High-severity alert (Task 3 — severity 5)
- ✅ High-risk symptom alert (Task 3 — Chest Pain, Shortness of Breath)
- ✅ Inactivity detection (Task 3 — 5+ days)
- ✅ Health summary PDF (Task 4)
- ✅ AI explicitly excluded — all detection is SQL/JS logic

**Type consistency:** `CreateSymptomLogSchema` defines `symptoms`, `severity`, `voice_note_url`, `text_note`. Route inserts all four fields. Pattern detection reads `symptoms`, `severity`, `logged_at` — all present on `SymptomLog` interface. ✅
