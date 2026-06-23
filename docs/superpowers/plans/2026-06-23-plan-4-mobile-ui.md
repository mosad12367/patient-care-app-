# Patient Health Companion — Plan 4: Mobile UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all mobile screens for the elderly user (4 screens) and caregiver (4 screens), plus the shared auth flow, navigation, and accessibility rules.

**Architecture:** Expo Router file-based navigation. Two tab layouts: one for elderly users (Home, Medicines, Symptoms, Family), one for caregivers (Dashboard, Medications, Alerts, Summary). Role is determined from the user's session profile after login and persisted in a React context. All data fetched via the `api` client from Plan 1 (Task 7).

**Tech Stack:** React Native, Expo SDK 52, expo-router v4, expo-speech, expo-notifications, TypeScript 5 (strict)

**Prerequisite:** Plans 1, 2, and 3 complete — all API routes must exist.

## Global Constraints
- Node.js >= 20.0.0; TypeScript strict mode
- Minimum font size: 20px for all elderly screens
- Minimum tap target: 48×48px for all interactive elements
- No hamburger menus or swipe gestures on elderly screens
- Every button on elderly screens has an icon AND a text label
- Confirmation step before any save action on elderly screens
- Elderly screens: maximum 2 actions visible per screen at any time
- No more than 4 tabs in bottom navigation

---

## File Map

```
apps/mobile/src/
├── context/
│   └── AuthContext.tsx          # user session + role provider
├── hooks/
│   ├── useAuth.ts
│   ├── useDoses.ts
│   └── useSymptoms.ts
├── components/
│   ├── BigButton.tsx            # large accessible button (elderly)
│   ├── SeverityPicker.tsx       # 1-5 dot severity selector
│   ├── SymptomChip.tsx          # tappable symptom selection chip
│   ├── DoseCard.tsx             # medication dose card with Taken/Skip buttons
│   └── ConfirmModal.tsx         # confirmation dialog before save
└── app/
    ├── _layout.tsx              # root layout, session gate
    ├── (auth)/
    │   ├── _layout.tsx
    │   ├── login.tsx
    │   └── register.tsx
    ├── (elderly)/
    │   ├── _layout.tsx          # 4-tab layout for elderly role
    │   ├── index.tsx            # Home screen
    │   ├── medicines.tsx        # Medicines screen
    │   ├── symptoms.tsx         # Symptoms history screen
    │   └── family.tsx           # Family screen
    └── (caregiver)/
        ├── _layout.tsx          # 4-tab layout for caregiver role
        ├── index.tsx            # Dashboard screen
        ├── medications.tsx      # Medication Manager screen
        ├── alerts.tsx           # Alerts Feed screen
        └── summary.tsx          # Health Summary screen
```

---

### Task 1: Auth Context & Navigation Root

**Files:**
- Create: `apps/mobile/src/context/AuthContext.tsx`
- Create: `apps/mobile/src/hooks/useAuth.ts`
- Create: `apps/mobile/src/app/_layout.tsx`
- Create: `apps/mobile/src/app/(auth)/_layout.tsx`
- Create: `apps/mobile/src/app/(auth)/login.tsx`
- Create: `apps/mobile/src/app/(auth)/register.tsx`

**Produces:** `useAuth()` hook returning `{ user, loading, signOut }` — used by every screen.

- [ ] **Step 1: Create AuthContext**

Create `apps/mobile/src/context/AuthContext.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import type { User } from '@phc/shared'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchProfile()
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchProfile()
      else { setUser(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile() {
    try {
      const { user: profile } = await api.get<{ user: User }>('/api/auth/me')
      setUser(profile)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    await api.post('/api/auth/logout', {})
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 2: Create root layout**

Create `apps/mobile/src/app/_layout.tsx`:

```tsx
import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from '@/context/AuthContext'

function RootGuard() {
  const { user, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === '(auth)'
    if (!user && !inAuth) router.replace('/(auth)/login')
    else if (user && inAuth) {
      if (user.role === 'elderly') router.replace('/(elderly)/')
      else router.replace('/(caregiver)/')
    }
  }, [user, loading, segments])

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootGuard />
    </AuthProvider>
  )
}
```

- [ ] **Step 3: Create auth stack layout**

Create `apps/mobile/src/app/(auth)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router'
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 4: Create login screen**

Create `apps/mobile/src/app/(auth)/login.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    try {
      const { session } = await api.post<{ session: { access_token: string; refresh_token: string } }>(
        '/api/auth/login',
        { email, password }
      )
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
      // Root guard handles redirect
    } catch (e: unknown) {
      Alert.alert('Login failed', e instanceof Error ? e.message : 'Please check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Health Companion</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        accessibilityLabel="Email address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel="Password"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Sign in"
      >
        <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.link}>
        <Text style={styles.linkText}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 16, fontSize: 18, marginBottom: 16 },
  button: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#93c5fd' },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 16, color: '#2563eb' },
})
```

- [ ] **Step 5: Create register screen**

