import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function ElderlyLayout() {
  return (
    <Tabs
      tabBarPosition="top"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { height: 64, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 15, fontWeight: '600' },
        tabBarIndicatorStyle: { backgroundColor: '#2563eb', height: 3 },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text> }} />
      <Tabs.Screen name="medicines" options={{ title: 'Medicines', tabBarIcon: () => <Text style={{ fontSize: 20 }}>💊</Text> }} />
      <Tabs.Screen name="symptoms" options={{ title: 'Symptoms', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text> }} />
      <Tabs.Screen name="family" options={{ title: 'Family', tabBarIcon: () => <Text style={{ fontSize: 20 }}>👨‍👩‍👧</Text> }} />
    </Tabs>
  )
}
