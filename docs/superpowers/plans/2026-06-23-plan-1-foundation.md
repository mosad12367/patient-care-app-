# Patient Health Companion — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the monorepo, create the Supabase database schema, define shared TypeScript types, and implement auth + invite API routes that all other plans depend on.

**Architecture:** pnpm workspaces monorepo with three packages (`apps/mobile`, `apps/api`, `packages/shared`). The mobile app never queries Supabase directly — all data flows through the Next.js API layer. Supabase Auth manages sessions; JWTs are validated in Next.js middleware on every protected route.

**Tech Stack:** pnpm 9+, Turborepo, Next.js 15 (App Router), Expo SDK 52, Supabase JS v2, @supabase/ssr, Zod 3, TypeScript 5 (strict)

## Global Constraints
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- TypeScript `strict: true` in all packages
- Every protected API route must call `requireAuth()` before any logic
- Mobile app never imports from `@supabase/ssr` (server-only package)
- All table names are lowercase snake_case; all TypeScript types are PascalCase
- Supabase RLS enabled on every table — API-level checks are a second layer, not the only layer

---

## File Map

```
/
├── package.json                          # monorepo root, pnpm workspaces
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
│
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                  # barrel export
│           ├── types.ts                  # all DB entity interfaces
│           └── schemas.ts               # Zod schemas for API payloads
│
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.ts
│   │   ├── .env.local.example
│   │   ├── middleware.ts                 # JWT auth guard for all /api routes
│   │   ├── supabase/
│   │   │   └── migrations/
│   │   │       └── 001_initial_schema.sql
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── supabase-server.ts    # createServerClient() helper
│   │       │   └── auth.ts              # requireAuth() helper
│   │       └── app/
│   │           └── api/
│   │               ├── auth/
│   │               │   ├── register/route.ts
│   │               │   ├── login/route.ts
│   │               │   └── logout/route.ts
│   │               └── invites/
│   │                   ├── route.ts          # POST (create invite)
│   │                   └── [token]/route.ts  # POST (accept invite)
│   │
│   └── mobile/
│       ├── package.json
│       ├── tsconfig.json
│       ├── app.json
│       └── src/
│           └── lib/
│               ├── supabase.ts           # createClient() for mobile
│               └── api.ts               # typed fetch wrapper pointing at API
```

---

### Task 1: Monorepo Root Scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "patient-health-companion",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
.next/
dist/
.env.local
*.tsbuildinfo
.turbo/
```

- [ ] **Step 6: Install root dependencies**

```bash
pnpm install
```

Expected: `node_modules/.pnpm` directory created, no errors.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: monorepo root scaffold"
```

---

### Task 2: Shared Types Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/schemas.ts`
- Create: `packages/shared/src/index.ts`

**Produces:** `UserRole`, `User`, `Relationship`, `Medication`, `MedicationSchedule`, `DoseLog`, `SymptomLog`, `DoseStatus`, `RelationshipRole`, `RelationshipStatus` — used by Tasks 4, 5, 6 and all later plans.

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@phc/shared",
  "version": "0.0.1",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  },
  "dependencies": {
    "zod": "^3.23.0"
  }
}
```

- [ ] **Step 2: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/shared/src/types.ts**

```typescript
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
```

- [ ] **Step 4: Create packages/shared/src/schemas.ts**

```typescript
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
```

- [ ] **Step 5: Create packages/shared/src/index.ts**

```typescript
export * from './types'
export * from './schemas'
```

- [ ] **Step 6: Build the shared package**

```bash
cd packages/shared && pnpm build
```

Expected: `packages/shared/dist/` directory created with `index.js`, `index.d.ts`, `types.js`, `types.d.ts`, `schemas.js`, `schemas.d.ts`.

- [ ] **Step 7: Commit**

```bash
git add packages/shared
git commit -m "feat: add shared types and Zod schemas"
```

---

### Task 3: Supabase Schema Migration

**Files:**
- Create: `apps/api/supabase/migrations/001_initial_schema.sql`

**Produces:** All database tables and RLS policies that every API route depends on.

- [ ] **Step 1: Create the migration file**

Create `apps/api/supabase/migrations/001_initial_schema.sql`:

```sql
-- Extensions
create extension if not exists "uuid-ossp";