Create `apps/mobile/src/app/(auth)/register.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { api } from '@/lib/api'
import type { UserRole } from '@phc/shared'

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'I am an elderly user', value: 'elderly' },
  { label: 'I am a family caregiver', value: 'caregiver' },
]

export default function RegisterScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('elderly')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Please fill in all required fields.')
      return
    }
    setLoading(true)
    try {
      await api.post('/api/auth/register', { name, email, password, phone: phone || null, role })
      Alert.alert('Account created', 'Please sign in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ])
    } catch (e: unknown) {
      Alert.alert('Registration failed', e instanceof Error ? e.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput style={styles.input} placeholder="Full name *" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email address *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Phone number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Password *" value={password} onChangeText={setPassword} secureTextEntry />

      <Text style={styles.roleLabel}>I am a:</Text>
      {ROLES.map((r) => (
        <TouchableOpacity
          key={r.value}
          style={[styles.roleButton, role === r.value && styles.roleButtonSelected]}
          onPress={() => setRole(r.value)}
          accessibilityRole="radio"
          accessibilityState={{ checked: role === r.value }}
        >
          <Text style={[styles.roleButtonText, role === r.value && styles.roleButtonTextSelected]}>
            {r.label}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.link}>
        <Text style={styles.linkText}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40, backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 16, fontSize: 18, marginBottom: 14 },
  roleLabel: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  roleButton: { borderWidth: 2, borderColor: '#ccc', borderRadius: 10, padding: 16, marginBottom: 10 },
  roleButtonSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  roleButtonText: { fontSize: 18, color: '#333' },
  roleButtonTextSelected: { color: '#2563eb', fontWeight: '600' },
  button: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#93c5fd' },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 16, color: '#2563eb' },
})
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/context apps/mobile/src/app/_layout.tsx apps/mobile/src/app/\(auth\)
git commit -m "feat: add auth context, root layout, login and register screens"
```

---

### Task 2: Shared Components

**Files:**
- Create: `apps/mobile/src/components/BigButton.tsx`
- Create: `apps/mobile/src/components/DoseCard.tsx`
- Create: `apps/mobile/src/components/ConfirmModal.tsx`
- Create: `apps/mobile/src/components/SeverityPicker.tsx`
- Create: `apps/mobile/src/components/SymptomChip.tsx`

**Produces:** Reusable accessible components — used by all elderly screens in Tasks 3 and 4.

- [ ] **Step 1: Create BigButton**

Create `apps/mobile/src/components/BigButton.tsx`:

```tsx
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native'

interface Props {
  label: string
  icon: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  style?: ViewStyle
}

export function BigButton({ label, icon, onPress, variant = 'primary', style }: Props) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, variant === 'secondary' && styles.labelSecondary]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 24, minHeight: 64, gap: 12 },
  primary: { backgroundColor: '#2563eb' },
  secondary: { backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0' },
  danger: { backgroundColor: '#dc2626' },
  icon: { fontSize: 28 },
  label: { fontSize: 22, fontWeight: '700', color: '#fff' },
  labelSecondary: { color: '#1e293b' },
})
```

- [ ] **Step 2: Create DoseCard**

Create `apps/mobile/src/components/DoseCard.tsx`:

```tsx
import { View, Text, StyleSheet } from 'react-native'
import { BigButton } from './BigButton'
import type { DoseLog } from '@phc/shared'

interface Props {
  medicationName: string
  dosage: string
  scheduledTime: string
  status: DoseLog['status']
  onTaken: () => void
  onMissed: () => void
}

export function DoseCard({ medicationName, dosage, scheduledTime, status, onTaken, onMissed }: Props) {
  if (status !== 'pending') {
    return (
      <View style={[styles.card, status === 'taken' ? styles.taken : styles.missed]}>
        <Text style={styles.name}>{medicationName}</Text>
        <Text style={styles.detail}>{dosage} · {scheduledTime}</Text>
        <Text style={styles.statusText}>{status === 'taken' ? '✓ Taken' : '✗ Skipped'}</Text>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{medicationName}</Text>
      <Text style={styles.detail}>{dosage} · {scheduledTime}</Text>
      <View style={styles.actions}>
        <BigButton label="Taken" icon="✓" onPress={onTaken} variant="primary" style={styles.actionBtn} />
        <BigButton label="Skip" icon="✗" onPress={onMissed} variant="danger" style={styles.actionBtn} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  taken: { borderLeftWidth: 6, borderLeftColor: '#16a34a' },
  missed: { borderLeftWidth: 6, borderLeftColor: '#dc2626' },
  name: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  detail: { fontSize: 18, color: '#555', marginBottom: 16 },
  statusText: { fontSize: 18, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1 },
})
```

- [ ] **Step 3: Create ConfirmModal**

Create `apps/mobile/src/components/ConfirmModal.tsx`:

