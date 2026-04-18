import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator, Switch
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import client from '../../src/api/client'
import { useAuth } from '../../src/context/AuthContext'

const AI_PROVIDERS = ['gemini', 'openai', 'claude']

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const { logout, user } = useAuth()
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState('gemini')

  useEffect(() => {
    client.get('/settings')
      .then(data => {
        setSettings(data || {})
        setProvider(data?.preferred_ai_provider || 'gemini')
        // Keys are masked — just show whether one is set, not the value
        setApiKey('')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      const payload = { preferred_ai_provider: provider }
      if (apiKey.trim()) payload[`${provider}_api_key`] = apiKey.trim()
      await client.put('/settings', payload)
      Alert.alert('Saved', 'Settings updated.')
    } catch (err) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ])
  }

  if (loading) return (
    <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center' }]}>
      <ActivityIndicator color="#6366f1" />
    </View>
  )

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Features</Text>
        <Text style={styles.hint}>Configure an AI provider to use Quick Add, Photo Meal, and AI Enrichment.</Text>

        <Text style={styles.label}>Provider</Text>
        <View style={styles.chips}>
          {AI_PROVIDERS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, provider === p && styles.chipActive]}
              onPress={() => setProvider(p)}
            >
              <Text style={[styles.chipText, provider === p && styles.chipTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>
          API Key{settings[`${provider}_api_key_set`] ? ' ✅ Key set' : ' (not set)'}
        </Text>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder={settings[`${provider}_api_key_set`] ? 'Enter new key to replace…' : 'Paste your API key'}
          placeholderTextColor="#64748b"
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Save Settings</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.dangerBtn} onPress={confirmLogout}>
          <Text style={styles.dangerBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20 },
  heading: { fontSize: 28, fontWeight: '700', color: '#f1f5f9', marginBottom: 24 },
  section: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6366f1', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint: { color: '#64748b', fontSize: 13, marginBottom: 12, lineHeight: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { color: '#94a3b8', fontSize: 14 },
  rowValue: { color: '#f1f5f9', fontSize: 14 },
  label: { fontSize: 13, color: '#94a3b8', marginBottom: 8, marginTop: 12 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { backgroundColor: '#0f172a', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { color: '#94a3b8', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    backgroundColor: '#0f172a', borderRadius: 10, padding: 13,
    color: '#f1f5f9', fontSize: 15, borderWidth: 1, borderColor: '#334155',
  },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  dangerBtn: { backgroundColor: '#7f1d1d', borderRadius: 10, padding: 14, alignItems: 'center' },
  dangerBtnText: { color: '#fca5a5', fontSize: 15, fontWeight: '600' },
})