-- Users (mirrors auth.users, stores app-specific fields)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null unique,
  name text not null,
  phone text,
  role text not null check (role in ('elderly', 'caregiver', 'doctor')),
  created_at timestamptz not null default now()
);

-- Relationships (invite-based connections)
create table public.relationships (
  id uuid primary key default uuid_generate_v4(),
  elderly_user_id uuid not null references public.users(id) on delete cascade,
  connected_user_id uuid references public.users(id) on delete cascade,
  role text not null check (role in ('caregiver', 'doctor')),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  invitee_email text not null,
  invite_token text unique not null,
  invite_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(elderly_user_id, invitee_email)
);

-- Medications
create table public.medications (
  id uuid primary key default uuid_generate_v4(),
  elderly_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  dosage text not null,
  frequency text not null,
  start_date date not null,
  end_date date,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

-- Medication schedules
create table public.medication_schedules (
  id uuid primary key default uuid_generate_v4(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  scheduled_time time not null,
  days_of_week integer[] not null check (array_length(days_of_week, 1) > 0),
  created_at timestamptz not null default now()
);

-- Dose logs
create table public.dose_logs (
  id uuid primary key default uuid_generate_v4(),
  medication_schedule_id uuid not null references public.medication_schedules(id) on delete cascade,
  scheduled_at timestamptz not null,
  taken_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'taken', 'missed')),
  sms_sent boolean not null default false,
  created_at timestamptz not null default now()
);

-- Symptom logs
create table public.symptom_logs (
  id uuid primary key default uuid_generate_v4(),
  elderly_user_id uuid not null references public.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  symptoms text[] not null check (array_length(symptoms, 1) > 0),
  severity integer not null check (severity between 1 and 5),
  voice_note_url text,
  text_note text,
  created_at timestamptz not null default now()
);

-- RLS: enable on all tables
alter table public.users enable row level security;
alter table public.relationships enable row level security;
alter table public.medications enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.dose_logs enable row level security;
alter table public.symptom_logs enable row level security;

-- users: users can read/update their own row
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- relationships: elderly user can manage their own relationships
create policy "relationships_select_own" on public.relationships
  for select using (
    auth.uid() = elderly_user_id or auth.uid() = connected_user_id
  );

create policy "relationships_insert_elderly" on public.relationships
  for insert with check (auth.uid() = elderly_user_id);

create policy "relationships_delete_elderly" on public.relationships
  for delete using (auth.uid() = elderly_user_id);

-- medications: elderly user can view; caregivers with accepted relationship can view and write
create policy "medications_select" on public.medications
  for select using (
    auth.uid() = elderly_user_id
    or exists (
      select 1 from public.relationships r
      where r.elderly_user_id = medications.elderly_user_id
        and r.connected_user_id = auth.uid()
        and r.status = 'accepted'
    )
  );

create policy "medications_insert_caregiver" on public.medications
  for insert with check (
    exists (
      select 1 from public.relationships r
      where r.elderly_user_id = medications.elderly_user_id
        and r.connected_user_id = auth.uid()
        and r.role = 'caregiver'
        and r.status = 'accepted'
    )
  );

create policy "medications_update_caregiver" on public.medications
  for update using (
    exists (
      select 1 from public.relationships r
      where r.elderly_user_id = medications.elderly_user_id
        and r.connected_user_id = auth.uid()
        and r.role = 'caregiver'
        and r.status = 'accepted'
    )
  );

-- dose_logs: elderly user and caregivers can view; elderly user can update status
create policy "dose_logs_select" on public.dose_logs
  for select using (
    exists (
      select 1 from public.medication_schedules ms
      join public.medications m on m.id = ms.medication_id
      where ms.id = dose_logs.medication_schedule_id
        and (
          m.elderly_user_id = auth.uid()
          or exists (
            select 1 from public.relationships r
            where r.elderly_user_id = m.elderly_user_id
              and r.connected_user_id = auth.uid()
              and r.status = 'accepted'
          )
        )
    )
  );

