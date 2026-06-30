import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function ElderlyLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { height: 80, paddingBottom: 12 },
        tabBarLabelStyle: { fontSize: 16 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => <Text style={{ fontSize: 24 }}>🏠</Text> }} />
      <Tabs.Screen name="medicines" options={{ title: 'Medicines', tabBarIcon: () => <Text style={{ fontSize: 24 }}>💊</Text> }} />
      <Tabs.Screen name="symptoms" options={{ title: 'Symptoms', tabBarIcon: () => <Text style={{ fontSize: 24 }}>📋</Text> }} />
      <Tabs.Screen name="family" options={{ title: 'Family', tabBarIcon: () => <Text style={{ fontSize: 24 }}>👨‍👩‍👧</Text> }} />
    </Tabs>
  )
}
