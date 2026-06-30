import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert, TextInput, TouchableOpacity, Platform } from 'react-native'
import { api } from '@/lib/api'
import type { Medication } from '@phc/shared'

function showError(msg: string) {
  if (Platform.OS === 'web') window.alert(msg)
  else Alert.alert('Error', msg)
}

export default function CaregiverMedicationsScreen() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [elderlyUserId, setElderlyUserId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

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
    setFormError(null)
    if (!name || !dosage || !frequency) {
      setFormError('Please fill in all fields.')
      return
    }
    if (!elderlyUserId) {
      setFormError('No connected elderly user found. You need an accepted invite first.')
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
      setFormError(null)
      setShowForm(false)
      loadMeds()
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Could not add medication.')
    }
  }

  async function deleteMedication(id: string) {
    if (Platform.OS === 'web') {
      if (!window.confirm('Delete this medication? This will remove it and all future reminders.')) return
      try {
        await api.del(`/api/medications/${id}`)
        loadMeds()
      } catch {
        showError('Could not delete medication. Please try again.')
      }
      return
    }
    Alert.alert('Delete medication?', 'This will remove it and all future reminders.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.del(`/api/medications/${id}`)
          loadMeds()
        } catch {
          showError('Could not delete medication. Please try again.')
        }
      }},
    ])
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medications</Text>
      {!elderlyUserId && (
        <View style={styles.noConnectionBanner}>
          <Text style={styles.noConnectionText}>You need an accepted connection with an elderly user before adding medications. Go to the Alerts tab to manage invites.</Text>
        </View>
      )}
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
            {formError && <Text style={styles.formError}>{formError}</Text>}
            <TouchableOpacity style={styles.addBtn} onPress={addMedication}>
              <Text style={styles.addBtnText}>Add Medication</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowForm(false); setFormError(null) }}>
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
  noConnectionBanner: { backgroundColor: '#fef9c3', borderRadius: 12, padding: 14, marginBottom: 16 },
  noConnectionText: { fontSize: 14, color: '#854d0e' },
  form: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 12 },
  formError: { color: '#dc2626', fontSize: 14, marginBottom: 10 },
  addBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 },
  addBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', padding: 12 },
  cancelBtnText: { color: '#64748b', fontSize: 16 },
})
