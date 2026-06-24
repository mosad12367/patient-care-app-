import { TouchableOpacity, Text, StyleSheet } from 'react-native'

interface Props { label: string; selected: boolean; onToggle: () => void }

export function SymptomChip({ label, selected, onToggle }: Props) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', margin: 5, minHeight: 52 },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  text: { fontSize: 20, color: '#333' },
  textSelected: { color: '#fff', fontWeight: '600' },
})
