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
        <Text style={styles.linkText}>Don&apos;t have an account? Register</Text>
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
