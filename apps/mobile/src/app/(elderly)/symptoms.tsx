import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert, TextInput } from 'react-native'
import { api } from '@/lib/api'
import { SymptomChip } from '@/components/SymptomChip'
import { SeverityPicker } from '@/components/SeverityPicker'
import { BigButton } from '@/components/BigButton'
import { ConfirmModal } from '@/components/ConfirmModal'
import { PREDEFINED_SYMPTOMS } from '@phc/shared'
import type { SymptomLog } from '@phc/shared'

export default function SymptomsScreen() {
  const [mode, setMode] = useState<'history' | 'log'>('history')
  const [history, setHistory] = useState<SymptomLog[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [severity, setSeverity] = useState(1)
  const [textNote, setTextNote] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { symptoms } = await api.get<{ symptoms: SymptomLog[] }>('/api/symptoms')
        setHistory(symptoms)
      } catch { /* silent */ }
    }
    load()
  }, [])

  function toggleSymptom(s: string) {
    setSelected((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  async function saveSymptom() {
    if (selected.length === 0) {
      Alert.alert('Please select at least one symptom.')
      return
    }
    try {
      await api.post('/api/symptoms', { symptoms: selected, severity, text_note: textNote || null })
      setSelected([])
      setSeverity(1)
      setTextNote('')
      setShowTextInput(false)
      setShowConfirm(false)
      setMode('history')
      const load = async () => {
        try {
          const { symptoms } = await api.get<{ symptoms: SymptomLog[] }>('/api/symptoms')
          setHistory(symptoms)
        } catch { /* silent */ }
      }
      load()
    } catch (e: unknown) {
      Alert.alert('Could not save.', e instanceof Error ? e.message : 'Please try again.')
    }
  }

  if (mode === 'log') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>How are you feeling?</Text>
        <ScrollView>
          <Text style={styles.sectionLabel}>Select all that apply:</Text>
          <View style={styles.chips}>
            {PREDEFINED_SYMPTOMS.map((s) => (
              <SymptomChip key={s} label={s} selected={selected.includes(s)} onToggle={() => toggleSymptom(s)} />
            ))}
          </View>

          <SeverityPicker value={severity} onChange={setSeverity} />

          {!showTextInput && (
            <BigButton
              label="Describe Symptom"
              icon="🎙️"
              onPress={() => setShowTextInput(true)}
              variant="secondary"
              style={styles.voiceBtn}
            />
          )}
          {showTextInput && (
            <TextInput
              style={styles.textNoteInput}
              placeholder="Describe your symptom..."
              value={textNote}
              onChangeText={setTextNote}
              multiline
              numberOfLines={3}
            />
          )}

          {textNote.length > 0 && !showTextInput && (
            <Text style={styles.notePreview}>Note: {textNote}</Text>
          )}

          {selected.length > 0 && (
            <BigButton label="Save" icon="✓" onPress={() => setShowConfirm(true)} style={styles.saveBtn} />
          )}
          <BigButton label="Cancel" icon="✗" onPress={() => setMode('history')} variant="secondary" />
        </ScrollView>

        <ConfirmModal
          visible={showConfirm}
          message={`Save: ${selected.join(', ')} (severity ${severity}/5)?`}
          onConfirm={saveSymptom}
          onCancel={() => setShowConfirm(false)}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Symptoms</Text>
      <BigButton label="Log New Symptom" icon="+" onPress={() => setMode('log')} style={styles.logBtn} />
      <ScrollView>
        {history.length === 0 ? (
          <Text style={styles.empty}>No symptoms logged yet.</Text>
        ) : (
          history.map((s) => (
            <View key={s.id} style={styles.historyCard}>
              <Text style={styles.historyDate}>{new Date(s.logged_at).toLocaleDateString()}</Text>
              <Text style={styles.historySymptoms}>{s.symptoms.join(', ')}</Text>
              <Text style={styles.historySeverity}>Severity: {'●'.repeat(s.severity)}{'○'.repeat(5 - s.severity)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20, color: '#0f172a' },
  sectionLabel: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  voiceBtn: { marginTop: 8 },
  textNoteInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 14, fontSize: 20, marginTop: 8, minHeight: 80 },
  notePreview: { fontSize: 20, color: '#475569', marginTop: 8, fontStyle: 'italic' },
  saveBtn: { marginTop: 16, marginBottom: 8 },
  logBtn: { marginBottom: 20 },
  empty: { fontSize: 20, color: '#64748b', textAlign: 'center', marginTop: 40 },
  historyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12 },
  historyDate: { fontSize: 20, color: '#64748b', marginBottom: 4 },
  historySymptoms: { fontSize: 20, fontWeight: '600', marginBottom: 6 },
  historySeverity: { fontSize: 20, color: '#2563eb', letterSpacing: 2 },
})
