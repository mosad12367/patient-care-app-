import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert, TextInput, TouchableOpacity } from 'react-native'
import { api } from '@/lib/api'
import { BigButton } from '@/components/BigButton'
import { ConfirmModal } from '@/components/ConfirmModal'
import type { Relationship } from '@phc/shared'

interface RelWithUser extends Relationship {
  connected_user: { id: string; name: string; email: string; role: string } | null
}

export default function FamilyScreen() {
  const [relationships, setRelationships] = useState<RelWithUser[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'caregiver' | 'doctor'>('caregiver')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [showConfirmInvite, setShowConfirmInvite] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { relationships: data } = await api.get<{ relationships: RelWithUser[] }>('/api/invites')
        setRelationships(data)
      } catch { /* silent */ }
    }
    load()
  }, [])

  async function sendInvite() {
    if (!inviteEmail) return
    try {
      await api.post('/api/invites', { invitee_email: inviteEmail, invitee_role: inviteRole })
      Alert.alert('Invite sent!', `An invite has been sent to ${inviteEmail}.`)
      setInviteEmail('')
      setShowInviteForm(false)
      const load = async () => {
        try {
          const { relationships: data } = await api.get<{ relationships: RelWithUser[] }>('/api/invites')
          setRelationships(data)
        } catch { /* silent */ }
      }
      load()
    } catch (e: unknown) {
      Alert.alert('Could not send invite.', e instanceof Error ? e.message : 'Please try again.')
    }
  }

  async function removeConnection(id: string) {
    Alert.alert('Remove connection?', 'They will no longer have access to your health information.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await api.del('/api/invites', { relationship_id: id })
          const load = async () => {
            try {
              const { relationships: data } = await api.get<{ relationships: RelWithUser[] }>('/api/invites')
              setRelationships(data)
            } catch { /* silent */ }
          }
          load()
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Family & Doctor</Text>
      <ScrollView>
        {relationships.map((r) => (
          <View key={r.id} style={styles.card}>
            <View>
              <Text style={styles.personName}>{r.connected_user?.name ?? r.invitee_email}</Text>
              <Text style={styles.personRole}>{r.role} · {r.status === 'pending' ? '⏳ Invite pending' : '✓ Connected'}</Text>
            </View>
            <BigButton label="Remove" icon="✗" onPress={() => removeConnection(r.id)} variant="danger" style={styles.removeActionBtn} />
          </View>
        ))}

        {showInviteForm ? (
          <View style={styles.inviteForm}>
            <Text style={styles.formLabel}>Their email address:</Text>
            <TextInput
              style={styles.input}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="email@example.com"
            />
            <View style={styles.roleRow}>
              {(['caregiver', 'doctor'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleToggle, inviteRole === r && styles.roleToggleSelected]}
                  onPress={() => setInviteRole(r)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: inviteRole === r }}
                  accessibilityLabel={r === 'caregiver' ? 'Family Caregiver' : 'Doctor'}
                >
                  <Text style={[styles.roleToggleText, inviteRole === r && styles.roleToggleTextSelected]}>
                    {r === 'caregiver' ? '👨‍👩‍👧 Caregiver' : '🩺 Doctor'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <BigButton label="Send Invite" icon="📧" onPress={() => setShowConfirmInvite(true)} style={styles.sendBtn} />
            <BigButton label="Cancel" icon="✗" onPress={() => setShowInviteForm(false)} variant="secondary" />
          </View>
        ) : (
          <BigButton label="Add Caregiver or Doctor" icon="+" onPress={() => setShowInviteForm(true)} variant="secondary" style={styles.addBtn} />
        )}
      </ScrollView>

      <ConfirmModal
        visible={showConfirmInvite}
        message={`Send invite to ${inviteEmail}?`}
        onConfirm={() => { setShowConfirmInvite(false); sendInvite() }}
        onCancel={() => setShowConfirmInvite(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20, color: '#0f172a' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  personName: { fontSize: 20, fontWeight: '700' },
  personRole: { fontSize: 20, color: '#64748b', marginTop: 4 },
  removeActionBtn: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12 },
  inviteForm: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 8 },
  formLabel: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 16, fontSize: 20, marginBottom: 14 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleToggle: { flex: 1, borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', minHeight: 52 },
  roleToggleSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  roleToggleText: { fontSize: 20, color: '#334155', fontWeight: '500' },
  roleToggleTextSelected: { color: '#2563eb', fontWeight: '700' },
  sendBtn: { marginBottom: 8 },
  addBtn: { marginTop: 12 },
})
