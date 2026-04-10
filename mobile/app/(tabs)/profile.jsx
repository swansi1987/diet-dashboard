import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import client from '../../src/api/client'

const GOALS = ['cut', 'maintain', 'bulk']
const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active']

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', age: '', height_cm: '', weight_kg: '',
    calorie_goal: '', protein_goal_g: '',
    goal: 'maintain', activity_level: 'moderate',
  })

  useEffect(() => {
    client.get('/profile')
      .then(data => {
        setProfile(data)
        setForm({
          name: data.name || '',
          age: String(data.age || ''),
          height_cm: String(data.height_cm || ''),
          weight_kg: String(data.weight_kg || ''),
          calorie_goal: String(data.calorie_goal || ''),
          protein_goal_g: String(data.protein_goal_g || ''),
          goal: data.goal || 'maintain',
          activity_level: data.activity_level || 'moderate',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      await client.put('/profile', {
        name: form.name,
        age: parseInt(form.age) || null,
        height_cm: parseFloat(form.height_cm) || null,
        weight_kg: parseFloat(form.weight_kg) || null,
        calorie_goal: parseInt(form.calorie_goal) || null,
        protein_goal_g: parseInt(form.protein_goal_g) || null,
        goal: form.goal,
        activity_level: form.activity_level,
      })
      Alert.alert('Saved', 'Profile updated.')
    } catch (err) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Profile</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={v => set('name', v)} placeholder="Your name" placeholderTextColor="#64748b" />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Age</Text>
            <TextInput style={styles.input} value={form.age} onChangeText={v => set('age', v)} keyboardType="numeric" placeholder="years" placeholderTextColor="#64748b" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput style={styles.input} value={form.height_cm} onChangeText={v => set('height_cm', v)} keyboardType="decimal-pad" placeholder="cm" placeholderTextColor="#64748b" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput style={styles.input} value={form.weight_kg} onChangeText={v => set('weight_kg', v)} keyboardType="decimal-pad" placeholder="kg" placeholderTextColor="#64748b" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Calorie Goal</Text>
            <TextInput style={styles.input} value={form.calorie_goal} onChangeText={v => set('calorie_goal', v)} keyboardType="numeric" placeholder="kcal" placeholderTextColor="#64748b" />
          </View>
        </View>

        <Text style={styles.label}>Protein Goal (g)</Text>
        <TextInput style={styles.input} value={form.protein_goal_g} onChangeText={v => set('protein_goal_g', v)} keyboardType="numeric" placeholder="grams" placeholderTextColor="#64748b" />

        <Text style={styles.label}>Goal</Text>
        <View style={styles.chips}>
          {GOALS.map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, form.goal === g && styles.chipActive]}
              onPress={() => set('goal', g)}
            >
              <Text style={[styles.chipText, form.goal === g && styles.chipTextActive]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Activity Level</Text>
        <View style={styles.chips}>
          {ACTIVITY_LEVELS.map(a => (
            <TouchableOpacity
              key={a}
              style={[styles.chip, form.activity_level === a && styles.chipActive]}
              onPress={() => set('activity_level', a)}
            >
              <Text style={[styles.chipText, form.activity_level === a && styles.chipTextActive]}>
                {a.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save Profile</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20 },
  heading: { fontSize: 28, fontWeight: '700', color: '#f1f5f9', marginBottom: 24 },
  label: { fontSize: 13, color: '#94a3b8', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 10, padding: 13,
    color: '#f1f5f9', fontSize: 15, borderWidth: 1, borderColor: '#334155',
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { color: '#94a3b8', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
