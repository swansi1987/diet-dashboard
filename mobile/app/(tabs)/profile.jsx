import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import client from '../../src/api/client'
import { useAuth } from '../../src/context/AuthContext'

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user, logout } = useAuth()
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [form, setForm] = useState({
    name: '', dob: '', weight: '', height: '', waist: '',
  })

  useEffect(() => {
    client.get('/profile')
      .then(data => {
        setForm({
          name:   data.name   || '',
          dob:    data.dob    || '',
          weight: data.weight ? String(data.weight) : '',
          height: data.height ? String(data.height) : '',
          waist:  data.waist  ? String(data.waist)  : '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function save() {
    setSaving(true)
    try {
      await client.put('/profile', {
        name:   form.name   || null,
        dob:    form.dob    || null,
        weight: parseFloat(form.weight)  || null,
        height: parseFloat(form.height)  || null,
        waist:  parseFloat(form.waist)   || null,
      })
      Alert.alert('Saved', 'Profile updated.')
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
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Profile</Text>

        {/* Account info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>

        {/* Body stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={v => set('name', v)}
            placeholder="Your name"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={form.dob}
            onChangeText={v => set('dob', v)}
            placeholder="e.g. 1990-05-20"
            placeholderTextColor="#64748b"
            keyboardType="numbers-and-punctuation"
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={form.weight}
                onChangeText={v => set('weight', v)}
                keyboardType="decimal-pad"
                placeholder="kg"
                placeholderTextColor="#64748b"
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                value={form.height}
                onChangeText={v => set('height', v)}
                keyboardType="decimal-pad"
                placeholder="cm"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          <Text style={styles.label}>Waist (cm)</Text>
          <TextInput
            style={styles.input}
            value={form.waist}
            onChangeText={v => set('waist', v)}
            keyboardType="decimal-pad"
            placeholder="cm"
            placeholderTextColor="#64748b"
          />

          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Profile</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.dangerBtn} onPress={confirmLogout}>
          <Text style={styles.dangerBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll:    { padding: 20, paddingBottom: 48 },
  heading:   { fontSize: 28, fontWeight: '700', color: '#f1f5f9', marginBottom: 20 },

  section:      { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },

  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { color: '#94a3b8', fontSize: 14 },
  infoValue: { color: '#f1f5f9', fontSize: 14 },

  label: { fontSize: 13, color: '#94a3b8', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#0f172a', borderRadius: 10, padding: 13,
    color: '#f1f5f9', fontSize: 15, borderWidth: 1, borderColor: '#334155',
  },
  row:  { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },

  saveBtn:     { backgroundColor: '#6366f1', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  dangerBtn:     { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#7f1d1d' },
  dangerBtnText: { color: '#fca5a5', fontSize: 15, fontWeight: '600' },
})