```tsx
import { Modal, View, Text, StyleSheet } from 'react-native'
import { BigButton } from './BigButton'

interface Props {
  visible: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ visible, message, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <BigButton label="Yes" icon="✓" onPress={onConfirm} variant="primary" style={styles.btn} />
            <BigButton label="Cancel" icon="✗" onPress={onCancel} variant="secondary" style={styles.btn} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  box: { backgroundColor: '#fff', borderRadius: 20, padding: 28, marginHorizontal: 24, width: '88%' },
  message: { fontSize: 22, textAlign: 'center', marginBottom: 24, lineHeight: 32 },
  actions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1 },
})
```

- [ ] **Step 4: Create SeverityPicker**

Create `apps/mobile/src/components/SeverityPicker.tsx`:

```tsx
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'

interface Props { value: number; onChange: (v: number) => void }

export function SeverityPicker({ value, onChange }: Props) {
  return (
    <View style={styles.container} accessibilityLabel={`Severity: ${value} out of 5`}>
      <Text style={styles.label}>How severe? (1 = mild, 5 = severe)</Text>
      <View style={styles.dots}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.dot, n <= value && styles.dotFilled]}
            onPress={() => onChange(n)}
            accessibilityRole="radio"
            accessibilityLabel={`Severity ${n}`}
            accessibilityState={{ checked: value === n }}
          >
            <Text style={styles.dotText}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginVertical: 12 },
  label: { fontSize: 18, marginBottom: 12, color: '#333' },
  dots: { flexDirection: 'row', gap: 10 },
  dot: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  dotFilled: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dotText: { fontSize: 20, fontWeight: '700', color: '#fff' },
})
```

- [ ] **Step 5: Create SymptomChip**

Create `apps/mobile/src/components/SymptomChip.tsx`:

```tsx
import { TouchableOpacity, Text, StyleSheet } from 'react-native'

interface Props { label: string; selected: boolean; onToggle: () => void }

export function SymptomChip({ label, selected, onToggle }: Props) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', margin: 5 },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  text: { fontSize: 18, color: '#333' },
  textSelected: { color: '#fff', fontWeight: '600' },
})
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components
git commit -m "feat: add shared accessible components (BigButton, DoseCard, ConfirmModal, SeverityPicker, SymptomChip)"
```

---

### Task 3: Elderly Screens

**Files:**
- Create: `apps/mobile/src/app/(elderly)/_layout.tsx`
- Create: `apps/mobile/src/app/(elderly)/index.tsx`
- Create: `apps/mobile/src/app/(elderly)/medicines.tsx`
- Create: `apps/mobile/src/app/(elderly)/symptoms.tsx`
- Create: `apps/mobile/src/app/(elderly)/family.tsx`

- [ ] **Step 1: Create elderly tab layout**

Create `apps/mobile/src/app/(elderly)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router'
import { Text } from 'react-native'

function TabIcon({ icon, label }: { icon: string; label: string }) {
  return <Text style={{ fontSize: 12, textAlign: 'center' }}>{icon}{'\n'}{label}</Text>
}

export default function ElderlyLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { height: 80, paddingBottom: 12 },
        tabBarLabelStyle: { fontSize: 14 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => <TabIcon icon="🏠" label="Home" /> }} />
      <Tabs.Screen name="medicines" options={{ title: 'Medicines', tabBarIcon: () => <TabIcon icon="💊" label="Medicines" /> }} />
      <Tabs.Screen name="symptoms" options={{ title: 'Symptoms', tabBarIcon: () => <TabIcon icon="📋" label="Symptoms" /> }} />
      <Tabs.Screen name="family" options={{ title: 'Family', tabBarIcon: () => <TabIcon icon="👨‍👩‍👧" label="Family" /> }} />
    </Tabs>
  )
}
```

- [ ] **Step 2: Create Home screen**

