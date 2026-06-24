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
