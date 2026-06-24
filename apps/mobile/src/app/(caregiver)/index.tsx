import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native'
import { api } from '@/lib/api'
import { useElderlyUserId } from '@/hooks/useElderlyUserId'
import type { DoseLog, SymptomLog } from '@phc/shared'

export default function CaregiverDashboard() {
  const elderlyUserId = useElderlyUserId()
  const [doses, setDoses] = useState<DoseLog[]>([])
  const [recentSymptoms, setRecentSymptoms] = useState<SymptomLog[]>([])
  const [patterns, setPatterns] = useState<Array<{ type: string; message: string }>>([])

  useEffect(() => { if (elderlyUserId) loadAll() }, [elderlyUserId])

  async function loadAll() {
    try {
      const [dosesRes, symptomsRes, patternsRes] = await Promise.all([
        api.get<{ doses: DoseLog[] }>(`/api/doses?elderly_user_id=${elderlyUserId}`),
        api.get<{ symptoms: SymptomLog[] }>(`/api/symptoms?elderly_user_id=${elderlyUserId}&limit=5`),
        api.get<{ patterns: Array<{ type: string; message: string }> }>(`/api/symptoms/patterns?elderly_user_id=${elderlyUserId}`),
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
