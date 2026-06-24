import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native'
import { api } from '@/lib/api'
import { DoseCard } from '@/components/DoseCard'
import { ConfirmModal } from '@/components/ConfirmModal'
import type { DoseLog } from '@phc/shared'

interface DoseWithMed extends DoseLog {
  medication_schedule: {
    scheduled_time: string
    medication: { name: string; dosage: string }
  }
}

export default function MedicinesScreen() {
  const [doses, setDoses] = useState<DoseWithMed[]>([])
  const [confirm, setConfirm] = useState<{ id: string; status: 'taken' | 'missed'; message: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { doses: data } = await api.get<{ doses: DoseWithMed[] }>('/api/doses')
        setDoses(data)
      } catch {
        Alert.alert('Could not load medications.')
      }
    }
    load()
  }, [])

  async function acknowledgeDose(id: string, status: 'taken' | 'missed') {
    await api.patch(`/api/doses/${id}`, { status })
    setDoses((prev) => prev.map((d) => d.id === id ? { ...d, status } : d))
    setConfirm(null)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Medicines</Text>
      <ScrollView>
        {doses.length === 0 ? (
          <Text style={styles.empty}>No medications scheduled for today.</Text>
        ) : (
          (() => {
            let firstPendingShown = false
            return doses.map((dose) => {
              const isPending = dose.status === 'pending'
              const showActions = isPending && !firstPendingShown
              if (isPending) firstPendingShown = true
              return (
                <DoseCard
                  key={dose.id}
                  medicationName={dose.medication_schedule.medication.name}
                  dosage={dose.medication_schedule.medication.dosage}
                  scheduledTime={dose.medication_schedule.scheduled_time}
                  status={dose.status}
                  showActions={showActions}
                  onTaken={() => setConfirm({ id: dose.id, status: 'taken', message: `Did you take your ${dose.medication_schedule.medication.name}?` })}
                  onMissed={() => setConfirm({ id: dose.id, status: 'missed', message: `Skip your ${dose.medication_schedule.medication.name}?` })}
                />
              )
            })
          })()
        )}
      </ScrollView>
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
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20, color: '#0f172a' },
  empty: { fontSize: 20, color: '#64748b', textAlign: 'center', marginTop: 40 },
})