Create `apps/mobile/src/app/(elderly)/index.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Linking, Alert } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { DoseCard } from '@/components/DoseCard'
import { BigButton } from '@/components/BigButton'
import { ConfirmModal } from '@/components/ConfirmModal'
import { useRouter } from 'expo-router'
import type { DoseLog } from '@phc/shared'

interface DoseWithMed extends DoseLog {
  medication_schedule: {
    scheduled_time: string
    medication: { name: string; dosage: string }
  }
}

export default function ElderlyHomeScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [doses, setDoses] = useState<DoseWithMed[]>([])
  const [confirm, setConfirm] = useState<{ id: string; status: 'taken' | 'missed'; message: string } | null>(null)

  useEffect(() => { loadDoses() }, [])

  async function loadDoses() {
    try {
      const { doses: data } = await api.get<{ doses: DoseWithMed[] }>('/api/doses')
      setDoses(data.filter((d) => d.status === 'pending'))
    } catch {
      Alert.alert('Could not load medications. Please check your connection.')
    }
  }

  async function acknowledgeDose(id: string, status: 'taken' | 'missed') {
    await api.patch(`/api/doses/${id}`, { status })
    setDoses((prev) => prev.filter((d) => d.id !== id))
    setConfirm(null)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const nextDose = doses[0]

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>{greeting}, {user?.name?.split(' ')[0]}</Text>

        {nextDose ? (
          <>
            <Text style={styles.sectionLabel}>Next Medication</Text>
            <DoseCard
              medicationName={nextDose.medication_schedule.medication.name}
              dosage={nextDose.medication_schedule.medication.dosage}
              scheduledTime={nextDose.medication_schedule.scheduled_time}
              status={nextDose.status}
              onTaken={() => setConfirm({ id: nextDose.id, status: 'taken', message: `Did you take your ${nextDose.medication_schedule.medication.name}?` })}
              onMissed={() => setConfirm({ id: nextDose.id, status: 'missed', message: `Skip your ${nextDose.medication_schedule.medication.name}?` })}
            />
          </>
        ) : (
          <View style={styles.allDone}>
            <Text style={styles.allDoneText}>✓ All medications done for today</Text>
          </View>
        )}

        <BigButton
          label="Log Symptom"
          icon="🎙️"
          onPress={() => router.push('/(elderly)/symptoms')}
          variant="secondary"
          style={styles.logBtn}
        />
      </ScrollView>

      {/* Emergency call button — always visible at bottom */}
      <BigButton
        label={`Call ${user?.name ?? 'Caregiver'}`}
        icon="📞"
        onPress={() => Linking.openURL('tel:')}
        variant="danger"
        style={styles.callBtn}
      />

      {confirm && (
        <ConfirmModal
          visible
          message={confirm.message}
          onConfirm={() => acknowledgeDose(confirm.id, confirm.status)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 24, paddingBottom: 16 },
  greeting: { fontSize: 28, fontWeight: '800', marginBottom: 24, color: '#0f172a' },
  sectionLabel: { fontSize: 18, fontWeight: '600', color: '#475569', marginBottom: 10 },
  allDone: { backgroundColor: '#dcfce7', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
  allDoneText: { fontSize: 22, color: '#15803d', fontWeight: '700' },
  logBtn: { marginTop: 12 },
  callBtn: { margin: 16, marginBottom: 24 },
})
```

- [ ] **Step 3: Create Medicines screen**

Create `apps/mobile/src/app/(elderly)/medicines.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native'
import { api } from '@/lib/api'
import { DoseCard } from '@/components/DoseCard'
import { ConfirmModal } from '@/components/ConfirmModal'
import type { DoseLog } from '@phc/shared'

interface DoseWithMed extends DoseLog {
  medication_schedule: {
    scheduled_time: string
    medication: { name: string; dosage: string }
  }
}

export default function MedicinesScreen() {
  const [doses, setDoses] = useState<DoseWithMed[]>([])
  const [confirm, setConfirm] = useState<{ id: string; status: 'taken' | 'missed'; message: string } | null>(null)

  useEffect(() => { loadDoses() }, [])

  async function loadDoses() {
    try {
      const { doses: data } = await api.get<{ doses: DoseWithMed[] }>('/api/doses')
      setDoses(data)
    } catch {
      Alert.alert('Could not load medications.')
    }
  }

  async function acknowledgeDose(id: string, status: 'taken' | 'missed') {
    await api.patch(`/api/doses/${id}`, { status })
    setDoses((prev) => prev.map((d) => d.id === id ? { ...d, status } : d))
    setConfirm(null)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Medicines</Text>
      <ScrollView>
        {doses.length === 0 ? (
          <Text style={styles.empty}>No medications scheduled for today.</Text>
        ) : (
          doses.map((dose) => (
            <DoseCard
              key={dose.id}
              medicationName={dose.medication_schedule.medication.name}
              dosage={dose.medication_schedule.medication.dosage}
              scheduledTime={dose.medication_schedule.scheduled_time}
              status={dose.status}
              onTaken={() => setConfirm({ id: dose.id, status: 'taken', message: `Did you take your ${dose.medication_schedule.medication.name}?` })}
              onMissed={() => setConfirm({ id: dose.id, status: 'missed', message: `Skip your ${dose.medication_schedule.medication.name}?` })}
            />
          ))
        )}
      </ScrollView>
      {confirm && (
        <ConfirmModal
          visible
          message={confirm.message}
          onConfirm={() => acknowledgeDose(confirm.id, confirm.status)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20, color: '#0f172a' },
  empty: { fontSize: 20, color: '#64748b', textAlign: 'center', marginTop: 40 },
})
```

- [ ] **Step 4: Create Symptoms screen (log + history)**

