import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'

interface Props { value: number; onChange: (v: number) => void }

export function SeverityPicker({ value, onChange }: Props) {
  return (
    <View style={styles.container} accessibilityLabel={`Severity: ${value} out of 5`}>
      <Text style={styles.label}>How severe? (1 = mild, 5 = severe)</Text>
      <View style={styles.dots}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.dot, n <= value && styles.dotFilled]}
            onPress={() => onChange(n)}
            accessibilityRole="radio"
            accessibilityLabel={`Severity ${n}`}
            accessibilityState={{ checked: value === n }}
          >
            <Text style={[styles.dotText, n <= value && styles.dotTextFilled]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginVertical: 12 },
  label: { fontSize: 18, marginBottom: 12, color: '#333' },
  dots: { flexDirection: 'row', gap: 10 },
  dot: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  dotFilled: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dotText: { fontSize: 20, fontWeight: '700', color: '#334155' },
  dotTextFilled: { color: '#fff' },
})
