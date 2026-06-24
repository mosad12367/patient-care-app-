import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native'

interface Props {
  label: string
  icon: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  style?: ViewStyle
}

export function BigButton({ label, icon, onPress, variant = 'primary', style }: Props) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, variant === 'secondary' && styles.labelSecondary]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 24, minHeight: 64, gap: 12 },
  primary: { backgroundColor: '#2563eb' },
  secondary: { backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0' },
  danger: { backgroundColor: '#dc2626' },
  icon: { fontSize: 28 },
  label: { fontSize: 22, fontWeight: '700', color: '#fff' },
  labelSecondary: { color: '#1e293b' },
})