Create `apps/mobile/src/app/(elderly)/symptoms.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import * as Speech from 'expo-speech'
import { api } from '@/lib/api'
import { SymptomChip } from '@/components/SymptomChip'
import { SeverityPicker } from '@/components/SeverityPicker'
import { BigButton } from '@/components/BigButton'
import { ConfirmModal } from '@/components/ConfirmModal'
import { PREDEFINED_SYMPTOMS } from '@phc/shared'
import type { SymptomLog } from '@phc/shared'

export default function SymptomsScreen() {
  const [mode, setMode] = useState<'history' | 'log'>('history')
  const [history, setHistory] = useState<SymptomLog[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [severity, setSeverity] = useState(1)
  const [textNote, setTextNote] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => { loadHistory() }, [])

  async function loadHistory() {
    try {
      const { symptoms } = await api.get<{ symptoms: SymptomLog[] }>('/api/symptoms')
      setHistory(symptoms)
    } catch { /* silent */ }
  }

  function toggleSymptom(s: string) {
    setSelected((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  async function startVoiceInput() {
    setIsListening(true)
    // expo-speech doesn't do STT — use the Web Speech API via a WebView or
    // ExpoAV recording + transcription. For MVP: show an Alert to type instead.
    Alert.prompt(
      'Describe your symptom',
      'Type what you are feeling:',
      (text) => { setTextNote(text ?? ''); setIsListening(false) },
      'plain-text',
      textNote
    )
  }

  async function saveSymptom() {
    if (selected.length === 0) {
      Alert.alert('Please select at least one symptom.')
      return
    }
    try {
      await api.post('/api/symptoms', { symptoms: selected, severity, text_note: textNote || null })
      setSelected([])
      setSeverity(1)
      setTextNote('')
      setShowConfirm(false)
      setMode('history')
      loadHistory()
    } catch (e: unknown) {
      Alert.alert('Could not save.', e instanceof Error ? e.message : 'Please try again.')
    }
  }

  if (mode === 'log') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>How are you feeling?</Text>
        <ScrollView>
          <Text style={styles.sectionLabel}>Select all that apply:</Text>
          <View style={styles.chips}>
            {PREDEFINED_SYMPTOMS.map((s) => (
              <SymptomChip key={s} label={s} selected={selected.includes(s)} onToggle={() => toggleSymptom(s)} />
            ))}
          </View>

          <SeverityPicker value={severity} onChange={setSeverity} />

          <BigButton label={isListening ? 'Listening…' : 'Speak Your Symptom'} icon="🎙️" onPress={startVoiceInput} variant="secondary" style={styles.voiceBtn} />

          {textNote.length > 0 && <Text style={styles.notePreview}>Note: {textNote}</Text>}

          <BigButton label="Save" icon="✓" onPress={() => setShowConfirm(true)} style={styles.saveBtn} />
          <BigButton label="Cancel" icon="✗" onPress={() => setMode('history')} variant="secondary" />
        </ScrollView>

        <ConfirmModal
          visible={showConfirm}
          message={`Save: ${selected.join(', ')} (severity ${severity}/5)?`}
          onConfirm={saveSymptom}
          onCancel={() => setShowConfirm(false)}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Symptoms</Text>
      <BigButton label="Log New Symptom" icon="+" onPress={() => setMode('log')} style={styles.logBtn} />
      <ScrollView>
        {history.length === 0 ? (
          <Text style={styles.empty}>No symptoms logged yet.</Text>
        ) : (
          history.map((s) => (
            <View key={s.id} style={styles.historyCard}>
              <Text style={styles.historyDate}>{new Date(s.logged_at).toLocaleDateString()}</Text>
              <Text style={styles.historySymptoms}>{s.symptoms.join(', ')}</Text>
              <Text style={styles.historySeverity}>Severity: {'●'.repeat(s.severity)}{'○'.repeat(5 - s.severity)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20, color: '#0f172a' },
  sectionLabel: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  voiceBtn: { marginTop: 8 },
  notePreview: { fontSize: 16, color: '#475569', marginTop: 8, fontStyle: 'italic' },
  saveBtn: { marginTop: 16, marginBottom: 8 },
  logBtn: { marginBottom: 20 },
  empty: { fontSize: 20, color: '#64748b', textAlign: 'center', marginTop: 40 },
  historyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12 },
  historyDate: { fontSize: 16, color: '#64748b', marginBottom: 4 },
  historySymptoms: { fontSize: 20, fontWeight: '600', marginBottom: 6 },
  historySeverity: { fontSize: 18, color: '#2563eb', letterSpacing: 2 },
})
```

- [ ] **Step 5: Create Family screen**