create policy "dose_logs_update_elderly" on public.dose_logs
  for update using (
    exists (
      select 1 from public.medication_schedules ms
      join public.medications m on m.id = ms.medication_id
      where ms.id = dose_logs.medication_schedule_id
        and m.elderly_user_id = auth.uid()
    )
  );

-- symptom_logs: elderly user can insert and view; caregivers with accepted relationship can view
create policy "symptom_logs_select" on public.symptom_logs
  for select using (
    auth.uid() = elderly_user_id
    or exists (
      select 1 from public.relationships r
      where r.elderly_user_id = symptom_logs.elderly_user_id
        and r.connected_user_id = auth.uid()
        and r.status = 'accepted'
    )
  );

create policy "symptom_logs_insert_elderly" on public.symptom_logs
  for insert with check (auth.uid() = elderly_user_id);
```

- [ ] **Step 2: Apply the migration**

In the Supabase dashboard → SQL Editor, paste and run the contents of `001_initial_schema.sql`.

Alternatively via Supabase CLI (if installed):
```bash
supabase db push
```

Expected: all 6 tables visible in Table Editor. RLS shown as "enabled" on each.

- [ ] **Step 3: Verify tables exist**

In Supabase dashboard → Table Editor, confirm these tables exist:
`users`, `relationships`, `medications`, `medication_schedules`, `dose_logs`, `symptom_logs`

- [ ] **Step 4: Commit**

```bash
git add apps/api/supabase
git commit -m "feat: add initial Supabase schema migration with RLS policies"
```

---

### Task 4: API Foundation (Next.js Setup + Supabase Clients)

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/next.config.ts`
- Create: `apps/api/.env.local.example`
- Create: `apps/api/middleware.ts`
- Create: `apps/api/src/lib/supabase-server.ts`
- Create: `apps/api/src/lib/auth.ts`

**Consumes:** `@phc/shared` types from Task 2.
**Produces:** `createServerClient()`, `requireAuth(request)` — used by all route handlers in Tasks 5 and 6 and all later plans.

- [ ] **Step 1: Create apps/api/package.json**

```json
{
  "name": "@phc/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start",
    "test": "jest"
  },
  "dependencies": {
    "@phc/shared": "workspace:*",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.43.0",
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create apps/api/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "jsx": "preserve",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "middleware.ts", "next.config.ts"]
}
```

- [ ] **Step 3: Create apps/api/next.config.ts**

```typescript
import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@phc/shared'],
}

export default config
```

- [ ] **Step 4: Create apps/api/.env.local.example**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_FROM_NUMBER=+1234567890
```

Copy this to `.env.local` and fill in real values from Supabase dashboard → Project Settings → API.

- [ ] **Step 5: Create apps/api/src/lib/supabase-server.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

export function createSupabaseAdminClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 6: Create apps/api/src/lib/auth.ts**

```typescript
import { createSupabaseServerClient } from './supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@phc/shared'

export async function requireAuth(request: NextRequest): Promise<
  { user: User; error: null } | { user: null; error: NextResponse }
> {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return {
      user: null,
      error: NextResponse.json({ error: 'User profile not found' }, { status: 404 }),
    }
  }

  return { user: profile as User, error: null }
}
```

- [ ] **Step 7: Create apps/api/middleware.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ['/api/:path*'],
}
```

- [ ] **Step 8: Install dependencies and verify build**

```bash
cd apps/api && pnpm install && pnpm build
```

Expected: Next.js build succeeds with no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add apps/api
git commit -m "feat: add Next.js API foundation with Supabase server client and auth helper"
```

---

### Task 5: Auth API Routes

**Files:**
- Create: `apps/api/src/app/api/auth/register/route.ts`
- Create: `apps/api/src/app/api/auth/login/route.ts`
- Create: `apps/api/src/app/api/auth/logout/route.ts`
- Create: `apps/api/src/app/api/auth/me/route.ts`
- Create: `apps/api/__tests__/auth.test.ts`

**Consumes:** `createSupabaseServerClient()` from Task 4, `RegisterSchema`, `LoginSchema` from Task 2.
**Produces:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` — used by mobile app in Plan 4.

