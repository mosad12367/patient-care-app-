import { Tabs } from 'expo-router'
import { Text } from 'react-native'

function Icon({ icon, label }: { icon: string; label: string }) {
  return <Text style={{ fontSize: 12, textAlign: 'center' }}>{icon}{'\n'}{label}</Text>
}

export default function CaregiverLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { height: 72 } }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: () => <Icon icon="📊" label="Dashboard" /> }} />
      <Tabs.Screen name="medications" options={{ title: 'Medications', tabBarIcon: () => <Icon icon="💊" label="Medications" /> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: () => <Icon icon="🔔" label="Alerts" /> }} />
      <Tabs.Screen name="summary" options={{ title: 'Summary', tabBarIcon: () => <Icon icon="📄" label="Summary" /> }} />
    </Tabs>
  )
}
