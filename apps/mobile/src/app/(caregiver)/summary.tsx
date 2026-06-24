import { useState } from 'react'
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { supabase } from '@/lib/supabase'

export default function SummaryScreen() {
  const [loading, setLoading] = useState(false)

  async function downloadAndSharePdf() {
    setLoading(true)
    try {
      const session = (await supabase.auth.getSession()).data.session
      if (!session) throw new Error('Not authenticated')
      const destination = new File(Paths.cache, 'health-summary.pdf')
      const downloaded = await File.downloadFileAsync(
        `${process.env.EXPO_PUBLIC_API_URL}/api/summary`,
        destination,
        { headers: { Authorization: `Bearer ${session.access_token}` }, idempotent: true }
      )
      await Sharing.shareAsync(downloaded.uri, { mimeType: 'application/pdf', dialogTitle: 'Share Health Summary' })
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  description: { fontSize: 17, color: '#475569', textAlign: 'center', lineHeight: 26, marginBottom: 40 },
  button: { backgroundColor: '#2563eb', borderRadius: 16, padding: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
})