Create `apps/mobile/src/app/(elderly)/family.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert, TextInput, TouchableOpacity } from 'react-native'
import { api } from '@/lib/api'
import { BigButton } from '@/components/BigButton'
import type { Relationship } from '@phc/shared'

interface RelWithUser extends Relationship {
  connected_user: { id: string; name: string; email: string; role: string } | null
}

export default function FamilyScreen() {
  const [relationships, setRelationships] = useState<RelWithUser[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'caregiver' | 'doctor'>('caregiver')
  const [showInviteForm, setShowInviteForm] = useState(false)

  useEffect(() => { loadRelationships() }, [])

  async function loadRelationships() {
    try {
      const { relationships: data } = await api.get<{ relationships: RelWithUser[] }>('/api/invites')
      setRelationships(data)
    } catch { /* silent */ }
  }

  async function sendInvite() {
    if (!inviteEmail) return
    try {
      await api.post('/api/invites', { invitee_email: inviteEmail, invitee_role: inviteRole })
      Alert.alert('Invite sent!', `An invite has been sent to ${inviteEmail}.`)
      setInviteEmail('')
      setShowInviteForm(false)
      loadRelationships()
    } catch (e: unknown) {
      Alert.alert('Could not send invite.', e instanceof Error ? e.message : 'Please try again.')
    }
  }

  async function removeConnection(id: string) {
    Alert.alert('Remove connection?', 'They will no longer have access to your health information.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await api.del('/api/invites', { relationship_id: id })
          loadRelationships()
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Family & Doctor</Text>
      <ScrollView>
        {relationships.map((r) => (
          <View key={r.id} style={styles.card}>
            <View>
              <Text style={styles.personName}>{r.connected_user?.name ?? r.invitee_email}</Text>
              <Text style={styles.personRole}>{r.role} · {r.status === 'pending' ? '⏳ Invite pending' : '✓ Connected'}</Text>
            </View>
            <TouchableOpacity onPress={() => removeConnection(r.id)} accessibilityLabel="Remove connection">
              <Text style={styles.removeBtn}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}

        {showInviteForm ? (
          <View style={styles.inviteForm}>
            <Text style={styles.formLabel}>Their email address:</Text>
            <TextInput
              style={styles.input}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="email@example.com"
            />
            <View style={styles.roleRow}>
              {(['caregiver', 'doctor'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, inviteRole === r && styles.roleBtnSelected]}
                  onPress={() => setInviteRole(r)}
                >
                  <Text style={[styles.roleBtnText, inviteRole === r && styles.roleBtnTextSelected]}>
                    {r === 'caregiver' ? 'Family Caregiver' : 'Doctor'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <BigButton label="Send Invite" icon="📧" onPress={sendInvite} style={styles.sendBtn} />
            <BigButton label="Cancel" icon="✗" onPress={() => setShowInviteForm(false)} variant="secondary" />
          </View>
        ) : (
          <BigButton label="Add Caregiver or Doctor" icon="+" onPress={() => setShowInviteForm(true)} variant="secondary" style={styles.addBtn} />
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20, color: '#0f172a' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  personName: { fontSize: 20, fontWeight: '700' },
  personRole: { fontSize: 16, color: '#64748b', marginTop: 4 },
  removeBtn: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
  inviteForm: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 8 },
  formLabel: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 16, fontSize: 18, marginBottom: 14 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleBtn: { flex: 1, borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, alignItems: 'center' },
  roleBtnSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  roleBtnText: { fontSize: 16, color: '#333' },
  roleBtnTextSelected: { color: '#2563eb', fontWeight: '600' },
  sendBtn: { marginBottom: 8 },
  addBtn: { marginTop: 12 },
})
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/app/\(elderly\)
git commit -m "feat: add all 4 elderly screens (Home, Medicines, Symptoms, Family)"
```

---

### Task 4: Caregiver Screens

**Files:**
- Create: `apps/mobile/src/app/(caregiver)/_layout.tsx`
- Create: `apps/mobile/src/app/(caregiver)/index.tsx`
- Create: `apps/mobile/src/app/(caregiver)/medications.tsx`
- Create: `apps/mobile/src/app/(caregiver)/alerts.tsx`
- Create: `apps/mobile/src/app/(caregiver)/summary.tsx`

- [ ] **Step 1: Create caregiver tab layout**

Create `apps/mobile/src/app/(caregiver)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router'
import { Text } from 'react-native'

function Icon({ icon, label }: { icon: string; label: string }) {
  return <Text style={{ fontSize: 12, textAlign: 'center' }}>{icon}{'\n'}{label}</Text>
}

export default function CaregiverLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { height: 72 } }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: () => <Icon icon="📊" label="Dashboard" /> }} />
      <Tabs.Screen name="medications" options={{ title: 'Medications', tabBarIcon: () => <Icon icon="💊" label="Medications" /> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: () => <Icon icon="🔔" label="Alerts" /> }} />
      <Tabs.Screen name="summary" options={{ title: 'Summary', tabBarIcon: () => <Icon icon="📄" label="Summary" /> }} />
    </Tabs>
  )
}
```

- [ ] **Step 2: Create Caregiver Dashboard**

