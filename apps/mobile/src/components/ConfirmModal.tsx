import { Modal, View, Text, StyleSheet } from 'react-native'
import { BigButton } from './BigButton'

interface Props {
  visible: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ visible, message, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box} accessibilityViewIsModal={true}>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <BigButton label="Yes" icon="✓" onPress={onConfirm} variant="primary" style={styles.btn} />
            <BigButton label="Cancel" icon="✗" onPress={onCancel} variant="secondary" style={styles.btn} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  box: { backgroundColor: '#fff', borderRadius: 20, padding: 28, marginHorizontal: 24, width: '88%' },
  message: { fontSize: 22, textAlign: 'center', marginBottom: 24, lineHeight: 32 },
  actions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1 },
})
