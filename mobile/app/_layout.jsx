import { Component, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AuthProvider, useAuth } from '../src/context/AuthContext'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    this.setState({ error, info })
    // eslint-disable-next-line no-console
    console.error('RootErrorBoundary:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.errorContainer} contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorTitle}>NutriFlex crashed</Text>
          <Text style={styles.errorLabel}>Error:</Text>
          <Text style={styles.errorText}>{String(this.state.error?.message || this.state.error)}</Text>
          <Text style={styles.errorLabel}>Stack:</Text>
          <Text style={styles.errorText}>{String(this.state.error?.stack || '')}</Text>
          <Text style={styles.errorLabel}>Component stack:</Text>
          <Text style={styles.errorText}>{String(this.state.info?.componentStack || '')}</Text>
        </ScrollView>
      )
    }
    return this.props.children
  }
}

function RootLayoutNav() {
  const { user, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [user, loading, segments])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  )
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, backgroundColor: '#0f172a' },
  errorContent: { padding: 24, paddingTop: 72 },
  errorTitle: { color: '#f87171', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  errorLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  errorText: { color: '#f1f5f9', fontSize: 13, fontFamily: 'monospace' },
})