- [ ] **Step 1: Write the failing test**

Create `apps/api/__tests__/auth.test.ts`:

```typescript
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
```

- [ ] **Step 2: Add jest config to apps/api/package.json**

Add to `apps/api/package.json`:

```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "moduleNameMapper": {
    "^@phc/shared$": "<rootDir>/../../packages/shared/src/index.ts"
  }
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/api && pnpm test
```

Expected: FAIL — `@phc/shared` may not resolve yet if shared package isn't built. Run `cd ../../packages/shared && pnpm build` first, then re-run.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/api && pnpm test
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Create register route**

Create `apps/api/src/app/api/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { RegisterSchema } from '@phc/shared'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = RegisterSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password, name, phone, role } = parsed.data
  const supabase = createSupabaseServerClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Registration failed' }, { status: 400 })
  }

  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    email,
    name,
    phone: phone ?? null,
    role,
  })

  if (profileError) {
    return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
  }

  return NextResponse.json({ user: authData.user }, { status: 201 })
}
```

- [ ] **Step 6: Create login route**

Create `apps/api/src/app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { LoginSchema } from '@phc/shared'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = LoginSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, password } = parsed.data
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  return NextResponse.json({ session: data.session, user: data.user })
}
```

- [ ] **Step 7: Create logout route**

Create `apps/api/src/app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST() {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 8: Create me route**

Create `apps/api/src/app/api/auth/me/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error
  return NextResponse.json({ user })
}
```

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/app/api/auth apps/api/__tests__
git commit -m "feat: add auth API routes (register, login, logout, me)"
```

---

### Task 6: Invite System API Routes

**Files:**
- Create: `apps/api/src/app/api/invites/route.ts`
- Create: `apps/api/src/app/api/invites/[token]/route.ts`
- Create: `apps/api/__tests__/invites.test.ts`

**Consumes:** `requireAuth()` from Task 4, `CreateInviteSchema` from Task 2, `relationships` table from Task 3.
**Produces:** `POST /api/invites` (create invite), `POST /api/invites/:token` (accept invite), `GET /api/invites` (list connections) — used by mobile app Family screen in Plan 4.

- [ ] **Step 1: Write the failing test**

Add to `apps/api/__tests__/invites.test.ts`:

