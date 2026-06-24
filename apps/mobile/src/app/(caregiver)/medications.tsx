import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert, TextInput, TouchableOpacity } from 'react-native'
import { api } from '@/lib/api'
import type { Medication } from '@phc/shared'

export default function CaregiverMedicationsScreen() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [elderlyUserId, setElderlyUserId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')

  useEffect(() => { loadMeds() }, [])

  async function loadMeds() {
    try {
      const [medsRes, relRes] = await Promise.all([
        api.get<{ medications: Medication[] }>('/api/medications'),
        api.get<{ relationships: Array<{ elderly_user_id: string; role: string; status: string }> }>('/api/invites'),
      ])
      setMedications(medsRes.medications)
      const accepted = relRes.relationships.find((r) => r.status === 'accepted' && r.role === 'caregiver')
      if (accepted) setElderlyUserId(accepted.elderly_user_id)
    } catch { /* silent */ }
  }

  async function addMedication() {
    if (!name || !dosage || !frequency) {
      Alert.alert('Please fill in all fields.')
      return
    }
    if (!elderlyUserId) {
      Alert.alert('No connected elderly user found.')
      return
    }
    try {
      await api.post('/api/medications', {
        name,
        dosage,
        frequency,
        start_date: new Date().toISOString().slice(0, 10),
        elderly_user_id: elderlyUserId,
      })
      setName(''); setDosage(''); setFrequency('')
      setShowForm(false)
      loadMeds()
    } catch (e: unknown) {
      Alert.alert('Could not add medication.', e instanceof Error ? e.message : '')
    }
  }

  async function deleteMedication(id: string) {
    Alert.alert('Delete medication?', 'This will remove it and all future reminders.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.del(`/api/medications/${id}`)
          loadMeds()
        } catch {
          Alert.alert('Could not delete medication. Please try again.')
        }
      }},
    ])
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medications</Text>
      <ScrollView>
        {medications.map((m) => (
          <View key={m.id} style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.medName}>{m.name}</Text>
              <Text style={styles.medDetail}>{m.dosage} · {m.frequency}</Text>
            </View>
            <TouchableOpacity
              onPress={() => deleteMedication(m.id)}
              style={styles.deleteTouch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteBtn}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}

        {showForm ? (
          <View style={styles.form}>
            <TextInput style={styles.input} placeholder="Medication name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Dosage (e.g. 500mg)" value={dosage} onChangeText={setDosage} />
            <TextInput style={styles.input} placeholder="Frequency (e.g. twice daily)" value={frequency} onChangeText={setFrequency} />
            <TouchableOpacity style={styles.addBtn} onPress={addMedication}>
              <Text style={styles.addBtnText}>Add Medication</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.addBtnText}>+ Add Medication</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1 },
  medName: { fontSize: 18, fontWeight: '700' },
  medDetail: { fontSize: 14, color: '#64748b', marginTop: 2 },
  deleteTouch: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 },
  deleteBtn: { color: '#dc2626', fontSize: 15, fontWeight: '600' },
  form: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 12 },
  addBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', padding: 12 },
  cancelBtnText: { color: '#64748b', fontSize: 16 },
})
