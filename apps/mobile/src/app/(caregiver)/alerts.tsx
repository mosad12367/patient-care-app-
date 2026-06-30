import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { api } from '@/lib/api'
import { useElderlyUserId } from '@/hooks/useElderlyUserId'
import type { DoseLog } from '@phc/shared'

interface RelWithElderly {
  id: string
  status: string
  role: string
  invitee_email: string
  elderly_user: { id: string; name: string; email: string } | null
}

export default function AlertsScreen() {
  const elderlyUserId = useElderlyUserId()
  const [missedDoses, setMissedDoses] = useState<DoseLog[]>([])
  const [patterns, setPatterns] = useState<Array<{ type: string; message: string }>>([])
  const [pendingInvites, setPendingInvites] = useState<RelWithElderly[]>([])
  const [error, setError] = useState(false)

  const loadInvites = useCallback(async () => {
    try {
      const { relationships } = await api.get<{ relationships: RelWithElderly[] }>('/api/invites')
      setPendingInvites(relationships.filter((r) => r.status === 'pending'))
    } catch {}
  }, [])

  useEffect(() => {
    loadInvites()
    if (elderlyUserId) loadAlerts()
  }, [elderlyUserId])

  async function loadAlerts() {
    try {
      const [dosesRes, patternsRes] = await Promise.all([
        api.get<{ doses: DoseLog[] }>(`/api/doses?elderly_user_id=${elderlyUserId}`),
        api.get<{ patterns: Array<{ type: string; message: string }> }>(`/api/symptoms/patterns?elderly_user_id=${elderlyUserId}`),
      ])
      setMissedDoses(dosesRes.doses.filter((d) => d.status === 'missed'))
      setPatterns(patternsRes.patterns)
    } catch {
      setError(true)
    }
  }

  async function respondToInvite(id: string, action: 'accept' | 'reject') {
    try {
      await api.patch('/api/invites', { relationship_id: id, action })
      await loadInvites()
      if (action === 'accept') {
        // Reload page so elderlyUserId picks up the new connection
        window.location.reload()
      }
    } catch {}
  }

  const hasAlerts = missedDoses.length > 0 || patterns.length > 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Alerts</Text>

      {pendingInvites.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pending Invites</Text>
          {pendingInvites.map((inv) => (
            <View key={inv.id} style={styles.inviteCard}>
              <Text style={styles.inviteName}>
                {inv.elderly_user?.name ?? inv.invitee_email}
              </Text>
              <Text style={styles.inviteSubtext}>
                Wants to add you as their {inv.role}
              </Text>
              <View style={styles.inviteActions}>
                <TouchableOpacity
                  style={[styles.inviteBtn, styles.acceptBtn]}
                  onPress={() => respondToInvite(inv.id, 'accept')}
                >
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inviteBtn, styles.rejectBtn]}
                  onPress={() => respondToInvite(inv.id, 'reject')}
                >
                  <Text style={styles.rejectBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>Could not load alerts. Check your connection.</Text>
        </View>
      )}

      {!error && !hasAlerts && pendingInvites.length === 0 && (
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  inviteCard: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 14, padding: 18, marginBottom: 12 },
  inviteName: { fontSize: 18, fontWeight: '700', color: '#1e3a8a' },
  inviteSubtext: { fontSize: 14, color: '#3b82f6', marginTop: 2, marginBottom: 14 },
  inviteActions: { flexDirection: 'row', gap: 10 },
  inviteBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  acceptBtn: { backgroundColor: '#2563eb' },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  rejectBtn: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  rejectBtnText: { color: '#64748b', fontWeight: '600', fontSize: 16 },
  allGood: { backgroundColor: '#dcfce7', borderRadius: 14, padding: 24, alignItems: 'center' },
  allGoodText: { fontSize: 18, color: '#15803d', fontWeight: '600' },
  alertCard: { borderRadius: 12, padding: 16, marginBottom: 10 },
  alertYellow: { backgroundColor: '#fef3c7' },
  alertRed: { backgroundColor: '#fee2e2' },
  alertType: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, color: '#475569' },
  alertMessage: { fontSize: 16, color: '#1e293b' },
  errorCard: { backgroundColor: '#fee2e2', borderRadius: 12, padding: 16, marginBottom: 10 },
  errorText: { fontSize: 16, color: '#dc2626' },
})
