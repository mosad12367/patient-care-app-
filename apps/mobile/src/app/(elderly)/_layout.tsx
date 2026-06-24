import { Tabs } from 'expo-router'
import { Text } from 'react-native'

function TabIcon({ icon, label }: { icon: string; label: string }) {
  return <Text style={{ fontSize: 20, textAlign: 'center' }}>{icon}{'\n'}{label}</Text>
}

export default function ElderlyLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { height: 80, paddingBottom: 12 },
        tabBarLabelStyle: { fontSize: 20 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => <TabIcon icon="🏠" label="Home" /> }} />
      <Tabs.Screen name="medicines" options={{ title: 'Medicines', tabBarIcon: () => <TabIcon icon="💊" label="Medicines" /> }} />
      <Tabs.Screen name="symptoms" options={{ title: 'Symptoms', tabBarIcon: () => <TabIcon icon="📋" label="Symptoms" /> }} />
      <Tabs.Screen name="family" options={{ title: 'Family', tabBarIcon: () => <TabIcon icon="👨‍👩‍👧" label="Family" /> }} />
    </Tabs>
  )
}
