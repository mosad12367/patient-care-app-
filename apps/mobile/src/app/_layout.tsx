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
      if (user.role === 'elderly') router.replace('/(elderly)')
      else router.replace('/(caregiver)')
    }
  }, [user, loading, segments, router])

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootGuard />
    </AuthProvider>
  )
}