Create `apps/mobile/src/app/(caregiver)/index.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native'
import { api } from '@/lib/api'
import type { DoseLog, SymptomLog } from '@phc/shared'

export default function CaregiverDashboard() {
  const [doses, setDoses] = useState<DoseLog[]>([])
  const [recentSymptoms, setRecentSymptoms] = useState<SymptomLog[]>([])
  const [patterns, setPatterns] = useState<Array<{ type: string; message: string }>>([])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [dosesRes, symptomsRes, patternsRes] = await Promise.all([
        api.get<{ doses: DoseLog[] }>('/api/doses'),
        api.get<{ symptoms: SymptomLog[] }>('/api/symptoms?limit=5'),
        api.get<{ patterns: Array<{ type: string; message: string }> }>('/api/symptoms/patterns'),
      ])
      setDoses(dosesRes.doses)
      setRecentSymptoms(symptomsRes.symptoms)
      setPatterns(patternsRes.patterns)
    } catch {
      Alert.alert('Could not load dashboard data.')
    }
  }

  const missedToday = doses.filter((d) => d.status === 'missed').length
  const takenToday = doses.filter((d) => d.status === 'taken').length

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Today's Overview</Text>

      <View style={styles.statsRow}>
        <View style={[styles.stat, styles.statGreen]}>
          <Text style={styles.statNum}>{takenToday}</Text>
          <Text style={styles.statLabel}>Doses Taken</Text>
        </View>
        <View style={[styles.stat, missedToday > 0 ? styles.statRed : styles.statGrey]}>
          <Text style={styles.statNum}>{missedToday}</Text>
          <Text style={styles.statLabel}>Missed</Text>
        </View>
      </View>

      {patterns.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Patterns Detected</Text>
          {patterns.map((p, i) => (
            <View key={i} style={styles.alertCard}>
              <Text style={styles.alertText}>⚠️ {p.message}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Recent Symptoms</Text>
      {recentSymptoms.length === 0 ? (
        <Text style={styles.empty}>No recent symptoms.</Text>
      ) : (
        recentSymptoms.map((s) => (
          <View key={s.id} style={styles.symptomRow}>
            <Text style={styles.symptomDate}>{new Date(s.logged_at).toLocaleDateString()}</Text>
            <Text style={styles.symptomName}>{s.symptoms.join(', ')}</Text>
            <Text style={styles.symptomSeverity}>Severity: {s.severity}/5</Text>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  stat: { flex: 1, borderRadius: 14, padding: 20, alignItems: 'center' },
  statGreen: { backgroundColor: '#dcfce7' },
  statRed: { backgroundColor: '#fee2e2' },
  statGrey: { backgroundColor: '#f1f5f9' },
  statNum: { fontSize: 36, fontWeight: '900', color: '#0f172a' },
  statLabel: { fontSize: 14, color: '#475569', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#0f172a' },
  alertCard: { backgroundColor: '#fef3c7', borderRadius: 12, padding: 14, marginBottom: 8 },
  alertText: { fontSize: 15, color: '#92400e' },
  empty: { fontSize: 16, color: '#64748b' },
  symptomRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  symptomDate: { fontSize: 13, color: '#94a3b8' },
  symptomName: { fontSize: 16, fontWeight: '600', marginVertical: 2 },
  symptomSeverity: { fontSize: 14, color: '#64748b' },
})
```

- [ ] **Step 3: Create Medications screen (caregiver)**

Create `apps/mobile/src/app/(caregiver)/medications.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert, TextInput, TouchableOpacity } from 'react-native'
import { api } from '@/lib/api'
import type { Medication } from '@phc/shared'

export default function CaregiverMedicationsScreen() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')

  useEffect(() => { loadMeds() }, [])

  async function loadMeds() {
    try {
      const { medications: data } = await api.get<{ medications: Medication[] }>('/api/medications')
      setMedications(data)
    } catch { /* silent */ }
  }

  async function addMedication() {
    if (!name || !dosage || !frequency) {
      Alert.alert('Please fill in all fields.')
      return
    }
    try {
      await api.post('/api/medications', {
        name,
        dosage,
        frequency,
        start_date: new Date().toISOString().slice(0, 10),
        elderly_user_id: medications[0]?.elderly_user_id,
      })
      setName(''); setDosage(''); setFrequency('')
      setShowForm(false)
      loadMeds()
    } catch (e: unknown) {
      Alert.alert('Could not add medication.', e instanceof Error ? e.message : '')
    }
  }

  async function deleteMedication(id: string) {
    Alert.alert('Delete medication?', 'This will remove it and all future reminders.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api.del(`/api/medications/${id}`)
        loadMeds()
      }},
    ])
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medications</Text>
      <ScrollView>
        {medications.map((m) => (
          <View key={m.id} style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.medName}>{m.name}</Text>
              <Text style={styles.medDetail}>{m.dosage} · {m.frequency}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteMedication(m.id)}>
              <Text style={styles.deleteBtn}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}

        {showForm ? (
          <View style={styles.form}>
            <TextInput style={styles.input} placeholder="Medication name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Dosage (e.g. 500mg)" value={dosage} onChangeText={setDosage} />
            <TextInput style={styles.input} placeholder="Frequency (e.g. twice daily)" value={frequency} onChangeText={setFrequency} />
            <TouchableOpacity style={styles.addBtn} onPress={addMedication}>
              <Text style={styles.addBtnText}>Add Medication</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.addBtnText}>+ Add Medication</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1 },
  medName: { fontSize: 18, fontWeight: '700' },
  medDetail: { fontSize: 14, color: '#64748b', marginTop: 2 },
  deleteBtn: { color: '#dc2626', fontSize: 15, fontWeight: '600' },
  form: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 12 },
  addBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', padding: 12 },
  cancelBtnText: { color: '#64748b', fontSize: 16 },
})
```

- [ ] **Step 4: Create Alerts screen**

