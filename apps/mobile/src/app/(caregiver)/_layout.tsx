import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function CaregiverLayout() {
  return (
    <Tabs
      tabBarPosition="top"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { height: 64, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarIndicatorStyle: { backgroundColor: '#2563eb', height: 3 },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text> }} />
      <Tabs.Screen name="medications" options={{ title: 'Medications', tabBarIcon: () => <Text style={{ fontSize: 20 }}>💊</Text> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🔔</Text> }} />
      <Tabs.Screen name="summary" options={{ title: 'Summary', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📄</Text> }} />
    </Tabs>
  )
}
