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

  useEffect(() => {
    const load = async () => {
      try {
        const { doses: data } = await api.get<{ doses: DoseWithMed[] }>('/api/doses')
        setDoses(data.filter((d) => d.status === 'pending'))
      } catch {
        Alert.alert('Could not load medications. Please check your connection.')
      }
    }
    load()
  }, [])

  async function acknowledgeDose(id: string, status: 'taken' | 'missed') {
    try {
      await api.patch(`/api/doses/${id}`, { status })
      setDoses((prev) => prev.filter((d) => d.id !== id))
    } catch {
      Alert.alert('Could not update dose. Please try again.')
    } finally {
      setConfirm(null)
    }
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

        {doses.length === 0 && (
          <BigButton
            label="Log Symptom"
            icon="🎙️"
            onPress={() => router.push('/(elderly)/symptoms')}
            variant="secondary"
            style={styles.logBtn}
          />
        )}
      </ScrollView>

      {/* Emergency call button — always visible at bottom */}
      <BigButton
        label="Call Emergency Services"
        icon="📞"
        onPress={() => Linking.openURL('tel:999')}
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
  sectionLabel: { fontSize: 20, fontWeight: '600', color: '#475569', marginBottom: 10 },
  allDone: { backgroundColor: '#dcfce7', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
  allDoneText: { fontSize: 22, color: '#15803d', fontWeight: '700' },
  logBtn: { marginTop: 12 },
  callBtn: { margin: 16, marginBottom: 24 },
})