```typescript
import { CreateInviteSchema } from '@phc/shared'

describe('CreateInviteSchema', () => {
  it('accepts valid caregiver invite', () => {
    const result = CreateInviteSchema.safeParse({
      invitee_email: 'ahmed@example.com',
      invitee_role: 'caregiver',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const result = CreateInviteSchema.safeParse({
      invitee_email: 'ahmed@example.com',
      invitee_role: 'admin',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = CreateInviteSchema.safeParse({
      invitee_email: 'notanemail',
      invitee_role: 'caregiver',
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

```bash
cd apps/api && pnpm test
```

Expected: PASS — 3 new tests green.

- [ ] **Step 3: Create invite routes**

Create `apps/api/src/app/api/invites/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { CreateInviteSchema } from '@phc/shared'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  const supabase = createSupabaseServerClient()
  const { data, error: dbError } = await supabase
    .from('relationships')
    .select(`
      *,
      connected_user:users!relationships_connected_user_id_fkey(id, name, email, role)
    `)
    .eq('elderly_user_id', user.id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ relationships: data })
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  if (user.role !== 'elderly') {
    return NextResponse.json({ error: 'Only elderly users can send invites' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = CreateInviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { invitee_email, invitee_role } = parsed.data
  const invite_token = randomUUID()
  const invite_expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  const supabase = createSupabaseServerClient()
  const { error: dbError } = await supabase.from('relationships').insert({
    elderly_user_id: user.id,
    invitee_email,
    role: invitee_role,
    invite_token,
    invite_expires_at,
  })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // In production: send invite_token via email using Supabase's email service or Resend
  // For MVP: return the token in the response so it can be sent manually / tested
  return NextResponse.json({ invite_token, expires_at: invite_expires_at }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  const { relationship_id } = await request.json()
  const supabase = createSupabaseServerClient()

  const { error: dbError } = await supabase
    .from('relationships')
    .delete()
    .eq('id', relationship_id)
    .eq('elderly_user_id', user.id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Create accept-invite route**

Create `apps/api/src/app/api/invites/[token]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  const supabase = createSupabaseServerClient()

  // Find the pending invite
  const { data: relationship, error: findError } = await supabase
    .from('relationships')
    .select('*')
    .eq('invite_token', params.token)
    .eq('status', 'pending')
    .single()

  if (findError || !relationship) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
  }

  if (new Date(relationship.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
  }

  if (relationship.invitee_email !== user.email) {
    return NextResponse.json({ error: 'This invite was sent to a different email' }, { status: 403 })
  }

  const { error: updateError } = await supabase
    .from('relationships')
    .update({ status: 'accepted', connected_user_id: user.id })
    .eq('id', relationship.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app/api/invites apps/api/__tests__/invites.test.ts
git commit -m "feat: add invite system API routes (create, accept, list, delete)"
```

---

### Task 7: Mobile App Foundation

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/src/lib/supabase.ts`
- Create: `apps/mobile/src/lib/api.ts`

**Consumes:** `@phc/shared` types from Task 2.
**Produces:** `api` client with `get()`, `post()`, `patch()`, `del()` — used by all mobile screens in Plan 4.

- [ ] **Step 1: Create apps/mobile/package.json**

```json
{
  "name": "@phc/mobile",
  "version": "0.0.1",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios"
  },
  "dependencies": {
    "@phc/shared": "workspace:*",
    "@supabase/supabase-js": "^2.43.0",
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-notifications": "~0.29.0",
    "expo-speech": "~13.0.0",
    "react": "18.3.1",
    "react-native": "0.76.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create apps/mobile/tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@phc/shared": ["../../packages/shared/src/index.ts"]
    }
  }
}
```

- [ ] **Step 3: Create apps/mobile/app.json**

```json
{
  "expo": {
    "name": "Health Companion",
    "slug": "patient-health-companion",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "phc",
    "userInterfaceStyle": "light",
    "ios": { "supportsTablet": false },
    "android": { "adaptiveIcon": { "backgroundColor": "#ffffff" } },
    "plugins": [
      "expo-router",
      ["expo-notifications", { "icon": "./assets/notification-icon.png" }]
    ]
  }
}
```

- [ ] **Step 4: Create apps/mobile/src/lib/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

- [ ] **Step 5: Create apps/mobile/src/lib/api.ts**

```typescript
import { supabase } from './supabase'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error ?? 'Request failed')
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
}
```

- [ ] **Step 6: Install dependencies**

```bash
cd apps/mobile && pnpm install
```

Expected: Expo packages installed, no peer dependency errors.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile
git commit -m "feat: add Expo mobile app foundation with Supabase client and typed API helper"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Monorepo with apps/mobile, apps/api, packages/shared (Task 1)
- ✅ Supabase schema — all 6 tables from spec (Task 3)
- ✅ RLS policies for all roles (Task 3)
- ✅ Email + password auth (Task 5)
- ✅ Invite-based connections, elderly user initiates (Task 6)
- ✅ 48-hour invite expiry (Task 6)
- ✅ Shared TypeScript types (Task 2)
- ✅ Mobile Supabase client with SecureStore session persistence (Task 7)

**Gaps:** None. Medication, reminders, symptoms, and UI are covered in Plans 2–4.

**Type consistency check:** `requireAuth()` returns `User` (from `@phc/shared`). All route handlers use `user.id`, `user.role`, `user.email` — all present on the `User` interface. ✅
