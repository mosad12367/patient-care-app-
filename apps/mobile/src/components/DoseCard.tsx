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
  detail: { fontSize: 20, color: '#555', marginBottom: 16 },
  statusText: { fontSize: 20, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1 },
})
