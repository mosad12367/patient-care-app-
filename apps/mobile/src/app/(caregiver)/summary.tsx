import { useState } from 'react'
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { supabase } from '@/lib/supabase'

export default function SummaryScreen() {
  const [loading, setLoading] = useState(false)

  async function downloadAndSharePdf() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const path = `${FileSystem.cacheDirectory}health-summary.pdf`
      const result = await FileSystem.downloadAsync(
        `${process.env.EXPO_PUBLIC_API_URL}/api/summary`,
        path,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      if (result.status !== 200) throw new Error('Server returned an error')
      await Sharing.shareAsync(path, { mimeType: 'application/pdf', dialogTitle: 'Share Health Summary' })
    } catch (e: unknown) {
      Alert.alert('Could not generate summary.', e instanceof Error ? e.message : 'Please try again.')
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

      <TouchableOpacity style={styles.button} onPress={downloadAndSharePdf} disabled={loading} accessibilityRole="button">
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>📄 Generate & Share PDF</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  description: { fontSize: 17, color: '#475569', textAlign: 'center', lineHeight: 26, marginBottom: 40 },
  button: { backgroundColor: '#2563eb', borderRadius: 16, padding: 20, alignItems: 'center', minHeight: 56 },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
})
