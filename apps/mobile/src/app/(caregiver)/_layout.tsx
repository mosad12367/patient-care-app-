import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function CaregiverLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: 'top',
        tabBarStyle: { height: 56 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarActiveBackgroundColor: '#eff6ff',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text> }} />
      <Tabs.Screen name="medications" options={{ title: 'Medications', tabBarIcon: () => <Text style={{ fontSize: 20 }}>💊</Text> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🔔</Text> }} />
      <Tabs.Screen name="summary" options={{ title: 'Summary', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📄</Text> }} />
    </Tabs>
  )
}
