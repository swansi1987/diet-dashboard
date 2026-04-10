import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'

function TabIcon({ label, emoji, focused }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Dashboard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="logger"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🍽️" label="Log" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="weight"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚖️" label="Weight" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="Settings" focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1e293b',
    borderTopColor: '#334155',
    height: 72,
    paddingBottom: 8,
  },
  tabIcon: { alignItems: 'center', paddingTop: 6 },
  emoji: { fontSize: 22 },
  label: { fontSize: 10, color: '#64748b', marginTop: 2 },
  labelActive: { color: '#6366f1' },
})
