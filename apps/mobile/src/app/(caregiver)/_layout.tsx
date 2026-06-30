import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function CaregiverLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { height: 72 }, tabBarLabelStyle: { fontSize: 13 } }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: () => <Text style={{ fontSize: 22 }}>📊</Text> }} />
      <Tabs.Screen name="medications" options={{ title: 'Medications', tabBarIcon: () => <Text style={{ fontSize: 22 }}>💊</Text> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: () => <Text style={{ fontSize: 22 }}>🔔</Text> }} />
      <Tabs.Screen name="summary" options={{ title: 'Summary', tabBarIcon: () => <Text style={{ fontSize: 22 }}>📄</Text> }} />
    </Tabs>
  )
}
