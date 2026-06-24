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