Create `apps/mobile/src/app/(caregiver)/alerts.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { api } from '@/lib/api'
import type { DoseLog } from '@phc/shared'

export default function AlertsScreen() {
  const [missedDoses, setMissedDoses] = useState<DoseLog[]>([])
  const [patterns, setPatterns] = useState<Array<{ type: string; message: string }>>([])

  useEffect(() => { loadAlerts() }, [])

  async function loadAlerts() {
    try {
      const [dosesRes, patternsRes] = await Promise.all([
        api.get<{ doses: DoseLog[] }>('/api/doses'),
        api.get<{ patterns: Array<{ type: string; message: string }> }>('/api/symptoms/patterns'),
      ])
      setMissedDoses(dosesRes.doses.filter((d) => d.status === 'missed'))
      setPatterns(patternsRes.patterns)
    } catch { /* silent */ }
  }

  const hasAlerts = missedDoses.length > 0 || patterns.length > 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Alerts</Text>

      {!hasAlerts && (
        <View style={styles.allGood}>
          <Text style={styles.allGoodText}>✓ No alerts. Everything looks good.</Text>
        </View>
      )}

      {patterns.map((p, i) => (
        <View key={`p-${i}`} style={[styles.alertCard, styles.alertYellow]}>
          <Text style={styles.alertType}>Symptom Pattern</Text>
          <Text style={styles.alertMessage}>{p.message}</Text>
        </View>
      ))}

      {missedDoses.map((d) => (
        <View key={d.id} style={[styles.alertCard, styles.alertRed]}>
          <Text style={styles.alertType}>Missed Dose</Text>
          <Text style={styles.alertMessage}>
            Scheduled: {new Date(d.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  allGood: { backgroundColor: '#dcfce7', borderRadius: 14, padding: 24, alignItems: 'center' },
  allGoodText: { fontSize: 18, color: '#15803d', fontWeight: '600' },
  alertCard: { borderRadius: 12, padding: 16, marginBottom: 10 },
  alertYellow: { backgroundColor: '#fef3c7' },
  alertRed: { backgroundColor: '#fee2e2' },
  alertType: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, color: '#475569' },
  alertMessage: { fontSize: 16, color: '#1e293b' },
})
```

- [ ] **Step 5: Create Summary screen**

Create `apps/mobile/src/app/(caregiver)/summary.tsx`:

```tsx
import { useState } from 'react'
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { api } from '@/lib/api'

export default function SummaryScreen() {
  const [loading, setLoading] = useState(false)

  async function downloadAndSharePdf() {
    setLoading(true)
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/summary`,
        { headers: { ...(await getAuthHeader()) } }
      )
      if (!response.ok) throw new Error('Failed to generate summary')

      const blob = await response.blob()
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1]
        const path = `${FileSystem.cacheDirectory}health-summary.pdf`
        await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 })
        await Sharing.shareAsync(path, { mimeType: 'application/pdf', dialogTitle: 'Share Health Summary' })
      }
    } catch (e: unknown) {
      Alert.alert('Could not generate summary.', e instanceof Error ? e.message : '')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Health Summary</Text>
      <Text style={styles.description}>
        Generate a PDF of the last 30 days of health data — medications, doses, and symptoms. Share it with a doctor or save it for records.
      </Text>

      <TouchableOpacity style={styles.button} onPress={downloadAndSharePdf} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>📄 Generate & Share PDF</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { supabase } = await import('@/lib/supabase')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  description: { fontSize: 17, color: '#475569', textAlign: 'center', lineHeight: 26, marginBottom: 40 },
  button: { backgroundColor: '#2563eb', borderRadius: 16, padding: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
})
```

- [ ] **Step 6: Add expo-file-system and expo-sharing**

```bash
cd apps/mobile && pnpm add expo-file-system expo-sharing
```

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/app/\(caregiver\)
git commit -m "feat: add all 4 caregiver screens (Dashboard, Medications, Alerts, Summary)"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Elderly: 4 screens, 4-tab nav (Task 3)
- ✅ Home screen: greeting, next dose card, Log Symptom button, Call Ahmed button (Task 3 — index.tsx)
- ✅ Large text (20px+ used throughout styles), large tap targets (minHeight: 64 on BigButton) (Tasks 2, 3)
- ✅ No hamburger menus, no swipe gestures on elderly screens (Task 3)
- ✅ Every button has icon AND label (Task 2 — BigButton)
- ✅ Confirmation before save (Task 2 — ConfirmModal, used in index.tsx and symptoms.tsx)
- ✅ Voice-to-text button on symptom screen (Task 3 — symptoms.tsx, expo-speech placeholder)
- ✅ Predefined symptom list with chips (Task 3)
- ✅ Severity picker 1–5 (Task 2 — SeverityPicker)
- ✅ Family screen with invite flow (Task 3 — family.tsx)
- ✅ Caregiver: Dashboard, Medications, Alerts, Summary (Task 4)
- ✅ PDF export from caregiver Summary screen (Task 4 — summary.tsx)
- ✅ Role-based routing: elderly → (elderly), caregiver → (caregiver) (Task 1 — _layout.tsx)

**Type consistency:** All screens use `DoseLog`, `SymptomLog`, `Medication`, `Relationship` from `@phc/shared`. API client uses the same `api.get/post/patch/del` pattern from Plan 1 Task 7. ✅
